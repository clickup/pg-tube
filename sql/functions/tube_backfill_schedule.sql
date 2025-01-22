CREATE OR REPLACE FUNCTION tube_backfill_schedule(
  in_tube text,
  order_col text,
  shard_from integer,
  shard_to integer
) RETURNS integer
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  rec record;
  num integer := 0;
  backfilling boolean;
BEGIN
  IF in_tube NOT IN (SELECT t.tube FROM tube_list() t) THEN
    RAISE EXCEPTION 'No such tube: %', tube;
  END IF;

  FOR rec IN
    SELECT * FROM tube_list()
    WHERE tube = in_tube AND shard BETWEEN shard_from AND shard_to
  LOOP
    EXECUTE
      _tube_template(
        $sql$
          SELECT count(1) > 0
          FROM "{I:tube}"
          WHERE
            shard = {shard}
            AND ids = '{}'
            AND payload IS NOT NULL
            AND payload->>'type' IN('backfill_schedule', 'backfill_end')
        $sql$,
        'tube', rec.tube,
        'shard', rec.shard::text
      )
      INTO backfilling;

    IF NOT backfilling THEN
      num := num + 1;
      EXECUTE
        _tube_template(
          $sql$ SELECT "{I:tube}_touch"({shard}, '{}', 'B', $1::jsonb, 1) $sql$,
          'tube', rec.tube,
          'shard', rec.shard::text
        )
        USING
          '{' ||
            '"type":"backfill_schedule",' ||
            '"tbl":"' || _tube_parse_ident(rec.tbl, 1) || '.' || _tube_parse_ident(rec.tbl, 2) || '",' ||
            '"order_col":"' || order_col || '"' ||
          '}';
    END IF;
  END LOOP;

  RETURN num;
END;
$$;

COMMENT ON FUNCTION tube_backfill_schedule(text, text, integer, integer)
  IS 'Adds special pods to the tube which will then be picked up by a Backfiller worker to inject '
     'backfill pods for the provided shards range. Backfill pods injection takes time (the source '
     'table needs to be full-scanned and ordered), so we delegate it to the worker to run in '
     'background and with limited concurrency.';
