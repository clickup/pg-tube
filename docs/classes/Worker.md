[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / Worker

# Class: Worker

Defined in: [src/Worker.ts:38](https://github.com/clickup/pg-tube/blob/master/src/Worker.ts#L38)

Worker is a loop which processes a particular partition of a tube. There is
one worker per partition per tube running.

## Constructors

### new Worker()

> **new Worker**(`options`): [`Worker`](Worker.md)

Defined in: [src/Worker.ts:71](https://github.com/clickup/pg-tube/blob/master/src/Worker.ts#L71)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`WorkerOptions`](../interfaces/WorkerOptions.md) |

#### Returns

[`Worker`](Worker.md)

## Properties

| Property | Type |
| ------ | ------ |
| <a id="upstream"></a> `upstream` | [`Upstream`](Upstream.md) |
| <a id="tube"></a> `tube` | `string` |
| <a id="partitions"></a> `partitions` | `number` |
| <a id="partition"></a> `partition` | `number` |

## Methods

### run()

> **run**(`options`): `AsyncGenerator`\<`"drain"` \| [`Pod`](../interfaces/Pod.md), `void`, `any`\>

Defined in: [src/Worker.ts:83](https://github.com/clickup/pg-tube/blob/master/src/Worker.ts#L83)

Runs a processing loop for this partition of a tube. Guarantees that there
will be no concurrent downstream requests for the same id; all the requests
for the same id will serialize.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`WorkerRunOptions`](../interfaces/WorkerRunOptions.md) |

#### Returns

`AsyncGenerator`\<`"drain"` \| [`Pod`](../interfaces/Pod.md), `void`, `any`\>
