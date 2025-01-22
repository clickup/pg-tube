CREATE OR REPLACE FUNCTION _tube_query_size_estimate(
  sql text,
  idx regclass = null,
  out number integer,
  out human text,
  out precise boolean
) RETURNS record
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  rec record;
  rows bigint;
  idx_rows bigint;
  THRESHOLD integer := 1000;
BEGIN
  EXECUTE format('SELECT count(1) FROM (%s LIMIT %s) t', sql, THRESHOLD) INTO rows;
  IF rows < THRESHOLD THEN
    number := rows;
    human := rows;
    precise := TRUE;
    RETURN;
  END IF;

  precise := FALSE;

  FOR rec IN EXECUTE 'EXPLAIN ' || sql LOOP
    rows := substring(rec."QUERY PLAN" FROM ' rows=([[:digit:]]+)');
    IF rows IS NOT NULL THEN
      number := rows;
      EXIT;
    END IF;
  END LOOP;

  IF idx IS NOT NULL THEN
    rows := greatest(rows, (
      SELECT COALESCE(reltuples, 0)
      FROM pg_class
      WHERE pg_class.oid = idx
    ));
  END IF;

  IF rows <= THRESHOLD THEN
    human := THRESHOLD || '+';
  ELSE
    human := '~' || rows;
  END IF;
END;
$$;

COMMENT ON FUNCTION _tube_query_size_estimate(text, regclass)
  IS 'Returns an approximated number of rows which will be returned by the query.';
