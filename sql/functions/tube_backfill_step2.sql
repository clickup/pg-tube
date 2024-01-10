CREATE OR REPLACE FUNCTION tube_backfill_step2(
  timeout interval = '60 seconds'
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  snap pg_snapshot;
  wait_started timestamptz;
  notice_flushed timestamptz;
BEGIN
  snap := pg_current_snapshot();
  wait_started := clock_timestamp();
  notice_flushed := clock_timestamp();
  WHILE clock_timestamp() - wait_started < timeout LOOP
    IF EXISTS (SELECT 1 FROM pg_snapshot_xip(snap) xip WHERE pg_xact_status(xip) = 'in progress') THEN
      PERFORM pg_sleep(0.1);
    ELSE
      RETURN;
    END IF;
    IF clock_timestamp() - notice_flushed > interval '2 seconds' THEN
      RAISE NOTICE
        'tube_backfill: await_ms=% (awaiting in-progress transactions to finish)',
        round(1000 * EXTRACT(EPOCH FROM clock_timestamp() - notice_flushed));
      notice_flushed := clock_timestamp();
    END IF;
  END LOOP;
  RAISE EXCEPTION 'Timed out waiting until all in-progress transactions succeed (waited for %)', timeout;
END;
$$;

COMMENT ON FUNCTION tube_backfill_step2(interval)
  IS 'Awaits-till-finish for all transactions in other sessions (which were in progress when the '
     'current function is started). This is effectively a write barrier between step1 and step3.';
