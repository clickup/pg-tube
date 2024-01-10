CREATE OR REPLACE FUNCTION _tube_partitions(
  tube regclass
) RETURNS integer
LANGUAGE sql
STABLE
SET search_path FROM CURRENT
AS $$
  SELECT cardinality(_tube_partitions_indexes($1)) / 2;
$$;

COMMENT ON FUNCTION _tube_partitions(regclass)
  IS 'Returns the number of tube partitions. The source of truth for this is the actual set of tube partition indexes.';
