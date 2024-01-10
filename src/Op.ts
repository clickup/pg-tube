/**
 * An operation happened in the database.
 */
enum Op {
  INSERT = "I",
  UPDATE = "U",
  DELETE = "D",
  TOUCH = "T",
  BACKFILL = "B",
  GARBAGE = "G",
}

export default Op;

/**
 * Used when sending downstream count() events.
 */
export type OpCounted = Op | "success" | "error";
