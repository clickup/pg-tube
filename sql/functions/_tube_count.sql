CREATE OR REPLACE FUNCTION _tube_count(
  tube regclass,
  partition integer,
  out backfill_count text,
  out inc_count text,
  out control_count text
) RETURNS record
LANGUAGE plpgsql
STABLE
SET search_path FROM CURRENT
AS $$
DECLARE
  n integer;
  partitions integer := _tube_partitions(tube);
BEGIN
  backfill_count := (
    SELECT human
    FROM _tube_query_size_estimate(
      _tube_template(
        $sql$ SELECT 1 FROM {I:tube} WHERE shard % {partitions} = {partition} AND op = 'B' AND ids <> '{}' $sql$,
        'tube', tube::text,
        'partitions', partitions::text,
        'partition', partition::text
      ),
      (SELECT i::regclass
       FROM unnest(_tube_partitions_indexes(tube)) i
       WHERE i LIKE E'%\_b'
       OFFSET partition LIMIT 1)
    )
  );
  inc_count := (
    SELECT human
    FROM _tube_query_size_estimate(
      _tube_template(
        $sql$ SELECT 1 FROM {I:tube} WHERE shard % {partitions} = {partition} AND op <> 'B' AND ids <> '{}' $sql$,
        'tube', tube::text,
        'partitions', partitions::text,
        'partition', partition::text
      ),
      (SELECT i::regclass
       FROM unnest(_tube_partitions_indexes(tube)) i
       WHERE i LIKE E'%\_i'
       OFFSET partition LIMIT 1)
    )
  );
  EXECUTE
    _tube_template(
      $sql$
        SELECT coalesce(string_agg(type || ':' || cnt, ' '), '0') FROM (
          SELECT payload->>'type' AS type, count(1) AS cnt
          FROM {I:tube}
          WHERE ids = '{}' AND shard % {partitions} = {partition}
          GROUP BY 1
        ) t
      $sql$,
      'tube', tube::text,
      'partitions', partitions::text,
      'partition', partition::text
    )
    INTO control_count;
END;
$$;

COMMENT ON FUNCTION _tube_count(regclass, integer)
  IS 'Returns the approximate number of rows in a tube partition. Unfortunately, we cannot use '
     'EXPLAIN SELECT ... for the approximation (even though the query matches indexes exactly) '
     'since it is too off; we instead use pg_class.reltuples which is updated by VACUUM.';
