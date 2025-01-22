import { inspect } from "util";
import type Backfiller from "./Backfiller";
import type Downstream from "./Downstream";
import type Garbage from "./Garbage";
import delay from "./helpers/delay";
import deltaMs from "./helpers/deltaMs";
import OwningFifo from "./helpers/OwningFifo";
import SeqTracker from "./helpers/SeqTracker";
import type Pod from "./Pod";
import type Touch from "./Touch";
import type Upstream from "./Upstream";

export interface WorkerOptions {
  /** Source for the worker. */
  readonly upstream: Upstream;
  /** Tube which this worker is processing. */
  readonly tube: string;
  /** Number of partitions in this tube. */
  readonly partitions: number;
  /** The partition this worker is responsible for. */
  readonly partition: number;
}

export interface WorkerRunOptions {
  /** Consumer of the eventual consistent stream of touches loaded from the
   * tube's partition at the upstream. */
  readonly downstream: Downstream;
  /** Garbage collection engine. */
  readonly garbage: Garbage;
  /** Backfill pods injection engine. */
  readonly backfiller: Backfiller;
}

/**
 * Worker is a loop which processes a particular partition of a tube. There is
 * one worker per partition per tube running.
 */
export default class Worker {
  // 1. The tube is read, and the pods are copied to _incomingTouches (strictly
  //    ordered by arrival time).
  // 3. Some touches are extracted from _incomingTouches and moved to either one
  //    of the two places:
  //    - from _incomingTouches to _inflightTouches: when it's scheduled to
  //      being sent to downstream;
  //    - from _incomingTouches to to _blockedTouches: when the touch is already
  //      inflight.
  // 4. Awaiting for the downstream back-pressure (capping inflight requests).
  // 5. When downstream send() succeeds,
  //    - some touches from _blockedTouches are moved to _incomingTouches for
  //      later re-sending (eventual consistency logic); this applies only to
  //      the touches which were successfully sent;
  //    - the touches are removed from _seqTracker, so new empty pods may
  //      potentially appear.
  // 6. If there are empty pods, they are sent for deletion to the upstream.
  //
  // It is very important that there are no O(n^2) when working with the fifo
  // queues; i.e. the next iteration never processes the touches which have
  // already been processed during the previous iteration, and the touches are
  // only moved between the queues (never copied).
  //
  private _seqTracker = new SeqTracker();
  private _incomingTouches = new OwningFifo<Touch>(this._seqTracker);
  private _blockedTouches = new OwningFifo<Touch>(this._seqTracker);
  private _inflightTouches = new OwningFifo<Touch>(this._seqTracker);

  readonly upstream: Upstream;
  readonly tube: string;
  readonly partitions: number;
  readonly partition: number;

  constructor(options: WorkerOptions) {
    this.upstream = options.upstream;
    this.tube = options.tube;
    this.partitions = options.partitions;
    this.partition = options.partition;
  }

  /**
   * Runs a processing loop for this partition of a tube. Guarantees that there
   * will be no concurrent downstream requests for the same id; all the requests
   * for the same id will serialize.
   */
  async *run(options: WorkerRunOptions): AsyncGenerator<Pod | "drain", void> {
    try {
      while (true) {
        const streamStart = process.hrtime.bigint();
        const stream = this.upstream.podsStream(
          this.tube,
          this.partitions,
          this.partition,
        );

        for await (const pod of stream) {
          await this.queuePod(options, pod);
          await this.flushBatches(options);
          yield pod;
        }

        await this.flushBatches(options, "drain");
        yield "drain";

        if (
          this._incomingTouches.size +
            this._blockedTouches.size +
            this._inflightTouches.size >
          0
        ) {
          throw Error(
            "BUG: non-empty fifos after drain\n" +
              inspect(options.downstream) +
              "\n" +
              inspect(this),
          );
        }

        const waitMs = this.upstream.reopenMinMs - deltaMs(streamStart);
        if (waitMs > 0) {
          await delay(waitMs);
          // Maybe Garbage class finished collecting and scheduled a "backfill
          // ended" control pod deletion while we waited.
          await this.flushDeletes();
        }
      }
    } finally {
      options.garbage.end();
    }
  }

  /**
   * Adds one pod to _incomingTouches. If it's a control pod, processes it.
   */
  private async queuePod(options: WorkerRunOptions, pod: Pod): Promise<void> {
    if (pod.ids.length === 0) {
      if (pod.payload && pod.payload.type === "backfill_end") {
        await this.flushBatches(options, "drain");
        options.garbage.scheduleCollect(
          {
            shard: pod.shard,
            maxSeq: pod.payload.start_seq,
          },
          () => this._seqTracker.addEmptySeq(pod.seq),
        );
      } else if (pod.payload && pod.payload.type === "backfill_schedule") {
        await this.flushBatches(options, "drain");
        options.backfiller.scheduleBackfill(
          {
            tube: this.tube,
            tbl: pod.payload.tbl,
            orderCol: pod.payload.order_col,
            shard: pod.shard,
          },
          () => this._seqTracker.addEmptySeq(pod.seq),
        );
      } else {
        // Unknown payload: since we have 0 ids, we just remove this pod.
        this._seqTracker.addEmptySeq(pod.seq);
      }

      return;
    }

    for (const id of pod.ids) {
      this._incomingTouches.createInitial({
        seq: pod.seq,
        op: pod.op,
        shard: pod.shard,
        id,
      });
    }
  }

  /**
   * Extracts and flushes as many batches to the downstream as it can forming
   * batches of a particular size. In "drain" mode, flushes everything,
   * including incomplete batches.
   */
  private async flushBatches(
    options: WorkerRunOptions,
    drain?: "drain",
  ): Promise<void> {
    while (await this.flushBatch(options, drain)) {
      // pass
    }
  }

  /**
   * Attempts to flush some touches in _incomingTouches to the downstream. If
   * the downstream is already busy, waits until there are not too many requests
   * inflight happening there. Returns true if some touched were flushed, so it
   * makes sense to call the method again (until nothing is flushed).
   */
  private async flushBatch(
    options: WorkerRunOptions,
    drain?: "drain",
  ): Promise<boolean> {
    const minBatchSize = drain ? 1 : options.downstream.batchSize;

    const touches: Touch[] = [];
    if (this._incomingTouches.size >= minBatchSize) {
      for (const touch of this._incomingTouches) {
        if (this._inflightTouches.get(touch)) {
          this._blockedTouches.moveFrom(this._incomingTouches, touch);
        } else {
          touches.push(touch);
          this._inflightTouches.moveFrom(this._incomingTouches, touch);
          if (touches.length >= options.downstream.batchSize) {
            break;
          }
        }
      }
    }

    let rerun = false;
    if (touches.length > 0) {
      options.downstream
        .send(touches)
        .then(() => {
          for (const touch of touches) {
            this._inflightTouches.markConsumed(touch);
            const blockedTouch = this._blockedTouches.get(touch);
            if (blockedTouch) {
              this._incomingTouches.moveFrom(
                this._blockedTouches,
                blockedTouch,
              );
            }
          }
        })
        .catch(() => {});
      await options.downstream.backPressure();
      rerun = true;
    } else if (drain) {
      await options.downstream.drain();
      rerun = this._incomingTouches.size > 0;
    }

    await this.flushDeletes();
    options.garbage.throwIfError();
    options.backfiller.throwIfError();
    return rerun;
  }

  /**
   * Sends delete pods request and awaits on its success.
   */
  private async flushDeletes(): Promise<void> {
    const deleted = this._seqTracker.extractEmptySeqs();
    if (deleted.length > 0) {
      await this.upstream.podsDelete(
        this.tube,
        this.partitions,
        this.partition,
        deleted,
      );
    }
  }
}
