import countBy from "lodash/countBy";
import CappedPool from "./helpers/CappedPool";
import type Op from "./Op";
import type Touch from "./Touch";

export interface DownstreamOptions {
  /** Maximum size of a batch to send to the downstream. */
  readonly batchSize: number;
  /** How many batches are allowed in parallel. */
  readonly parallelism: number;
  /** Called each time a batch of touches needs to be sent to the downstream. */
  readonly process: (touches: Touch[]) => Promise<void>;
  /** Called after process() is called for a batch. */
  readonly count?: (
    ops: Partial<Record<Op | "success" | "error", number>>
  ) => void;
}

/**
 * Takes care of not running too many process() functions at the same time.
 */
export default class Downstream {
  private _processPool: CappedPool;

  constructor(private _options: DownstreamOptions) {
    this._processPool = new CappedPool(this._options);
  }

  get batchSize(): number {
    return this._options.batchSize;
  }

  async send(touches: Touch[]): Promise<void> {
    await this._processPool.through(async () => this.process(touches));
  }

  async backPressure(): Promise<void> {
    await this._processPool.backPressure();
  }

  async drain(): Promise<void> {
    await this._processPool.drain();
  }

  inflight(): number {
    return this._processPool.inflight();
  }

  private async process(touches: Touch[]): Promise<void> {
    try {
      await this._options.process(touches);
      this._options.count?.({
        ...countBy(touches, ({ op }) => op),
        success: touches.length,
      });
    } catch (e: unknown) {
      this._options.count?.({ error: touches.length });
      throw e;
    }
  }
}
