\ir ./begin.sql

CREATE TABLE mytable(id bigint, s text);

SELECT tube_ensure_exists('mytube', 2) \gset
SELECT tube_ensure_exists('myothertube') \gset

SELECT * FROM tube_list();

SELECT expect(
  $$ SELECT COUNT(1) FROM tube_list('mytable') $$,
  '0',
  'before attaching a table'
) \gset

SELECT expect(
  $$ SELECT ROW(partitions, tbl, shard) FROM tube_list() WHERE tube = 'myothertube' $$,
  '(1,,)',
  'after created empty myothertube'
) \gset

SELECT tube_table_ensure_attached('mytube', 'mytable', 0) \gset

SELECT expect(
  $$ SELECT array_agg(tube) FROM tube_list('mytable') $$,
  '{mytube}',
  'after attaching a table'
) \gset

SELECT expect(
  $$ SELECT ROW(partitions, tbl, shard) FROM tube_list() WHERE tube = 'mytube' $$,
  '(2,mytable,0)',
  'after attached to the 1st tube'
) \gset

SELECT tube_table_ensure_attached('myothertube', 'mytable', 0) \gset

SELECT expect(
  $$ SELECT array_agg(tgname ORDER BY tgname) FROM pg_trigger WHERE tgname LIKE '%my%tube%' $$,
  '{mytable_myothertube_after_delete_trigger,mytable_myothertube_after_insert_trigger,mytable_myothertube_after_update_trigger,mytable_mytube_after_delete_trigger,mytable_mytube_after_insert_trigger,mytable_mytube_after_update_trigger}',
  'after attached to 2 tubes'
) \gset
SELECT expect(
  $$ SELECT array_agg(proname ORDER BY proname) FROM pg_proc WHERE proname = 'mytable_touch' $$,
  '{mytable_touch}',
  'after detached from myothertube'
) \gset

SELECT tube_table_ensure_detached('myothertube', 'mytable') \gset

SELECT expect(
  $$ SELECT array_agg(tgname ORDER BY tgname) FROM pg_trigger WHERE tgname LIKE '%mytube%' $$,
  '{mytable_mytube_after_delete_trigger,mytable_mytube_after_insert_trigger,mytable_mytube_after_update_trigger}',
  'after detached from myothertube'
) \gset
SELECT expect(
  $$ SELECT array_agg(proname ORDER BY proname) FROM pg_proc WHERE proname = 'mytable_touch' $$,
  '{mytable_touch}',
  'after detached from myothertube'
) \gset

SELECT tube_ensure_absent('mytube') \gset
SELECT expect(
  $$ SELECT array_agg(tgname ORDER BY tgname) FROM pg_trigger WHERE tgname LIKE '%mytube%' $$,
  NULL,
  'after mytube is removed'
) \gset

SELECT tube_ensure_absent('myothertube') \gset

DROP TABLE mytable;

\ir ./rollback.sql
