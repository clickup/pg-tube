\ir ./begin.sql

CREATE SCHEMA myschema0042;
CREATE TABLE myschema0042.test_table(id bigint, s text);
INSERT INTO myschema0042.test_table VALUES (1, 'z'), (2, 'y'), (3, 'x'), (4, 'w'), (5, 'v');

SELECT tube_ensure_exists('mytube') \gset
SELECT tube_table_ensure_attached('mytube', 'myschema0042.test_table') \gset

SELECT mytube_touch(42, '{42}', 'B') \gset

\echo
\echo Backfill step 1...
SELECT tube_backfill_step1() \gset
\echo Backfill step 2...
SELECT tube_backfill_step2() \gset
\echo Backfill step 3...
SELECT tube_backfill_step3(
  :'tube_backfill_step1',
  'mytube',
  'myschema0042.test_table',
  's',
  NULL,
  4,
  2
) \gset

SELECT tube, partition, backfill_count, inc_count, control_count FROM tube_stats();

SELECT * FROM mytube ORDER BY seq;
SELECT expect(
  $$ SELECT array_agg(ids::text ORDER BY seq) FROM mytube $$,
  '{"{42}","{}","{5,4}","{3,2}","{1}","{}"}',
  'after tube_backfill'
) \gset
SELECT expect(
  $$ SELECT payload FROM mytube WHERE seq = 7 $$,
  '{"type": "backfill_end", "start_seq": "2"}',
  'after tube_backfill'
) \gset

ANALYZE mytube;
SELECT tube, partition, backfill_count, inc_count FROM tube_stats();

SELECT tube_ensure_absent('mytube');

\ir ./rollback.sql
