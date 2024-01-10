CREATE OR REPLACE FUNCTION _tube_table_size_estimate(
  tbl regclass
) RETURNS bigint
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  rec record;
  rows bigint;
BEGIN
  RETURN (SELECT number FROM _tube_query_size_estimate('SELECT 1 FROM ' || tbl::text));
END;
$$;

COMMENT ON FUNCTION _tube_table_size_estimate(regclass)
  IS 'Returns an approximated number of rows in a table.';
