\ir ./begin.sql

SET application_name TO 'some/backfill';

CREATE SCHEMA myschema0042;
SET search_path TO myschema0042, test_pg_tube, tube;

SELECT tube_ensure_exists('mytube') \gset
SELECT mytube_touch(0, '{1,2,3}', 'I') \gset

SELECT expect(
  $$ SELECT array_agg(op::text) FROM mytube $$,
  '{B}',
  'after mytube_touch for a non-attached tube'
) \gset

SELECT tube_ensure_absent('mytube') \gset

\ir ../pg-tube-down.sql
