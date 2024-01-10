CREATE OR REPLACE FUNCTION tube_table_ensure_detached(
  in_tube text,
  in_tbl regclass
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT * FROM tube_list(in_tbl) t WHERE in_tube IS NULL OR t.tube = in_tube LOOP
    EXECUTE _tube_template(
      $sql$
        DROP TRIGGER IF EXISTS "{I:table}_{I:tube}_after_insert_trigger" ON "{I:schema}"."{I:table}";
        DROP TRIGGER IF EXISTS "{I:table}_{I:tube}_after_update_trigger" ON "{I:schema}"."{I:table}";
        DROP TRIGGER IF EXISTS "{I:table}_{I:tube}_after_delete_trigger" ON "{I:schema}"."{I:table}";
      $sql$,
      'schema', _tube_parse_ident(in_tbl, 1),
      'table', _tube_parse_ident(in_tbl, 2),
      'tube', rec.tube
    );
    PERFORM _tube_ensure_table_touch_func(in_tbl);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION tube_table_ensure_detached(text, regclass)
  IS 'Makes sure the table is stopped piping touch events to a tube with the provided name.';
