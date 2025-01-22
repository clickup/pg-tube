[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / DatabaseOptions

# Interface: DatabaseOptions

Defined in: [src/Database.ts:11](https://github.com/clickup/pg-tube/blob/master/src/Database.ts#L11)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="config"></a> `config` | `PoolConfig` | Node-postgres connection pool config, can use PGBouncer or other proxy. |
| <a id="directconfig"></a> `directConfig` | `PoolConfig` | A separate pool which is used by queryStream(). It must NOT use PGBouncer or other proxy and should connect to PG directly. Since queryStream() aborts connections on long-running queries sometimes as a part of its normal workflow, we should connect to PG directly. Who knows what leaks may appear in PgBouncer workflow otherwise... |
| <a id="schema"></a> `schema?` | `string` | PG schema where all library functions reside. |
| <a id="swallowederrorlogger"></a> `swallowedErrorLogger?` | (`error`: `unknown`) => `void` | If passed, it's called when we don't want to throw an error through and/or crash Node process. |
