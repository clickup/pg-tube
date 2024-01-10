CREATE OR REPLACE FUNCTION tube_stats() RETURNS TABLE (
  tube text,
  predicate text,
  partition integer,
  shards integer,
  inc_count text,
  inc_min_seq bigint,
  inc_max_seq bigint,
  inc_min_ts timestamptz,
  inc_max_ts timestamptz,
  backfill_count text,
  backfill_min_seq bigint,
  backfill_max_seq bigint,
  backfill_min_ts timestamptz,
  backfill_max_ts timestamptz,
  control_count text
)
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  rec record;
  i integer;
BEGIN
  FOR rec IN
    SELECT DISTINCT r.tube, r.partitions, r.predicate, array_agg(r.shard) AS shards
    FROM tube_list() r
    GROUP BY 1, 2, 3 ORDER BY 1, 2, 3
  LOOP
    FOR i IN 0 .. (rec.partitions - 1) LOOP
      tube := rec.tube;
      predicate := rec.predicate;
      partition := i;
      shards := (
        SELECT count(1) FROM unnest(rec.shards) s
        WHERE s % rec.partitions = partition
      );

      SELECT c.inc_count, c.backfill_count, c.control_count
        FROM _tube_count(tube::regclass, partition) c
        INTO inc_count, backfill_count, control_count;

      EXECUTE
        _tube_template(
          $sql$ SELECT min(seq), max(seq) FROM {I:tube} WHERE shard % {partitions} = {partition} AND op <> 'B' AND ids <> '{}' $sql$,
          'tube', tube,
          'partitions', rec.partitions::text,
          'partition', partition::text
        )
        INTO inc_min_seq, inc_max_seq;
      EXECUTE
        _tube_template(
          $sql$ SELECT ts FROM {I:tube} WHERE shard % {partitions} = {partition} AND op <> 'B' AND seq = {seq} $sql$,
          'tube', tube,
          'partitions', rec.partitions::text,
          'partition', partition::text,
          'seq', COALESCE(inc_min_seq, 0)::text
        )
        INTO inc_min_ts;
      EXECUTE
        _tube_template(
          $sql$ SELECT ts FROM {I:tube} WHERE shard % {partitions} = {partition} AND op <> 'B' AND seq = {seq} $sql$,
          'tube', tube,
          'partitions', rec.partitions::text,
          'partition', partition::text,
          'seq', COALESCE(inc_max_seq, 0)::text
        )
        INTO inc_max_ts;

      EXECUTE
        _tube_template(
          $sql$ SELECT min(seq), max(seq) FROM {I:tube} WHERE shard % {partitions} = {partition} AND op = 'B' AND ids <> '{}' $sql$,
          'tube', tube,
          'partitions', rec.partitions::text,
          'partition', partition::text
        )
        INTO backfill_min_seq, backfill_max_seq;
      EXECUTE
        _tube_template(
          $sql$ SELECT ts FROM {I:tube} WHERE shard % {partitions} = {partition} AND op = 'B' AND seq = {seq} $sql$,
          'tube', tube,
          'partitions', rec.partitions::text,
          'partition', partition::text,
          'seq', COALESCE(backfill_min_seq, 0)::text
        )
        INTO backfill_min_ts;
      EXECUTE
        _tube_template(
          $sql$ SELECT ts FROM {I:tube} WHERE shard % {partitions} = {partition} AND op = 'B' AND seq = {seq} $sql$,
          'tube', tube,
          'partitions', rec.partitions::text,
          'partition', partition::text,
          'seq', COALESCE(backfill_max_seq, 0)::text
        )
        INTO backfill_max_ts;
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION tube_stats()
  IS 'Returns some statistics about tubes contents.';
