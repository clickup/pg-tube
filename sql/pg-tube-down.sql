DROP FUNCTION _tube_count(regclass, integer);
DROP FUNCTION _tube_ensure_indexes(regclass, integer);
DROP FUNCTION _tube_ensure_table_touch_func(regclass);
DROP FUNCTION _tube_ensure_touch_funcs(text, text);
DROP FUNCTION _tube_has_backfill_end_pod(text, integer);
DROP FUNCTION _tube_lock(regclass);
DROP FUNCTION _tube_parse_ident(regclass, integer);
DROP FUNCTION _tube_partitions_indexes(regclass);
DROP FUNCTION _tube_partitions(regclass);
DROP FUNCTION _tube_predicate(text);
DROP FUNCTION _tube_query_size_estimate(text, regclass);
DROP FUNCTION _tube_table_infer_default_shard(regclass);
DROP FUNCTION _tube_table_size_estimate(regclass);
DROP FUNCTION _tube_template(text, text[]);
DROP FUNCTION tube_backfill_schedule(text, text, integer, integer);
DROP FUNCTION tube_backfill_step1();
DROP FUNCTION tube_backfill_step2(interval);
DROP FUNCTION tube_backfill_step3(text, text, regclass, text, integer, integer, integer);
DROP FUNCTION tube_ensure_absent(text);
DROP FUNCTION tube_ensure_exists(text, integer, text);
DROP FUNCTION tube_list(regclass);
DROP FUNCTION tube_pods_delete(text, integer, integer, bigint[]);
DROP FUNCTION tube_pods_insert(text, text, integer, char, bigint, integer, integer);
DROP FUNCTION tube_pods_sql(text, integer, integer, boolean);
DROP FUNCTION tube_stats();
DROP FUNCTION tube_table_ensure_attached(text, regclass, integer);
DROP FUNCTION tube_table_ensure_detached(text, regclass);

DROP SEQUENCE tube_seq CASCADE;
