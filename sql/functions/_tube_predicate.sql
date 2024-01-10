CREATE OR REPLACE FUNCTION _tube_predicate(
  tube text
) RETURNS text
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  func_name text;
  func_src text;
  where_clause text;
BEGIN
  func_name := tube || '_trigger';
  func_src := (
    SELECT prosrc FROM pg_proc
    WHERE pronamespace = current_schema()::regnamespace AND proname = func_name
  );
  IF func_src IS NULL THEN
    RETURN NULL;
  END IF;

  where_clause := substring(func_src from E'(?i)\\s+FROM\\s+rows(.*?)\\),\\s*?\r?\n');
  IF where_clause IS NULL THEN
    RAISE EXCEPTION
      E'Cannot parse the source of function % to extract tube predicate. Source:\n%',
      func_name, func_src;
  END IF;

  RETURN COALESCE(substring(where_clause from E'(?i)\\s*WHERE\\s+(.*)$'), '');
END;
$$;

COMMENT ON FUNCTION _tube_predicate(text)
  IS 'Returns a predicate expression for a tube (including an empty string '
     'meaning "no predicate") or NULL if there is no such tube.';
