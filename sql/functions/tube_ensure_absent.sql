CREATE OR REPLACE FUNCTION tube_ensure_absent(
  in_tube text
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  rec record;
BEGIN
  PERFORM tube_table_ensure_detached(in_tube, t.tbl)
    FROM tube_list() t
    WHERE t.tube = in_tube AND t.tbl IS NOT NULL;
  EXECUTE _tube_template(
    $sql$ DROP TABLE IF EXISTS "{I:tube}"; $sql$,
    'tube', in_tube
  );
  PERFORM _tube_ensure_touch_funcs(in_tube, NULL); -- after the table is dropped
END;
$$;

COMMENT ON FUNCTION tube_ensure_absent(text)
  IS 'Makes sure a tube with the provided name is destroyed, and the tables from it are detached.';
