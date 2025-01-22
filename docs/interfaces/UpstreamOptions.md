[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / UpstreamOptions

# Interface: UpstreamOptions

Defined in: [src/Upstream.ts:81](https://github.com/clickup/pg-tube/blob/master/src/Upstream.ts#L81)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="database"></a> `database` | [`Database`](../classes/Database.md) | Source database of this upstream. |
| <a id="island"></a> `island?` | `number` | Island number. |
| <a id="chunksize"></a> `chunkSize` | `number` | PG portal window size. |
| <a id="reopenminms"></a> `reopenMinMs` | `number` | Minimal time between tube stream reopening. If the worker wants to reopen the stream earlier than this time elapsed since the last stream opening, an artificial delay will be introduced to meet the delay. |
| <a id="reopenmaxms"></a> `reopenMaxMs` | `number` | If more than this time is passed since the stream is opened, the stream will be closed and reopened. |
| <a id="maxpods"></a> `maxPods?` | `number` | If more than this number of pods is loaded from the stream, the stream will be reopened. |
| <a id="excludebackfill"></a> `excludeBackfill?` | `boolean` | If true, then backfill pods won't be returned. This mode is useful to e.g. turn on graceful degradation mode to temporarily reduce the load on the downstream when an outage or downstream overloading is happening. |
| <a id="logger"></a> `logger?` | (`event`: [`UpstreamLogEvent`](../type-aliases/UpstreamLogEvent.md), `seqs`?: `string`[]) => `void` | Allows to log different events from the upstream. |
