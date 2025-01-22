[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / DownstreamOptions

# Interface: DownstreamOptions

Defined in: [src/Downstream.ts:6](https://github.com/clickup/pg-tube/blob/master/src/Downstream.ts#L6)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="batchsize"></a> `batchSize` | `number` | Maximum size of a batch to send to the downstream. |
| <a id="parallelism"></a> `parallelism` | `number` | How many batches are allowed in parallel. |
| <a id="process"></a> `process` | (`touches`: [`Touch`](Touch.md)[]) => `Promise`\<`void`\> | Called each time a batch of touches needs to be sent to the downstream. |
| <a id="count"></a> `count?` | (`ops`: `Partial`\<`Record`\<`"error"` \| [`Op`](../enumerations/Op.md) \| `"success"`, `number`\>\>) => `void` | Called after process() is called for a batch. |
