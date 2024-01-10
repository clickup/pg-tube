/**
 * Updates indexes:
 * - {tube}_shard_seq_ids_empty (shard, seq) WHERE ids = '{}'
 * - {tube}_seq_{P}_of_{N}_b (seq) WHERE shard % {N} = {P} AND op = 'B'
 * - {tube}_seq_{P}_of_{N}_i (seq) WHERE shard % {N} = {P} AND op <> 'B'
 */
CREATE OR REPLACE FUNCTION _tube_ensure_indexes(
  tube regclass,
  partitions integer
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  tbl_schema text := _tube_parse_ident(tube, 1);
  tbl_name text := _tube_parse_ident(tube, 2);
  indexes text[];
  idx_name text;
BEGIN
  -- An index to quickly find all control pods.
  EXECUTE _tube_template(
    $sql$
      CREATE INDEX IF NOT EXISTS "{I:tube}_shard_seq_ids_empty"
      ON "{I:tube}" (shard, seq)
      WHERE ids = '{}';
    $sql$,
    'tube', tube::text
  );

  indexes := _tube_partitions_indexes(tube);

  -- Create non-existing indexes.
  FOR i IN 0 .. (partitions - 1) LOOP
    idx_name := tbl_name || '_seq_' || i || '_of_' || partitions || '_b';
    IF idx_name <> ALL(indexes) THEN
      EXECUTE _tube_template(
        $sql$
          CREATE INDEX "{I:idx_name}"
          ON "{I:tbl_schema}"."{I:tbl_name}" (seq)
          WHERE shard % {partitions} = {i} AND op = 'B';
        $sql$,
        'idx_name', idx_name,
        'tbl_schema', tbl_schema,
        'tbl_name', tbl_name,
        'i', i::text,
        'partitions', partitions::text
      );
    ELSE
      indexes := array_remove(indexes, idx_name);
    END IF;

    idx_name := tbl_name || '_seq_' || i || '_of_' || partitions || '_i';
    IF idx_name <> ALL(indexes) THEN
      EXECUTE _tube_template(
        $sql$
          CREATE INDEX "{I:idx_name}"
          ON "{I:tbl_schema}"."{I:tbl_name}" (seq)
          WHERE shard % {partitions} = {i} AND op <> 'B';
        $sql$,
        'idx_name', idx_name,
        'tbl_schema', tbl_schema,
        'tbl_name', tbl_name,
        'i', i::text,
        'partitions', partitions::text
      );
    ELSE
      indexes := array_remove(indexes, idx_name);
    END IF;
  END LOOP;

  -- Delete remaining (not actual anymore) indexes.
  FOREACH idx_name IN ARRAY indexes LOOP
    EXECUTE _tube_template('DROP INDEX "{I:idx_name}"', 'idx_name', idx_name);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION _tube_ensure_indexes(regclass, integer)
  IS 'Creates the needed number of partial indexes, so partition workers can fetch the data efficiently.';
