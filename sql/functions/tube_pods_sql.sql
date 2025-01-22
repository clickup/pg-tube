
CREATE OR REPLACE FUNCTION tube_pods_sql(
  tube text,
  partitions integer,
  partition integer,
  exclude_backfill boolean = FALSE
) RETURNS text
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  actual_partitions integer := _tube_partitions(tube::regclass);
BEGIN
  IF actual_partitions <> partitions THEN
    RAISE EXCEPTION
      'Cannot run tube_pods_sql(%) since the expected number of partitions (%) is different from the actual number of partitions (%)',
      tube, partitions, actual_partitions;
  END IF;
  RETURN _tube_template(
    CASE
      WHEN exclude_backfill
      THEN
        $sql$
          SELECT seq, op, shard, ids::text, payload
            FROM "{I:tube}"
            WHERE shard % {SQL:partitions} = {SQL:partition} AND op <> 'B'
            ORDER BY seq
        $sql$
      ELSE
        $sql$
          (SELECT seq, op, shard, ids::text, payload
            FROM "{I:tube}"
            WHERE shard % {SQL:partitions} = {SQL:partition} AND op <> 'B'
            ORDER BY seq)
          UNION ALL
          (SELECT seq, op, shard, ids::text, payload
            FROM "{I:tube}"
            WHERE shard % {SQL:partitions} = {SQL:partition} AND op = 'B'
            ORDER BY seq)
        $sql$
    END,
    'tube', tube,
    'partition', partition::text,
    'partitions', partitions::text
  );
END;
$$;

COMMENT ON FUNCTION tube_pods_sql(text, integer, integer, boolean)
  IS 'Returns a generated SQL query text which, when executed, reads from some partition of the tube. '
     'See https://stackoverflow.com/a/42294524 on why we cannot use FETCH ALL and cursor for this usecase '
     '(and we also do not want to use FETCH N multiple times since it does not differ much from sending '
     'multiple queries; we want a single cheap continuous stream of results). If exclude_backfill = true, '
     'then the SQL will fetch only non-backfill pods.';
