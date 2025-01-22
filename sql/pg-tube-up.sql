-- Do NOT remove any of those "DROP FUNCTION IF EXISTS" clauses! Only add new
-- ones. They are needed to migrate from older pg-tube versions (e.g. when we
-- change the return type structure or the number of arguments).
DROP FUNCTION IF EXISTS tube_list() \gset
DROP FUNCTION IF EXISTS tube_stats() \gset
DROP FUNCTION IF EXISTS tube_list(regclass) \gset
DROP FUNCTION IF EXISTS tube_ensure_exists(text, integer) \gset
DROP FUNCTION IF EXISTS _tube_ensure_touch_funcs(text) \gset
DROP FUNCTION IF EXISTS tube_pods_insert(text, text, integer, char, bigint, integer, integer) \gset
DROP FUNCTION IF EXISTS tube_pods_sql(text, integer, integer) \gset

\ir ./functions/_tube_count.sql
\ir ./functions/_tube_ensure_indexes.sql
\ir ./functions/_tube_ensure_table_touch_func.sql
\ir ./functions/_tube_ensure_touch_funcs.sql
\ir ./functions/_tube_has_backfill_end_pod.sql
\ir ./functions/_tube_lock.sql
\ir ./functions/_tube_parse_ident.sql
\ir ./functions/_tube_partitions_indexes.sql
\ir ./functions/_tube_partitions.sql
\ir ./functions/_tube_predicate.sql
\ir ./functions/_tube_query_size_estimate.sql
\ir ./functions/_tube_table_infer_default_shard.sql
\ir ./functions/_tube_table_size_estimate.sql
\ir ./functions/_tube_template.sql
\ir ./functions/tube_backfill_schedule.sql
\ir ./functions/tube_backfill_step1.sql
\ir ./functions/tube_backfill_step2.sql
\ir ./functions/tube_backfill_step3.sql
\ir ./functions/tube_ensure_absent.sql
\ir ./functions/tube_ensure_exists.sql
\ir ./functions/tube_list.sql
\ir ./functions/tube_pods_delete.sql
\ir ./functions/tube_pods_insert.sql
\ir ./functions/tube_pods_sql.sql
\ir ./functions/tube_stats.sql
\ir ./functions/tube_table_ensure_attached.sql
\ir ./functions/tube_table_ensure_detached.sql

CREATE SEQUENCE IF NOT EXISTS tube_seq;

COMMENT ON SEQUENCE tube_seq
  IS 'An auto-increment sequence for rows in the tubes.';

DO $$
DECLARE
  rec record;
  tables text;
BEGIN
  tables := array_to_string(
    ARRAY(
      SELECT DISTINCT tbl::text FROM tube_list() WHERE tbl IS NOT NULL
      UNION ALL
      SELECT DISTINCT tube::text FROM tube_list()
    ),
    ', '
  );
  IF tables <> '' THEN
    RAISE NOTICE 'Blocking writes to all tables for pg-tube upgrade. Reads are still working. Please wait until all other app''s writes finish or timeout. You may monitor long running writes with e.g. pg_activity shell CLI tool. Tables: %', tables;
    EXECUTE format('LOCK TABLE %s IN EXCLUSIVE MODE', tables);
  END IF;
  FOR rec IN SELECT DISTINCT tube, partitions, predicate FROM tube_list() LOOP
    PERFORM tube_ensure_exists(rec.tube, rec.partitions, rec.predicate);
    RAISE NOTICE 'Tube "%" with % partition(s) and "%" predicate updated',
      rec.tube, rec.partitions, COALESCE(rec.predicate, '');
  END LOOP;
END;
$$;
