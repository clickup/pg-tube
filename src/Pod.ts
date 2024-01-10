import type Op from "./Op";

/**
 * A minimal piece of stuff which travels through a tube.
 */
export default interface Pod {
  seq: string;
  op: Op;
  shard: number;
  ids: string[];
  payload:
    | null
    | { type: "backfill_start"; start_seq: string }
    | { type: "backfill_end"; start_seq: string }
    | { type: "backfill_schedule"; tbl: string; order_col: string };
}
