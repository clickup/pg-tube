/**
 * Updates:
 * - {tube}_touch(shard, ids, op, payload, chunk_size)
 * - {tube}_trigger()
 */
CREATE OR REPLACE FUNCTION _tube_ensure_touch_funcs(
  tube text,
  predicate text
) RETURNS SETOF text
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF tube IN (SELECT t.tube FROM tube_list() t) THEN
    EXECUTE _tube_template(
      $sql$
        CREATE OR REPLACE FUNCTION "{I:tube}_touch"(
          shard integer,
          ids bigint[],
          op char,
          payload jsonb = NULL,
          chunk_size integer = 250
        ) RETURNS void
        LANGUAGE plpgsql
        SET search_path FROM CURRENT
        AS $func$
        DECLARE
          ids_card integer;
          tubes text[];
          tubes_card integer;
          offs integer;
          chunk0 bigint[];
          chunk1 bigint[];
          chunk2 bigint[];
          chunk3 bigint[];
        BEGIN
          ids_card := cardinality(ids);

          -- No ids and no payload, nothing to do.
          IF ids_card = 0 AND payload IS NULL THEN
            RETURN;
          END IF;

          -- If application name has "backfill" word in it, force op to be "B".
          IF current_setting('application_name') LIKE '%backfill%' THEN
            op := 'B';
          END IF;

          -- Control pod, a special commands denoting e.g. backfill start/end.
          IF ids_card = 0 AND payload IS NOT NULL THEN
            INSERT INTO "{I:tube}"(op, shard, ids, payload) VALUES (op, shard, '{}', payload);
            RETURN;
          END IF;

          -- Unwind the loop using 4-batches (applies to backfill).
          offs := 0;
          WHILE offs <= ids_card - chunk_size * 4 LOOP
            chunk0 := ids[offs + 1 : offs + chunk_size];
            offs := offs + chunk_size;
            chunk1 := ids[offs + 1 : offs + chunk_size];
            offs := offs + chunk_size;
            chunk2 := ids[offs + 1 : offs + chunk_size];
            offs := offs + chunk_size;
            chunk3 := ids[offs + 1 : offs + chunk_size];
            offs := offs + chunk_size;
            INSERT INTO "{I:tube}"(op, shard, ids)
              VALUES (op, shard, chunk0), (op, shard, chunk1), (op, shard, chunk2), (op, shard, chunk3);
          END LOOP;

          -- Insert the rest chunk by chunk.
          WHILE offs < ids_card LOOP
            chunk0 := ids[offs + 1 : offs + chunk_size];
            offs := offs + chunk_size;
            INSERT INTO "{I:tube}"(op, shard, ids) VALUES (op, shard, chunk0);
          END LOOP;
        END;
        $func$;

        COMMENT ON FUNCTION "{I:tube}_touch"(integer, bigint[], char, jsonb, integer)
          IS 'Adds an array of ids to this the tube. When storing, the array will be split '
             'into chunks of chunk_size length. The value in chunk_size must be such as the '
             'total tuple length does not exceed PG page size (8 KB). The recommended size '
             'is even chunk_size=250 (each id is 8 bytes, so 8 * 250 = 2000 bytes which is '
             'roughly 1/4th of the page).';

        CREATE OR REPLACE FUNCTION "{I:tube}_trigger"() RETURNS trigger
        LANGUAGE plpgsql
        SET search_path FROM CURRENT
        AS $func$
        BEGIN
          PERFORM "{I:tube}_touch"(
            TG_ARGV[0]::integer,
            ARRAY(SELECT DISTINCT id FROM rows{SQL:where_predicate}),
            left(TG_OP, 1)
          );
          RETURN NULL;
        END;
        $func$;

        COMMENT ON FUNCTION "{I:tube}_trigger"()
          IS 'After-statement insert/update/delete trigger to be added to a tube-attached table.';
      $sql$,
      'tube', tube,
      'where_predicate', CASE WHEN COALESCE(predicate, '') <> '' THEN ' WHERE ' || predicate ELSE '' END
    );
  ELSE
    EXECUTE _tube_template(
      $sql$
        DROP FUNCTION IF EXISTS "{I:tube}_touch"(integer, bigint[], char, jsonb, integer);
        DROP FUNCTION IF EXISTS "{I:tube}_trigger"();
      $sql$,
      'tube', tube
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION _tube_ensure_touch_funcs(text, text)
  IS 'Recreates {tube}_touch() and {tube}_trigger() functions to accommodate '
     'changes after some tube is created. If predicate is specified, then '
     'the trigger will only insert ids that match the predicate.';
