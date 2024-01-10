/**
 * Updates:
 * - {tbl}_touch(ids, op, payload, chunk_size)
 *
 * This function's body calls all {tube}_touch() functions for all tubes
 * attached.
 *
 * If there are no tubes attaches to the table, removes:
 * 1. {tbl}_touch(ids, op) function.
 *
 * Considering the table is named "mytable", and it's attached to "mytube" and
 * "myothertube" tubes, the generated result will be:
 *
 * CREATE OR REPLACE FUNCTION public.mytable_touch(ids, op, payload, chunk_size)
   RETURNS void
 * AS $$
 *   SELECT "tube"."mytube_touch"('42', $1, $2, $3);
 *   SELECT "tube"."myothertube_touch"('42', $1, $2, $3);
 * $$
 */
CREATE OR REPLACE FUNCTION _tube_ensure_table_touch_func(
  in_tbl regclass
) RETURNS SETOF text
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF in_tbl IN (SELECT t.tbl FROM tube_list(in_tbl) t) THEN
    EXECUTE _tube_template(
      $sql$
        CREATE OR REPLACE FUNCTION "{I:schema}"."{I:table}_touch"(
          ids bigint[],
          op char = 'T',
          payload jsonb = NULL,
          chunk_size integer = 250
        ) RETURNS void
        LANGUAGE sql
        SET search_path TO {schema}
        AS $func$
        {SQL:selects}
        $func$;
      $sql$,
      'schema', _tube_parse_ident(in_tbl, 1),
      'table', _tube_parse_ident(in_tbl, 2),
      'selects', array_to_string(
        ARRAY(
          SELECT _tube_template(
            E'  SELECT "{I:tube_schema}"."{I:tube}_touch"({shard}, $1, $2, $3, $4);',
            'tube_schema', current_schema(),
            'tube', t.tube,
            'shard', t.shard::text
          )
          FROM tube_list(in_tbl) t
        ),
        E'\n'
      )
    );
  ELSE
    EXECUTE _tube_template(
      'DROP FUNCTION IF EXISTS "{I:schema}"."{I:table}_touch"(bigint[], char, jsonb, integer)',
      'schema', _tube_parse_ident(in_tbl, 1),
      'table', _tube_parse_ident(in_tbl, 2)
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION _tube_ensure_table_touch_func(regclass)
  IS 'Recreates {table_name}_touch() function to accomodate changes after some tube is attached/detached.';
