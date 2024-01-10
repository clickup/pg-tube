CREATE OR REPLACE FUNCTION tube_pods_insert(
  tube_or_tubes text,
  query text,
  shard integer,
  op char = 'B',
  approx_size bigint = NULL,
  fetch_chunk_size integer = 20000,
  insert_chunk_size integer = 250
) RETURNS void
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  ids bigint[];
  fetch_started timestamptz;
  insert_started timestamptz;
  notice_flushed timestamptz;
  fetch_ms integer;
  insert_queries text[];
  insert_query text;
  insert_ids bigint;
  insert_finished boolean;
  insert_percent double precision;
  insert_ms integer;
  insert_rps integer;
BEGIN
  fetch_started := clock_timestamp();
  insert_started := NULL;
  notice_flushed := clock_timestamp();
  insert_queries := ARRAY(
    SELECT _tube_template('SELECT "{I:tube}_touch"($1, $2, $3, $4::jsonb, $5)', 'tube', tube)
    FROM unnest(string_to_array(tube_or_tubes, ',')) AS tube
  );
  insert_ids := 0;
  insert_finished := FALSE;
  FOR ids IN EXECUTE _tube_template(
    $sql$
      (
        SELECT array_agg(id) AS ids
        FROM (
          {SQL:query}
        ) "query passed to tube_pods_insert"(id, row_number)
        GROUP BY (row_number - 1) / {fetch_chunk_size}
        ORDER BY (row_number - 1) / {fetch_chunk_size}
      ) UNION ALL (
        -- Solely to flush the last statistics notice.
        SELECT '{}'::bigint[] AS ids
      )
    $sql$,
    'query', query,
    'fetch_chunk_size', fetch_chunk_size::text
  ) LOOP
    IF fetch_ms IS NULL THEN
      insert_started := clock_timestamp();
      fetch_ms := round(EXTRACT(EPOCH FROM (insert_started - fetch_started)) * 1000);
    END IF;
    IF cardinality(ids) > 0 THEN
      FOREACH insert_query IN ARRAY insert_queries LOOP
        EXECUTE insert_query USING shard, ids, op, NULL, insert_chunk_size;
      END LOOP;
      insert_ids := insert_ids + cardinality(ids);
    END IF;
    IF NOT insert_finished AND (cardinality(ids) = 0 OR clock_timestamp() - notice_flushed > interval '2 seconds') THEN
      insert_finished := cardinality(ids) = 0;
      insert_ms := round(EXTRACT(EPOCH FROM (clock_timestamp() - insert_started)) * 1000);
      insert_rps := round(1.0 * insert_ids / GREATEST(insert_ms, 1) * 1000);
      insert_percent := CASE
        WHEN approx_size IS NOT NULL
          THEN LEAST(round(1.0 * insert_ids / GREATEST(approx_size, 1) * 100 * 10) / 10, 100)
        WHEN insert_finished
          THEN 100
        ELSE NULL
      END;
      RAISE NOTICE
        'tube_pods_insert: approx_size=% fetch_ms=% insert_ids=% insert_finished=% insert_percent=% insert_ms=% insert_rps=% (inserting)',
        approx_size, fetch_ms, insert_ids, insert_finished, insert_percent, insert_ms, insert_rps;
      notice_flushed := clock_timestamp();
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION tube_pods_insert(text, text, integer, char, bigint, integer, integer)
  IS 'Selects all the ids using the SQL query passed and turns them into tube touch writes. '
     'It''s implied that the query returns two columns: primary key and 1-based row number. '
     'You can pass multiple tube names separated with "," to insert to them transactionally.';
