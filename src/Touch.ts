import type Op from "./Op";

/**
 * An event of changing some single row in the database.
 */
export default interface Touch {
  seq: string;
  op: Op;
  shard: number;
  id: string;
}
