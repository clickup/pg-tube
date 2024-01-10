import pLimit from "p-limit";

export interface CappedPoolOptions {
  readonly parallelism: number;
}

/**
 * A pool of Promises which allows to run not more than N Promises in parallel.
 */
export default class CappedPool {
  private _inflight = new Set<Promise<unknown>>();
  private _errors: unknown[] = [];
  private _curParallelism?: number;
  private _pLimit?: pLimit.Limit;

  constructor(private _options: CappedPoolOptions) {}

  /**
   * Calls a function and returns its result (or throws its exception).
   * Guarantees that there will be no more than `parallelism` funcs running at
   * the same time.
   */
  async through<T>(func: () => Promise<T>): Promise<T> {
    if (!this._pLimit || this._options.parallelism !== this._curParallelism) {
      this._curParallelism = this._options.parallelism;
      this._pLimit = pLimit(Math.max(this._curParallelism, 1));
    }

    const res = this._pLimit(func);
    const promise = res
      .catch((err) => this.addError(err))
      .finally(() => this._inflight.delete(promise));
    this._inflight.add(promise);
    return res;
  }

  /**
   * Waits until there are no more pending (scheduled) functions.
   */
  async backPressure(): Promise<void> {
    this.throwIfError();
    while (this._inflight.size > this._options.parallelism) {
      await Promise["race"](this._inflight);
      this.throwIfError();
    }
  }

  /**
   * Makes sure there are no more inflight requests happening in the background.
   */
  async drain(): Promise<void> {
    this.throwIfError();
    while (this._inflight.size > 0) {
      await Promise["all"](this._inflight);
      this.throwIfError();
    }
  }

  /**
   * Returns the number of functions which are currently inflight.
   */
  inflight(): number {
    return this._inflight.size;
  }

  /**
   * Adds an error to the pool, so the next call to any API async function will
   * throw it.
   */
  addError(e: unknown): void {
    this._errors.push(e);
  }

  /**
   * Throws an error if it happened in any of the scheduled functions.
   */
  throwIfError(): void {
    if (this._errors.length > 0) {
      throw this._errors[this._errors.length - 1];
    }
  }
}
