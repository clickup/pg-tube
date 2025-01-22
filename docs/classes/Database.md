[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / Database

# Class: Database

Defined in: [src/Database.ts:31](https://github.com/clickup/pg-tube/blob/master/src/Database.ts#L31)

Represents a PG database with primitives to send queries and read a
continuous stream of rows from some query.

## Constructors

### new Database()

> **new Database**(`options`): [`Database`](Database.md)

Defined in: [src/Database.ts:40](https://github.com/clickup/pg-tube/blob/master/src/Database.ts#L40)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`DatabaseOptions`](../interfaces/DatabaseOptions.md) |

#### Returns

[`Database`](Database.md)

## Properties

| Property | Type |
| ------ | ------ |
| <a id="config"></a> `config` | `Readonly`\<`PoolConfig`\> |
| <a id="directconfig"></a> `directConfig` | `Readonly`\<`PoolConfig`\> |
| <a id="schema"></a> `schema` | `string` |

## Methods

### end()

> **end**(): `Promise`\<`void`\>

Defined in: [src/Database.ts:70](https://github.com/clickup/pg-tube/blob/master/src/Database.ts#L70)

Disconnects from the database.

#### Returns

`Promise`\<`void`\>

***

### query()

> **query**\<`TRow`\>(`query`, ...`params`): `Promise`\<`TRow`[]\>

Defined in: [src/Database.ts:80](https://github.com/clickup/pg-tube/blob/master/src/Database.ts#L80)

Sends a query to the connection pool.

#### Type Parameters

| Type Parameter |
| ------ |
| `TRow` *extends* `unknown`[] |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | `string` |
| ...`params` | `unknown`[] |

#### Returns

`Promise`\<`TRow`[]\>

***

### maintenanceQuery()

> **maintenanceQuery**\<`TRow`\>(`query`, ...`params`): `Promise`\<`TRow`[]\>

Defined in: [src/Database.ts:90](https://github.com/clickup/pg-tube/blob/master/src/Database.ts#L90)

Sends a slower maintenance query (to e.g. add/remove tubes or repartition).

#### Type Parameters

| Type Parameter |
| ------ |
| `TRow` *extends* `unknown`[] |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | `string` |
| ...`params` | `unknown`[] |

#### Returns

`Promise`\<`TRow`[]\>

***

### slowQuery()

> **slowQuery**\<`TRow`\>(`onNotice`, `timeoutMs`, `query`, ...`params`): `Promise`\<`TRow`[]\>

Defined in: [src/Database.ts:107](https://github.com/clickup/pg-tube/blob/master/src/Database.ts#L107)

Sends a potentially long-running query to the connection pool. Delivers
PG-generated notices back to the caller as they arrive (this allows to run
slow stored functions and provide their feedback as they run).

#### Type Parameters

| Type Parameter |
| ------ |
| `TRow` *extends* `unknown`[] |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `onNotice` | (`msg`) => `void` |
| `timeoutMs` | `undefined` \| `number` |
| `query` | `string` |
| ...`params` | `unknown`[] |

#### Returns

`Promise`\<`TRow`[]\>

***

### queryStream()

> **queryStream**\<`TRow`\>(`queryGen`, `batchSize`, `comment`): `AsyncIterable`\<`TRow`, `any`, `any`\>

Defined in: [src/Database.ts:155](https://github.com/clickup/pg-tube/blob/master/src/Database.ts#L155)

Sends a queryGen query, reads the responded SQL text, then executes that
SQL and returns a stream of rows.
- You MUST finalize the returned iterable, otherwise the open connection
  may leak if the caller throws between creation of the stream and calling
  "for await" on it).
- Fully supports back-pressure: if you stop reading from the stream, it
  will not overflow memory (a feature of PgQueryStream).

#### Type Parameters

| Type Parameter |
| ------ |
| `TRow` |

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `queryGen` | \[`string`, `...unknown[]`\] | `undefined` |
| `batchSize` | `number` | `100` |
| `comment` | `string` | `undefined` |

#### Returns

`AsyncIterable`\<`TRow`, `any`, `any`\>
