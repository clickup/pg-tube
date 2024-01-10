CREATE OR REPLACE FUNCTION tube_list(in_tbl regclass = NULL) RETURNS TABLE (
  tube text,
  predicate text,
  partitions integer,
  tbl regclass,
  shard integer
)
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  -- See https://tinyurl.com/2p99p3yx and https://www.postgresql.org/docs/13/catalog-pg-trigger.html
  RETURN QUERY(
    WITH
      tubes AS MATERIALIZED (
        SELECT
          relname::text AS tube,
          _tube_partitions(relname::regclass) AS partitions,
          _tube_predicate(relname::text) AS predicate
        FROM pg_class
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE
          pg_class.relkind = 'r'
          AND pg_namespace.nspname = current_schema()
          AND '{ids,op,seq}' = ARRAY(
            SELECT attname FROM pg_attribute
            WHERE attrelid = pg_class.oid AND attnum > 0 AND attname IN('ids', 'op', 'seq')
            ORDER BY attname
          )
      ),
      tube_attached AS MATERIALIZED (
        SELECT DISTINCT
          substring(pg_proc.proname from '^(.+)_trigger') AS tube,
          pg_trigger.tgrelid,
          string_to_array(encode(tgargs, 'escape'), E'\\000') AS tgargs
        FROM pg_trigger
        JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid
        WHERE
          (in_tbl IS NULL OR pg_trigger.tgrelid = in_tbl)
          AND pg_proc.pronamespace = current_schema()::regnamespace
      )
    SELECT
      tubes.tube AS tube,
      tubes.predicate AS predicate,
      tubes.partitions AS partitions,
      tube_attached.tgrelid::regclass AS tbl,
      tube_attached.tgargs[1]::integer AS shard
    FROM tubes
    LEFT JOIN tube_attached ON tube_attached.tube = tubes.tube
    WHERE (in_tbl IS NULL OR tube_attached.tgrelid = in_tbl)
    ORDER BY tube, shard
  );
END;
$$;

COMMENT ON FUNCTION tube_list(regclass)
  IS 'Returns all tubes and all their tables with shard numbers. If there are no tables '
     'attached to the tube, it is still returned, but tbl field will be NULL. The source '
     'of truth about the attached tables is those tables'' tube triggers arguments. The '
     'source of truth about the predicate is the {tube}_trigger function body.';
