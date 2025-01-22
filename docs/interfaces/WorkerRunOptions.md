[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / WorkerRunOptions

# Interface: WorkerRunOptions

Defined in: [src/Worker.ts:24](https://github.com/clickup/pg-tube/blob/master/src/Worker.ts#L24)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="downstream"></a> `downstream` | [`Downstream`](../classes/Downstream.md) | Consumer of the eventual consistent stream of touches loaded from the tube's partition at the upstream. |
| <a id="garbage"></a> `garbage` | [`Garbage`](../classes/Garbage.md) | Garbage collection engine. |
| <a id="backfiller"></a> `backfiller` | [`Backfiller`](../classes/Backfiller.md) | Backfill pods injection engine. |
