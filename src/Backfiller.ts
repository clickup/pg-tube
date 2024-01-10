import CappedPool from "./helpers/CappedPool";
import delay from "./helpers/delay";
import type Upstream from "./Upstream";

export interface BackfillerOptions {
  /** Upstream to operate on. */
  upstream: Upstream;
  /** Maximum time for one backfill operation (typically takes several minutes). */
  timeoutMs: number;
}

export interface BackfillerScheduleCollectOptions {
  readonly tube: string;
  readonly tbl: string;
  readonly orderCol: string;
  readonly shard: number;
}

/**
 * Schedules slow-running backfill injection for a particular tube/shard with
 * limited parallelism (not more than one backfill injection per partition).
 */
export default class Backfiller {
  private _backfillPool: CappedPool;
  private _backfillingShards = new Set<number>();

  constructor(private _options: BackfillerOptions) {
    this._backfillPool = new CappedPool({ parallelism: 1 });
  }

  /**
   * Schedules backfill-pods injection to a shard.
   */
  scheduleBackfill(
    options: BackfillerScheduleCollectOptions,
    onDone: () => void
  ): void {
    if (this._backfillingShards.size > 0) {
      return;
    }

    this._backfillingShards.add(options.shard);
    this.backfillImpl(options, onDone)
      .finally(() => this._backfillingShards.delete(options.shard))
      .catch((e) => this._backfillPool.addError(e));
  }

  /**
   * Throws errors if they happen in background.
   */
  throwIfError(): void {
    this._backfillPool.throwIfError();
  }

  private async backfillImpl(
    options: BackfillerScheduleCollectOptions,
    onDone: () => void
  ): Promise<void> {
    await this._options.upstream.backfill(
      this._options.timeoutMs,
      options.tube,
      options.tbl,
      options.orderCol,
      options.shard
    );
    await delay(4000);
    onDone();
  }
}
