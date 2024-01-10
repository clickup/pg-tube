CREATE OR REPLACE FUNCTION tube_backfill_step1() RETURNS text
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  RETURN nextval('tube_seq');
END;
$$;

COMMENT ON FUNCTION tube_backfill_step1()
  IS 'Records the current tube sequence and returns it to the caller, to be passed later to step3 function.';
