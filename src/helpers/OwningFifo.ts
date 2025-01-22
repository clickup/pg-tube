import { inspect } from "util";
import type SeqTracker from "./SeqTracker";

export interface OwningFifoTouch {
  readonly seq: string;
  readonly id: string;
}

/**
 * Similar to a set, but de-duplicates touches by their id (i.e. when trying to
 * override an existing touch with a new touch, the new touch is just ignored).
 * This structure owns its members, so an existing member can only be moved from
 * one fifo to another (or marked as consumed).
 */
export default class OwningFifo<TTouch extends OwningFifoTouch> {
  protected _map = new Map<string, TTouch>();

  constructor(protected _tracker: SeqTracker) {}

  get size(): number {
    return this._map.size;
  }

  createInitial(touch: TTouch): void {
    this._tracker.acquire(touch);
    if (!this._map.has(touch.id)) {
      this._map.set(touch.id, touch);
    } else {
      this._tracker.release(touch);
    }
  }

  get({ id }: { id: string }): TTouch | undefined {
    return this._map.get(id);
  }

  [Symbol.iterator](): IterableIterator<TTouch> {
    return this._map.values();
  }

  [inspect.custom](): string {
    return (
      [...this._map.entries()]
        .map(([id, { seq }]) => `${seq}{${id}}`)
        .join(", ") || "[]"
    );
  }

  moveFrom(src: OwningFifo<TTouch>, { id, seq }: TTouch): void {
    const srcTouch = src._map.get(id);
    if (!srcTouch) {
      throw Error(`BUG: touch id=${id} doesn't exist`);
    } else if (srcTouch.seq !== seq) {
      throw Error(
        `BUG: touch (seq=${seq}, id=${id}) can't be moved since its seq is different in the source fifo (seq=${srcTouch.seq}, id=${id})`,
      );
    }

    const existingDstTouch = this._map.get(srcTouch.id);
    if (existingDstTouch) {
      src.markConsumed(srcTouch);
    } else {
      src._map.delete(srcTouch.id);
      this._map.set(srcTouch.id, srcTouch);
    }
  }

  markConsumed({ id, seq }: TTouch): void {
    const touch = this._map.get(id);
    if (!touch) {
      throw Error(`BUG: touch (id=${id}, seq=${seq}) doesn't exist`);
    } else if (touch.seq !== seq) {
      throw Error(
        `BUG: touch (seq=${seq}, id=${id}) can't be consumed since its seq is different than the one in the fifo (seq=${touch.seq}, id=${id})`,
      );
    }

    this._tracker.release(touch);
    this._map.delete(touch.id);
  }
}
