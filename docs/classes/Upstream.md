[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / Upstream

# Class: Upstream

Defined in: [src/Upstream.ts:106](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L106)

## Constructors

### new Upstream()

> **new Upstream**(`_options`): [`Upstream`](Upstream.md)

Defined in: [src/Upstream.ts:110](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L110)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `_options` | [`UpstreamOptions`](../interfaces/UpstreamOptions.md) |

#### Returns

[`Upstream`](Upstream.md)

## Properties

| Property | Type |
| ------ | ------ |
| <a id="database"></a> `database` | [`Database`](Database.md) |
| <a id="island"></a> `island?` | `number` |

## Accessors

### reopenMinMs

#### Get Signature

> **get** **reopenMinMs**(): `number`

Defined in: [src/Upstream.ts:115](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L115)

##### Returns

`number`

## Methods

### \[custom\]()

> **\[custom\]**(): `string`

Defined in: [src/Upstream.ts:122](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L122)

Hides details about the upstream object when debug-printing.

#### Returns

`string`

***

### workers()

> **workers**(): `Promise`\<[`Worker`](Worker.md)[]\>

Defined in: [src/Upstream.ts:130](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L130)

Creates Worker objects for all of the tubes partitions in the database. The
number of workers per tube is defined by the number of tube's partitions.

#### Returns

`Promise`\<[`Worker`](Worker.md)[]\>

***

### tubes()

> **tubes**(): `Promise`\<`string`[]\>

Defined in: [src/Upstream.ts:153](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L153)

Fetches all tubes attached to the database.

#### Returns

`Promise`\<`string`[]\>

***

### stats()

> **stats**(): `Promise`\<`object`[]\>

Defined in: [src/Upstream.ts:170](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L170)

Returns statistics about tubes contents in the database.

#### Returns

`Promise`\<`object`[]\>

***

### partitions()

> **partitions**(`tube`): `Promise`\<`null` \| `number`\>

Defined in: [src/Upstream.ts:189](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L189)

Returns the number of tube partitions (or null if there is no such tube).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tube` | `string` |

#### Returns

`Promise`\<`null` \| `number`\>

***

### predicate()

> **predicate**(`tube`): `Promise`\<`null` \| `string`\>

Defined in: [src/Upstream.ts:201](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L201)

Returns the tube predicate, "" if there is no predicate, or null if there
is no such tube.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tube` | `string` |

#### Returns

`Promise`\<`null` \| `string`\>

***

### ensureExists()

> **ensureExists**(`tube`, `partitions`, `predicate`, `tables`?): `Promise`\<`void`\>

Defined in: [src/Upstream.ts:214](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L214)

Ensures the tube exists, has the provided number of partitions and
predicate (pass "" for an empty predicate), and that the provided tables
are attached to it.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tube` | `string` |
| `partitions` | `number` |
| `predicate` | `string` |
| `tables`? | (`string` \| \{ `table`: `string`; `shard`: `number`; \})[] |

#### Returns

`Promise`\<`void`\>

***

### ensureAbsent()

> **ensureAbsent**(`tube`): `Promise`\<`void`\>

Defined in: [src/Upstream.ts:258](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L258)

Ensures the tube is absent.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tube` | `string` |

#### Returns

`Promise`\<`void`\>

***

### scheduleBackfill()

> **scheduleBackfill**(`tube`, `orderCol`, `shardFrom`, `shardTo`?): `Promise`\<`number`\>

Defined in: [src/Upstream.ts:277](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L277)

Schedules backfill for shards range. The backfill command pod will then be
picked up by a Backfiller worker and exchanged with backfill pods.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tube` | `string` |
| `orderCol` | `string` |
| `shardFrom` | `number` |
| `shardTo`? | `number` |

#### Returns

`Promise`\<`number`\>

***

### podsStream()

> **podsStream**(`tube`, `partitions`, `partition`): `AsyncIterable`\<[`Pod`](../interfaces/Pod.md), `any`, `any`\>

Defined in: [src/Upstream.ts:298](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L298)

Creates an iterable to read some tube partition's pods.
- limited by reopenMaxMs in time
- limited by maxPods pods max

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tube` | `string` |
| `partitions` | `number` |
| `partition` | `number` |

#### Returns

`AsyncIterable`\<[`Pod`](../interfaces/Pod.md), `any`, `any`\>

***

### podsDelete()

> **podsDelete**(`tube`, `partitions`, `partition`, `seqs`): `Promise`\<`void`\>

Defined in: [src/Upstream.ts:371](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L371)

Deletes pods from a tube.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tube` | `string` |
| `partitions` | `number` |
| `partition` | `number` |
| `seqs` | `string`[] |

#### Returns

`Promise`\<`void`\>

***

### podsInsert()

> **podsInsert**(`timeoutMs`, `tubeOrTubes`, `queryIn`, `shard`, `op`): `Promise`\<`void`\>

Defined in: [src/Upstream.ts:414](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L414)

Bulk-inserts pods from a potentially long-running SQL query.
- The query is expected to return exactly 2 columns: the primary key
  (typically "id") and the row number (typically the result of row_number()
  window function); the names of those columns don't matter.
- Alternatively, if the query doesn't include "row_number" and "over"
  words, then it may be simple returning 1 column; the engine will try to
  modify it and inject "row_number() OVER (ORDER BY ...)" clause
  automatically (but for very complicated queries, it may fail, since it
  tries to parse "WHERE" and "ORDER BY" clauses).
- You can provide multiple tubes to insert to. In this case, the insert
  will be transactional ("all or nothing").

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeoutMs` | `number` |
| `tubeOrTubes` | `string` \| `string`[] |
| `queryIn` | \[`string`, `...unknown[]`\] |
| `shard` | `number` |
| `op` | [`Op`](../enumerations/Op.md) |

#### Returns

`Promise`\<`void`\>

***

### backfill()

> **backfill**(`timeoutMs`, `tube`, `tbl`, `orderCol`, `shard`): `Promise`\<`void`\>

Defined in: [src/Upstream.ts:478](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L478)

Calls long-running functions which inject backfill pods to a tube.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeoutMs` | `number` |
| `tube` | `string` |
| `tbl` | `string` |
| `orderCol` | `string` |
| `shard` | `number` |

#### Returns

`Promise`\<`void`\>
