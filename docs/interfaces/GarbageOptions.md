[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / GarbageOptions

# Interface: GarbageOptions

Defined in: [src/Garbage.ts:10](https://github.com/clickup/pg-tube/blob/master/src/Garbage.ts#L10)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="fetch"></a> `fetch` | (`shard`: `number`, `maxSeq`: `string`, `cursor`: `undefined` \| `string`) => `Promise`\<\{ `ids`: `string`[]; `cursor`: `string`; \}\> | Returns document ids from the destination for which seq value is lower than the provided one. This callback is being called for some time after we receive a "backfill finished" signal. |
| <a id="send"></a> `send` | (`touches`: [`Touch`](Touch.md)[]) => `Promise`\<`void`\> | Sends a deletion touch event to a downstream. |
| <a id="parallelism"></a> `parallelism` | `number` | How many parallel fetch() calls are allowed. |
| <a id="doneintervalms"></a> `doneIntervalMs?` | `number` | When fetch() starts returning empty results, it's still called time to time up to this number of milliseconds before assuming we're done. Allows the downstream to have some lag and not be fully read-after-write complaint (e.g. Elasticsearch doesn't return the documents immediately after they're sent to indexing). |
| <a id="refetchintervalms"></a> `refetchIntervalMs?` | `number` | How often to recheck for new garbage after fetch() returned empty. |
