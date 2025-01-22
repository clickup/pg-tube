CREATE OR REPLACE FUNCTION tube_backfill_step2(
  timeout interval = '60 seconds'
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  active_xids xid[];
  active_tx record;
  wait_started timestamptz;
  notice_flushed timestamptz;
BEGIN
  active_xids := ARRAY(
    SELECT backend_xid
    FROM pg_stat_activity
    WHERE
      backend_xid IS NOT NULL
      AND datname = current_database()
      AND pid <> pg_backend_pid()
  );
  wait_started := clock_timestamp();
  notice_flushed := clock_timestamp();
  WHILE clock_timestamp() - wait_started < timeout LOOP
    PERFORM pg_stat_clear_snapshot();
    SELECT
      backend_xid AS xid,
      date_trunc('second', clock_timestamp() - query_start) AS duration,
      substring(
        trim(regexp_replace(
          regexp_replace(query, '[\n\r]+|/\*.*?\*/', ' ', 'g'),
          '\s+', ' ', 'g'
        ))
        FOR 256
      ) AS query
      FROM pg_stat_activity
      WHERE backend_xid = ANY(active_xids)
      ORDER BY query_start
      LIMIT 1
      INTO active_tx;
    IF active_tx IS NULL THEN
      RETURN;
    END IF;
    PERFORM pg_sleep(0.5);
    IF clock_timestamp() - notice_flushed > interval '2 seconds' THEN
      RAISE NOTICE
        'tube_backfill: await_ms=% active_tx_xid=% active_tx_duration=% -- awaiting the active transaction(s) to finish: %',
        round(1000 * EXTRACT(EPOCH FROM clock_timestamp() - wait_started)),
        active_tx.xid,
        active_tx.duration,
        active_tx.query;
      notice_flushed := clock_timestamp();
    END IF;
  END LOOP;
  RAISE EXCEPTION
    'Timed out waiting until all active transactions finish (waited for %). Transaction % running for % is still active: %',
    timeout,
    active_tx.xid,
    active_tx.duration,
    active_tx.query;
END;
$$;

COMMENT ON FUNCTION tube_backfill_step2(interval)
  IS 'Awaits-till-finish for all transactions in other sessions (which were in progress when the '
     'current function is started). This is effectively a write barrier between step1 and step3.';
