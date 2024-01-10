\ir ./begin.sql

SELECT tube_ensure_exists('mytube', 3) \gset

SELECT mytube_touch(0, '{1,2,3}', 'I') \gset
SELECT mytube_touch(0, '{4,5,6}', 'U') \gset

SELECT tube_pods_sql('mytube', 3, 0) \gset
:tube_pods_sql;

SELECT tube_pods_delete('mytube', 3, 0, '{1}') \gset

SELECT expect(
  $$ SELECT array_agg(seq) FROM mytube $$,
  '{2}',
  'after deleting row 1'
) \gset

SELECT tube_ensure_absent('mytube') \gset

\ir ../pg-tube-down.sql
