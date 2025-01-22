[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / WorkerOptions

# Interface: WorkerOptions

Defined in: [src/Worker.ts:13](https://github.com/clickup/pg-tube/blob/master/src/Worker.ts#L13)

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="upstream"></a> `upstream` | [`Upstream`](../classes/Upstream.md) | Source for the worker. |
| <a id="tube"></a> `tube` | `string` | Tube which this worker is processing. |
| <a id="partitions"></a> `partitions` | `number` | Number of partitions in this tube. |
| <a id="partition"></a> `partition` | `number` | The partition this worker is responsible for. |
