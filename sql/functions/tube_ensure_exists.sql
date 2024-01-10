/**
 * Creates:
 * 1. {tube} table;
 * 2. {tube}_touch(shard, ids, op) function;
 * 3. {tube}_trigger() function.
 */
CREATE OR REPLACE FUNCTION tube_ensure_exists(
  tube text,
  partitions integer = 1,
  predicate text = NULL
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  EXECUTE _tube_template(
    $sql$
      CREATE TABLE IF NOT EXISTS "{I:tube}"(
        seq bigint NOT NULL DEFAULT nextval('tube_seq'),
        op char NOT NULL CONSTRAINT op CHECK (op IN('I', 'U', 'D', 'T', 'B')),
        shard integer NOT NULL,
        ids bigint[] NOT NULL,
        payload jsonb,
        ts timestamptz NOT NULL DEFAULT clock_timestamp()
      ) WITHOUT OIDS;

      -- Lock the tables, so changes in the number of partitions sometimes happens quickly.
      SELECT _tube_lock({tube});

      -- Disable TOAST. For performance reasons, we guarantee that ids are
      -- always stored in the table itself and never overflow to TOASTs.
      ALTER TABLE "{I:tube}" ALTER COLUMN ids SET STORAGE PLAIN;

      -- Update indexes to match the desired number of shards partitions.
      SELECT _tube_ensure_indexes({tube}::regclass, {partitions});

      -- Create tube_touch() and tube_trigger() functions and save predicate.
      SELECT _tube_ensure_touch_funcs({tube}, {predicate});
    $sql$,
    'tube', tube,
    'partitions', partitions::text,
    'predicate', COALESCE(predicate, '')
  );
END;
$$;

COMMENT ON FUNCTION tube_ensure_exists(text, integer, text)
  IS 'Creates a new tube with the provided name if it does not exist yet. After the tube is '
     'created, there are 3 objects appeared in the database: 1) the tube table (same name '
     'as the tube name), 2) the tube {tube}_touch() function to insert records into this '
     'table in a fastest possible manner, and 3) the tube {tube}_trigger() function which '
     'is then used to attach tables to this tube.';
