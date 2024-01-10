\ir ./begin.sql

CREATE SCHEMA myschema0042;
SET search_path TO myschema0042, test_pg_tube, tube;

SELECT tube_ensure_exists('mytube', 1, 's NOT LIKE ''skip%''') \gset

SELECT expect(
  $$ SELECT predicate FROM tube_list() WHERE predicate IS NOT NULL $$,
  's NOT LIKE ''skip%''',
  'after creating the tube'
) \gset

SELECT expect(
  $$ SELECT predicate FROM tube_stats() WHERE predicate IS NOT NULL $$,
  's NOT LIKE ''skip%''',
  'after creating the tube'
) \gset

CREATE TABLE mytable(id bigint, s text);

SELECT tube_table_ensure_attached('mytube', 'mytable', 0) \gset

INSERT INTO mytable(id, s) VALUES (42, 'a'), (43, 'skip 1');
DELETE FROM mytable WHERE id = 42;
DELETE FROM mytable WHERE id = 43;

SELECT expect(
  $$ SELECT array_agg(ids::text ORDER BY seq) FROM mytube $$,
  '{"{42}","{42}"}',
  'after triggers fired'
) \gset

SELECT * FROM mytube ORDER BY seq;

SELECT tube_ensure_absent('mytube') \gset

DROP TABLE mytable CASCADE;

\ir ../pg-tube-down.sql
