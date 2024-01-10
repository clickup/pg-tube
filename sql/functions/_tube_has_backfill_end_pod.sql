CREATE OR REPLACE FUNCTION _tube_has_backfill_end_pod(
  tube text,
  shard integer
) RETURNS boolean
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  cnt integer;
BEGIN
  EXECUTE _tube_template(
    $sql$
      SELECT count(1)
      FROM "{I:tube}"
      WHERE
        ids = '{}'
        AND shard = {I:shard}
        AND payload IS NOT NULL
        AND payload->>'type' = 'backfill_end'
    $sql$,
    'tube', tube,
    'shard', shard::text
  ) INTO cnt;
  RETURN COALESCE(cnt, 0) >= 1;
END;
$$;

COMMENT ON FUNCTION _tube_has_backfill_end_pod(text, integer)
  IS 'Returns true if backfill_end control pod for the provided shard is '
     'already in the tube (which means that backfill is already running).';
