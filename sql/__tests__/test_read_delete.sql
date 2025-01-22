\ir ./begin.sql

SELECT tube_ensure_exists('mytube', 3) \gset

SELECT mytube_touch(0, '{1,2,3}', 'I') \gset
SELECT mytube_touch(0, '{4,5,6}', 'U') \gset
SELECT mytube_touch(0, '{7,8,9}', 'B') \gset

SELECT expect(
  $$ SELECT tube_pods_sql('mytube', 3, 0) $$,
  $$
    (SELECT seq, op, shard, ids::text, payload
      FROM "mytube"
      WHERE shard % 3 = 0 AND op <> 'B'
      ORDER BY seq)
    UNION ALL
    (SELECT seq, op, shard, ids::text, payload
      FROM "mytube"
      WHERE shard % 3 = 0 AND op = 'B'
      ORDER BY seq)
  $$,
  'after adding pods, reads non-backfill and backfill'
) \gset

SELECT expect(
  $$ SELECT tube_pods_sql('mytube', 3, 0, true) $$,
  $$
    SELECT seq, op, shard, ids::text, payload
      FROM "mytube"
      WHERE shard % 3 = 0 AND op <> 'B'
      ORDER BY seq
  $$,
  'after adding pods, reads backfill-only pods'
) \gset

SELECT tube_pods_delete('mytube', 3, 0, '{1,3}') \gset

SELECT expect(
  $$ SELECT array_agg(seq) FROM mytube $$,
  '{2}',
  'after deleting row 1'
) \gset

SELECT tube_ensure_absent('mytube') \gset

\ir ../pg-tube-down.sql
