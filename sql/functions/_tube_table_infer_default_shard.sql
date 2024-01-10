CREATE OR REPLACE FUNCTION _tube_table_infer_default_shard(
  tbl regclass
) RETURNS text
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  tbl_schema text := _tube_parse_ident(tbl, 1);
  tbl_name text := _tube_parse_ident(tbl, 2);
  shard integer;
BEGIN
  shard := substring(tbl_schema from '^[^0-9]+([0-9]+)$')::integer;
  IF shard IS NULL THEN
    RAISE EXCEPTION
      'Cannot infer shard number from table %.% schema name. You can pass shard number manually.',
      quote_ident(tbl_schema),
      quote_ident(tbl_name);
  END IF;
  RETURN shard;
END;
$$;

COMMENT ON FUNCTION _tube_table_infer_default_shard(regclass)
  IS 'Tries to infer the default shard number from the table''s full name.';
