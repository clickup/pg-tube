import CappedPool from "./helpers/CappedPool";
import delay from "./helpers/delay";
import deltaMs from "./helpers/deltaMs";
import Op from "./Op";
import type Touch from "./Touch";

const DEFAULT_DONE_INTERVAL_MS = 3 * 60 * 1000;
const DEFAULT_REFETCH_INTERVAL_MS = 30 * 1000;

export interface GarbageOptions {
  /** Returns document ids from the destination for which seq value is lower
   * than the provided one. This callback is being called for some time after we
   * receive a "backfill finished" signal. */
  readonly fetch: (
    shard: number,
    maxSeq: string,
    cursor: string | undefined
  ) => Promise<{ ids: string[]; cursor?: string }>;
  /** Sends a deletion touch event to a downstream. */
  readonly send: (touches: Touch[]) => Promise<void>;
  /** How many parallel fetch() calls are allowed. */
  readonly parallelism: number;
  /** When fetch() starts returning empty results, it's still called time to
   * time up to this number of milliseconds before assuming we're done. Allows
   * the downstream to have some lag and not be fully read-after-write complaint
   * (e.g. Elasticsearch doesn't return the documents immediately after they're
   * sent to indexing). */
  readonly doneIntervalMs?: number;
  /** How often to recheck for new garbage after fetch() returned empty. */
  readonly refetchIntervalMs?: number;
}

export interface GarbageScheduleCollectOptions {
  readonly shard: number;
  readonly maxSeq: string;
}

/**
 * Allows to read some document ids back from the downstream searching for the
 * ones which have seq value lower than the provided.
 */
export default class Garbage {
  private _fetchPool: CappedPool;
  private _collectingShards = new Set<number>();
  private _ended = false;

  constructor(private _options: GarbageOptions) {
    this._fetchPool = new CappedPool(this._options);
  }

  /**
   * Schedules garbage-collecting of a shard by fetching docs with seq value
   * less than the provided one and sending deletion events to the downstream.
   * The method is long-running and runs multiple loops of garbage fetching; it
   * respects time values which were used in the constructor. If it happens that
   * the method is called twice for the same shard, the second call will be
   * ignored, and onDone callback won't be called.
   */
  scheduleCollect(
    options: GarbageScheduleCollectOptions,
    onDone: () => void
  ): void {
    if (this._collectingShards.has(options.shard)) {
      return;
    }

    this._collectingShards.add(options.shard);
    this.collectImpl(options, onDone)
      .finally(() => this._collectingShards.delete(options.shard))
      .catch((e) => this._fetchPool.addError(e));
  }

  /**
   * Throws errors if they happen in background. Notice that we do not limit
   * parallelism for send() calls expecting that it's gonna be done by the
   * caller.
   */
  throwIfError(): void {
    try {
      this._fetchPool.throwIfError();
    } catch (e: unknown) {
      this._ended = true;
      throw e;
    }
  }

  /**
   * Stops the long running loops.
   */
  end(): void {
    this._ended = true;
  }

  private async collectImpl(
    { shard, maxSeq }: GarbageScheduleCollectOptions,
    onDone: () => void
  ): Promise<void> {
    let lastEmptyIdsTime: bigint | null = null;
    let lastCursor: any = undefined;

    while (true) {
      if (
        lastEmptyIdsTime &&
        deltaMs(lastEmptyIdsTime) >
          (this._options.doneIntervalMs ?? DEFAULT_DONE_INTERVAL_MS)
      ) {
        onDone();
        return;
      }

      const { ids, cursor } = await this._fetchPool.through(async () =>
        this._options.fetch(shard, maxSeq, lastCursor)
      );
      lastCursor = cursor;

      if (this._ended) {
        return;
      }

      const hrtime = process.hrtime.bigint();
      if (ids.length > 0) {
        lastEmptyIdsTime = null;
        await this._options.send(
          ids.map((id) => ({
            seq: maxSeq,
            op: Op.GARBAGE,
            shard,
            id,
            hrtime,
          }))
        );
      } else {
        lastCursor = undefined;
        lastEmptyIdsTime ||= hrtime;
        while (
          deltaMs(hrtime) <
          (this._options.refetchIntervalMs ?? DEFAULT_REFETCH_INTERVAL_MS)
        ) {
          if (this._ended) {
            return;
          }

          await delay(1000);
        }
      }
    }
  }
}
