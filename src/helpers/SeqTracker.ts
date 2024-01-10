import { inspect } from "util";
import MapOfSets from "./MapOfSets";
import type { OwningFifoTouch } from "./OwningFifo";

/**
 * Tracks which ids are used in which pods seq. Once a release of some id causes
 * a pod to become empty, seq of this pod is added to the list available via
 * extractEmptySeqs() call.
 *
 * The reason of having this structure is that touches often de-duplicate with
 * each other, either within the same or across different transactions. This
 * especially happens when there is a change in multiple interconnected objects
 * in the database, each triggering a touch event for some common parent object.
 * We don't want to track individual touch events and group them; instead, we
 * track when they disappear during de-duplication and let SeqTracker remember
 * touch<->pod connection and a pod "busy" status.
 */
export default class SeqTracker {
  private _seq2id = new MapOfSets<string, string>();
  private _emptiedSeqs = new Set<string>();

  [inspect.custom](): string {
    return (
      ([...this._seq2id.entries()]
        .map(([seq, ids]) => "seq=" + seq + "{" + [...ids].join(",") + "}")
        .join(" | ") || "[]") +
      ", empty=" +
      ([...this._emptiedSeqs].join(",") || "[]")
    );
  }

  acquire({ seq, id }: OwningFifoTouch): void {
    if (this._seq2id.get(seq)?.has(id)) {
      throw Error(`BUG: (seq=${seq}, id=${id}) has already been acquired`);
    }

    this._seq2id.add(seq, id);
  }

  release({ seq, id }: OwningFifoTouch): void {
    const ids = this._seq2id.get(seq);
    if (!ids) {
      throw Error(`BUG: no seq=${seq}`);
    }

    if (!ids.delete(id)) {
      throw Error(`BUG: id=${id} is not in seq=${seq}`);
    }

    if (ids.size === 0) {
      this._seq2id.delete(seq);
      this._emptiedSeqs.add(seq);
    }
  }

  addEmptySeq(seq: string): void {
    this._emptiedSeqs.add(seq);
  }

  extractEmptySeqs(): string[] {
    const seqs = [...this._emptiedSeqs];
    this._emptiedSeqs = new Set();
    return seqs;
  }
}
