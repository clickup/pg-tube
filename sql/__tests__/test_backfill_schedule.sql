\ir ./begin.sql

CREATE SCHEMA myschema0042;
CREATE TABLE myschema0042.test_table(id bigint, s text);
INSERT INTO myschema0042.test_table VALUES (1, 'z'), (2, 'y'), (3, 'x'), (4, 'w'), (5, 'v');

SELECT tube_ensure_exists('mytube') \gset
SELECT tube_table_ensure_attached('mytube', 'myschema0042.test_table') \gset

SELECT tube_backfill_schedule('mytube', 's', 0, 1000) \gset
SELECT tube_backfill_schedule('mytube', 's', 0, 1000) \gset

SELECT payload FROM mytube;

SELECT expect(
  $$ SELECT string_agg(payload::text, ',') FROM mytube $$,
  '{"tbl": "myschema0042.test_table", "type": "backfill_schedule", "order_col": "s"}',
  'after tube_backfill_schedule'
) \gset


SELECT tube_ensure_absent('mytube');

\ir ./rollback.sql
