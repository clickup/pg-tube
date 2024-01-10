\ir ./begin.sql

CREATE SCHEMA myschema0042;
CREATE TABLE myschema0042.test_table(id bigint, s text);

SELECT tube_ensure_exists('mytube1') \gset
SELECT tube_ensure_exists('mytube2') \gset
SELECT tube_table_ensure_attached('mytube1', 'myschema0042.test_table') \gset
SELECT tube_table_ensure_attached('mytube2', 'myschema0042.test_table') \gset

SELECT expect(
  $$ SELECT count(1) FROM tube_list() WHERE tbl IS NOT NULL $$,
  '2',
  'after attaching to 2 tubes'
) \gset

SELECT tube_table_ensure_detached(NULL, 'myschema0042.test_table') \gset

SELECT expect(
  $$ SELECT count(1) FROM tube_list() WHERE tbl IS NOT NULL $$,
  '0',
  'after detaching to 2 tubes'
) \gset

SELECT tube_ensure_absent('mytube1');
SELECT tube_ensure_absent('mytube2');

\ir ./rollback.sql
