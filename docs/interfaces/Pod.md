[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / Pod

# Interface: Pod

Defined in: [src/Pod.ts:6](https://github.com/clickup/pg-tube/blob/master/src/Pod.ts#L6)

A minimal piece of stuff which travels through a tube.

## Properties

| Property | Type |
| ------ | ------ |
| <a id="seq"></a> `seq` | `string` |
| <a id="op"></a> `op` | [`Op`](../enumerations/Op.md) |
| <a id="shard"></a> `shard` | `number` |
| <a id="ids"></a> `ids` | `string`[] |
| <a id="payload"></a> `payload` | `null` \| \{ `type`: `"backfill_start"`; `start_seq`: `string`; \} \| \{ `type`: `"backfill_end"`; `start_seq`: `string`; \} \| \{ `type`: `"backfill_schedule"`; `tbl`: `string`; `order_col`: `string`; \} |
