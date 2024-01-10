/**
 * Creates:
 * 1. {tbl} insert/update/delete triggers;
 * 2. {tbl}_touch(ids, op) function for this table.
 */
CREATE OR REPLACE FUNCTION tube_table_ensure_attached(
  tube text,
  tbl regclass,
  shard integer = NULL
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  tubes text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = tube AND relnamespace = current_schema()::regnamespace) THEN
    RAISE EXCEPTION 'Tube does not exist: %', tube;
  END IF;
  IF shard IS NULL THEN
    shard := _tube_table_infer_default_shard(tbl);
  END IF;
  PERFORM tube_table_ensure_detached(tube, tbl);
  EXECUTE _tube_template(
    $sql$
      CREATE TRIGGER "{I:table}_{I:tube}_after_insert_trigger"
        AFTER INSERT ON "{I:schema}"."{I:table}"
        REFERENCING NEW TABLE AS rows
        FOR EACH STATEMENT EXECUTE PROCEDURE "{I:tube}_trigger"({shard});
      CREATE TRIGGER "{I:table}_{I:tube}_after_update_trigger"
        AFTER UPDATE ON "{I:schema}"."{I:table}"
        REFERENCING NEW TABLE AS rows
        FOR EACH STATEMENT EXECUTE PROCEDURE "{I:tube}_trigger"({shard});
      CREATE TRIGGER "{I:table}_{I:tube}_after_delete_trigger"
        AFTER DELETE ON "{I:schema}"."{I:table}"
        REFERENCING OLD TABLE AS rows
        FOR EACH STATEMENT EXECUTE PROCEDURE "{I:tube}_trigger"({shard});
    $sql$,
    'schema', _tube_parse_ident(tbl, 1),
    'table', _tube_parse_ident(tbl, 2),
    'tube', tube,
    'shard', shard::text
  );
  PERFORM _tube_ensure_table_touch_func(tbl);
END;
$$;

COMMENT ON FUNCTION tube_table_ensure_attached(text, regclass, integer)
  IS 'Makes sure the table is piping touch events to a tube with the provided name. '
     'If shard number is not passed manually, then it is inferred from the table full name.';
