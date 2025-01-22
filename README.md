# pg-tube: collect touch events from tables

- "Tube" is internally a queue table with batches of touch event ids ("pods")
  from some table/shard.
- Ideologically, "tube" is a user-space logical replication slot which only
  records touch events (ids).
- Tubes can be added (`tube_ensure_exists(tube, partitions, predicate)`) and
  removed (`tube_ensure_absent(tube)`) at run-time. When removing, all the
  tables are automatically detached from the tube.
- Tube may have a SQL predicate assigned. This predicate will apply to the rows
  of the attached tables that trigger touch events. If the predicate returns
  false, then the id will not be touched. This also applies to backfill: only
  the rows matching predicate will generate backfill pods. Predicate introduces
  some assumption about the structure of the tables which can be attached to the
  tube. (Ideally, predicates should've been per-tube-table pairs, but it is
  harder to implement - we'd need per-tube-table trigger functions as well - so
  we end up with a more pragmatic solution for now.)
- Tubes and attached tables can be enumerated using `tube_list()` function.
- Each tube table has 5 main columns: 1) some auto-incremental sequence, 2)
  shard (some number which is assigned to a table when it's attached), 3)
  operation type (with a special operations '}' to denote the backfill ending),
  4) an array (chunk) of bigint ids, and 5) some optional JSON payload.
- Pods can be "regular" (contain non-empty ids) and "control" (have empty ids
  and non-empty payload). Control pods are: "backfill_schedule", "backfill_end".
- An arbitrary table can be "attached" to a tube
  (`tube_table_ensure_attached(tube, table, shard)`). When attaching, you must
  also provide some "shard number" value which will then be recorded in the tube
  along with ids. (If shard number is not provided, pg-tube tries to infer it
  from the table name's numeric suffix.) Once attached, all insert/update/delete
  operations will result into adding a "touch" pod to the corresponding tube.
- A table can also be "detached" from a tube (with
  `tube_table_ensure_detached(tube, table)`).
- To run the initial piping, backfill function should be called in separate
  transactions, one after another (`tube_backfill_step1()`,
  `tube_backfill_step2()` and then `tube_backfill_step3(step1_result, tube,
  table, order_col, shard)`). This will bulk-insert all the ids from the table
  to the tube (op='B') record. Ordering by the provided column in step3 is
  important, because for encrypted databases (e.g. ECIES), ephemeral shared key
  for neighbor rows will likely be cached with short expiration time. So the
  closer the updates we process are in time, the higher is the chance to have a
  Diffie-Hellman hit.
- To bulk-insert touch events from some large SQL query results (e.g. to
  generate a large number of "fanout touches"), use `tube_pods_insert()`
  function.
- There is `tube_stats()` function which shows all the details about the current
  tubes structure and content.

In its nature, tubes are eventual-consistent, mainly because of enrichment
process which takes time and delivers the results with unpredictable latency. It
means that there is absolutely no way to rely on some external source of order
in the events (like row version), and the only way to solve it all is to never
replay the same id concurrently. We also strictly rely on the fact that the
downstream for the replay should be eventual-consistent and e.g. never reorder
writes A and B for the same id once an ack from write A is received.

The application code should constantly monitor all existing tubes. One tube may
correspond to one logical unit of work (e.g. we may have a live ES index, a
spare ES index and a cache-invalidation tube, thus 3 tubes). For each tube, it
spawns a beforehand-known number of separate replication stream workers, each
worker processing only ids from their own set of shards (e.g. a "shard % 3"
formula can be used as a function to allocate different touch events to
different workers with numbers 0, 1, 2). Each worker reads ids from the tube,
processes them in a strictly serial way ordering from lowest seq to highest (so
it's guaranteed that there is never a concurrency when processing the same id)
and removes from the tube. To reach eventual consistency, the workers must do
enrichment (i.e. loading the actual data from the DB after receiving a touch
event for some id). It's critical that each shard is processed by exactly one
worker (no parallelism within one shard), and that the same id is never
processed concurrently; having these assumptions allows us to NOT keep record
versions in the tube and just rely on natural eventual consistency ordering (we
can't even count on whether a record in the tube corresponds to a deletion or to
an insert/update).

Backfill events (op='B' or ALL pods scheduled when PG's application_name
contained substring "backfill") are processed in the exact same way as
insert/update/delete/touch events, but with lower priority (the application uses
`ORDER BY op='B', seq` clause in SELECT which matches the index exactly). Also,
once a control pod with `type=backfill_end, start_seq=S` payload is received, it
signals the worker that pods with seq < S are not needed on the downstream
anymore, and they should be removed (garbage collected).

## Downstream shard number vs. upstream shard number

Currently, pg-tube can choose downstream shard number only deterministically by
PG microshard number. There are several reasons for that, which this chapter is
about.

When we delete a row from PG, we receive a touch event with `{id, shard}` info.
This is the only info we have to be able to identify the downstream shard and
downstream doc id to replay the deletion over into the downstream (we can't look
at other row props since they don't exist at the time of the deletion). Which
means that downstream shard routing must be deterministic by either a prefix of
touch.id or by touch.shard (which is typically the same).

Another use-case is garbage collection: it happens after the backfill-over
phase. There, we query an individual “touch shard number” in the downstream (see
Garbage.ts) using the routing based on that shard number for “docs updated
earlier than the backfill has started”. All found ids get removed (in fact, the
exactly same workflow applies as for deletion, with enrichment etc., to
eliminate race conditions).

For the future, no-one in theory stops us from writing an arbitrary value to
`touch.shard` at the moment of its injection into the tube. In this sense, the
naming is slightly misleading: it should've been named `touch.routing`, not
`touch.shard`, since it only determines the downstream routing, and it also
defines the work distribution among multiple running jobs (to not let them
collide).

Currently, pg-tube infers the value for `touch.shard` from the numeric part of
the table schema's name. And it does it statically, at tube attachment time
(i.e. not for every touch event). I.e. the shard number is hardcoded in the e.g.
tube trigger (available via `TG_ARGV[0]`) which receives a set of
inserted/updated/deleted rows.

So, it seems like a doable feature, to implement custom routing. Unfortunately,
implementing it is way not so easy. This is mainly because of the above static
assumptions (like if we receive a batch of touched rows in the tube trigger, we
always assume they relate to the same shard, since the shard is determined by
the table's schema).

## Testing

Use `yarn test` and `yarn test:db` to run the automated tests.
