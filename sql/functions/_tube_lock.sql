CREATE OR REPLACE FUNCTION _tube_lock(
  in_tube regclass
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  tables text;
BEGIN
  tables := (SELECT string_agg(tbl::text, ', ') FROM tube_list() WHERE tube = in_tube::text AND tbl IS NOT NULL);
  IF tables IS NOT NULL THEN
    tables := in_tube::text || ', ' || tables;
  ELSE
    tables := in_tube::text;
  END IF;
  EXECUTE format('LOCK TABLE %s IN EXCLUSIVE MODE', tables);
END;
$$;

COMMENT ON FUNCTION _tube_lock(regclass)
  IS 'Locks all the tables attached to a tube and the tube itself from writes. '
     'This sometimes speeds up changing the number of partitions.';
