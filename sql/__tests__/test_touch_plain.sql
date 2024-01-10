\ir ./begin.sql

CREATE SCHEMA myschema0042;
SET search_path TO myschema0042, test_pg_tube, tube;

SELECT tube_ensure_exists('mytube') \gset
SELECT tube_ensure_exists('mytube', 3) \gset
SELECT tube_ensure_exists('mytube', 4) \gset
SELECT mytube_touch(0, '{1,2,3}', 'I') \gset

SELECT expect(
  $$ SELECT array_agg(ids::text) FROM mytube $$,
  '{"{1,2,3}"}',
  'after mytube_touch for a non-attached tube'
) \gset

\d mytube
\df mytube_*

CREATE TABLE mytable(id bigint, s text);

SELECT tube_table_ensure_attached('mytube', 'mytable', 0) \gset
\d mytable
\df mytable*

INSERT INTO mytable(id, s) VALUES (42, 'a'), (43, 'b');
DELETE FROM mytable WHERE id = 42;

SELECT tube_table_ensure_detached('mytube', 'mytable') \gset

-- will be a no-op (table is detached)
INSERT INTO mytable(id, s) VALUES (101, 'z');

SELECT expect(
  $$ SELECT array_agg(ids::text ORDER BY seq) FROM mytube $$,
  '{"{1,2,3}","{42,43}","{42}"}',
  'after triggers fired and table detached'
) \gset

SELECT mytube_touch(0, '{1,2,3,4,5,6,7,8,9}', 'B', NULL, 2) \gset

SELECT * FROM mytube ORDER BY seq;
SELECT expect(
  $$ SELECT array_agg(ids::text ORDER BY seq) FROM mytube $$,
  '{"{1,2,3}","{42,43}","{42}","{1,2}","{3,4}","{5,6}","{7,8}","{9}"}',
  'after mytube_touch with small chunk'
) \gset

SELECT tube_ensure_absent('mytube') \gset

DROP TABLE mytable CASCADE;

\ir ../pg-tube-down.sql
