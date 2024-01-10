/**
 * The functions must be called one after another in 3 different transactions:
 *
 * 1. tube_backfill_step1() -> step1_res
 * 2. tube_backfill_step2()
 * 3. tube_backfill_step3(step1_res, ...)
 *
 * This is because sequences are not transactional, but the rows we insert into
 * the tube are. I.e. it may happen that the worker will read seq=5 on the 1st
 * SELECT call, and on the next SELECT call, it will read seq=4 row (since its
 * transaction started earlier, but finished later).
 *
 * I.e. on the picture below, if the worker runs two SELECTs one after another,
 * it may receive a row with seq=51 first, and only then, on the next call, a
 * row with seq=50. (This BTW means that it's not possible to rely on seq value
 * and implement any approach to MVCC in e.g. ES; we must solely rely on strict
 * write order only.)
 * ```
 * +-------------------------+
 * | (chill)   UPDATE  seq++ |
 * +------------|------------+
 *              51
 *        50
 *    +---|-------------------------+
 *    | UPDATE  seq++               |
 *    +-----------------------------+
 * ```
 *
 * Why 3 steps and not 2? It's complicated. The picture below shows, what would
 * happen if we had no step2 in between step1 and step3. First, step1 would row
 * seq=51, but it wouldn't wait for INSERT transaction to finish, because it
 * doesn't see it (INSERT started later, after step1 snapshot was taken). The
 * same way, step3 wouldn't be able to wait for INSERT termination either,
 * because it also doesn't see it (INSERT hasn't been committed by the moment
 * step3 took the snapshot). As a result, the order of events appeared in the
 * tube is: 51, 50, 52, 53, 54, and the signal to GC is "remove everyting less
 * than 51" - which is wrong: the step3 snapshot wouldn't emit the row inserted
 * by INSERT since it hasn't seen it. Thus, we would lose that INSERT.
 * ```
 * +--------------------+                 +------------------------------+
 * | step1  seq++  wait |                 | step3   wait    seq=52,53,54 |
 * +----------|---------+                 +------------------------------+
 *            51
 *         50
 *    +----|------------------------------------+
 *    | INSERT  seq++                           |
 *    +-----------------------------------------+
 * ```
 *
 * Luckily, with 3-step approach (see below), it is all solved. Now there is a
 * guarantee that step3 will always see rows inserted before it started. That
 * means that step3 will just replay the row added by INSERT earlier since it
 * sees it in its snapshot. The order of events is the same: 51, 50, 52, 53, 54,
 * BUT now step3 emits the same row as INSERT touched (because it sees it), and
 * thus, it's safe to tell the GC "delete everything with seq < 51".
 * ```
 * +---------------+     +-------------+     +----------------------+
 * | step1  seq++  |     | step2  wait |     | step3   seq=52,53,54 |
 * +----------|----+     +-------------+     +----------------------+
 *            51
 *         50
 *    +----|------------------------+
 *    | INSERT  seq++               |
 *    +-----------------------------+
 * ```
 */
CREATE OR REPLACE FUNCTION tube_backfill_step3(
  step1 text,
  tube text,
  tbl regclass,
  order_col text,
  shard integer = NULL,
  fetch_chunk_size integer = 20000,
  insert_chunk_size integer = 250
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  start_seq bigint;
  approx_size bigint;
  predicate text;
BEGIN
  IF tube NOT IN (SELECT t.tube FROM tube_list() t) THEN
    RAISE EXCEPTION 'No such tube: %', tube;
  END IF;

  start_seq := step1::bigint;

  IF shard IS NULL THEN
    shard := _tube_table_infer_default_shard(tbl);
  END IF;

  IF NOT pg_try_advisory_xact_lock(tbl::oid::integer, shard) THEN
    RAISE EXCEPTION 'This shard/table is already backfilling in another transaction.';
  END IF;

  IF _tube_has_backfill_end_pod(tube, shard) THEN
    RAISE NOTICE 'tube_backfill: approx_size=% (skipped; this shard already has backfill_end control pod in the tube, so not double-scheduling)', approx_size;
    RETURN;
  END IF;

  approx_size := _tube_table_size_estimate(tbl);
  IF approx_size > 10000 THEN
    RAISE NOTICE 'tube_backfill: approx_size=% (be patient, fetching)', approx_size;
  END IF;

  predicate := _tube_predicate(tube);

  EXECUTE
    _tube_template('SELECT "{I:tube}_touch"($1, $2, $3, $4::jsonb, 1)', 'tube', tube)
    USING shard, '{}'::bigint[], 'T', '{"type":"backfill_start", "start_seq":"' || start_seq || '"}';

  PERFORM tube_pods_insert(
    tube,
    _tube_template(
      $sql$
        SELECT id, row_number() OVER (ORDER BY "{I:order_col}")
        FROM "{I:schema}"."{I:table}"{SQL:where_predicate}
        ORDER BY "{I:order_col}"
      $sql$,
      'order_col', order_col,
      'schema', _tube_parse_ident(tbl, 1),
      'table', _tube_parse_ident(tbl, 2),
      'where_predicate', CASE WHEN COALESCE(predicate, '') <> '' THEN ' WHERE ' || predicate ELSE '' END
    ),
    shard,
    'B'::char,
    approx_size,
    fetch_chunk_size,
    insert_chunk_size
  );

  EXECUTE
    _tube_template('SELECT "{I:tube}_touch"($1, $2, $3, $4::jsonb, $5)', 'tube', tube)
    USING shard, '{}'::bigint[], 'B', '{"type":"backfill_end", "start_seq":"' || start_seq || '"}', 1;
END;
$$;

COMMENT ON FUNCTION tube_backfill_step3(text, text, regclass, text, integer, integer, integer)
  IS 'Selects all the records from a table and turns them into tube "backfill" pods. '
     'The 1st parameter must be the return value of step1 function.';
