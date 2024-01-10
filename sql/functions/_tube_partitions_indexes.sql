CREATE OR REPLACE FUNCTION _tube_partitions_indexes(
  tube regclass
) RETURNS text[]
LANGUAGE sql
STABLE
SET search_path FROM CURRENT
AS $$
  SELECT COALESCE(array_agg(pg_class.relname::text ORDER BY pg_class.relname::text), '{}')
  FROM pg_index
  JOIN pg_class ON pg_class.oid = pg_index.indexrelid
  WHERE
    pg_index.indrelid = $1
    AND indpred IS NOT NULL
    AND pg_class.relname::text LIKE '%\_seq\_%\_of\_%'
$$;

COMMENT ON FUNCTION _tube_partitions_indexes(regclass)
  IS 'Returns tube partition index names for a given tube table.';
