CREATE OR REPLACE FUNCTION _tube_parse_ident(
  tbl regclass,
  part integer
) RETURNS text
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  parts text[];
BEGIN
  parts := parse_ident(tbl::text);
  IF cardinality(parts) = 1 THEN
    -- Casting regclass to text doesn't yield the schema name if the schema is
    -- current, so we prepend it manually.
    parts := ARRAY[current_schema(), parts[1]];
  END IF;
  RETURN parts[part];
END;
$$;

COMMENT ON FUNCTION _tube_parse_ident(regclass, integer)
  IS 'Same as parse_ident(), but always returns the schema part.';
