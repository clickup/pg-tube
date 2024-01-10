CREATE OR REPLACE FUNCTION tube_pods_delete(
  tube text,
  partitions integer,
  partition integer,
  seqs bigint[]
) RETURNS integer
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  actual_partitions integer := _tube_partitions(tube::regclass);
  num integer;
BEGIN
  IF actual_partitions <> partitions THEN
    RAISE EXCEPTION
      'Cannot delete rows from the tube "%" since the expected number of partitions (%) is different from the actual number of partitions (%)',
      tube, partitions, actual_partitions;
  END IF;
  EXECUTE
    _tube_template(
      $sql$
        DELETE FROM "{I:tube}"
        WHERE
          (shard % $1 = $2 AND op = 'B' AND seq = ANY($3))
          OR
          (shard % $1 = $2 AND op <> 'B' AND seq = ANY($3))
      $sql$,
      'tube', tube
    )
    USING partitions, partition, seqs;
  GET DIAGNOSTICS num = ROW_COUNT;
  RETURN num;
END;
$$;

COMMENT ON FUNCTION tube_pods_delete(text, integer, integer, bigint[])
  IS 'Deletes some rows from a provided tube''s partition.';
