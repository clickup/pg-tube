[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / BackfillerOptions

# Interface: BackfillerOptions

Defined in: [src/Backfiller.ts:5](https://github.com/clickup/pg-tube/blob/master/src/Backfiller.ts#L5)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="upstream"></a> `upstream` | [`Upstream`](../classes/Upstream.md) | Upstream to operate on. |
| <a id="timeoutms"></a> `timeoutMs` | `number` | Maximum time for one backfill operation (typically takes several minutes). |
