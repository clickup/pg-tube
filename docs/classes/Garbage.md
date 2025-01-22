[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / Garbage

# Class: Garbage

Defined in: [src/Garbage.ts:42](https://github.com/clickup/pg-tube/blob/master/src/Garbage.ts#L42)

Allows to read some document ids back from the downstream searching for the
ones which have seq value lower than the provided.

## Constructors

### new Garbage()

> **new Garbage**(`_options`): [`Garbage`](Garbage.md)

Defined in: [src/Garbage.ts:47](https://github.com/clickup/pg-tube/blob/master/src/Garbage.ts#L47)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `_options` | [`GarbageOptions`](../interfaces/GarbageOptions.md) |

#### Returns

[`Garbage`](Garbage.md)

## Methods

### scheduleCollect()

> **scheduleCollect**(`options`, `onDone`): `void`

Defined in: [src/Garbage.ts:59](https://github.com/clickup/pg-tube/blob/master/src/Garbage.ts#L59)

Schedules garbage-collecting of a shard by fetching docs with seq value
less than the provided one and sending deletion events to the downstream.
The method is long-running and runs multiple loops of garbage fetching; it
respects time values which were used in the constructor. If it happens that
the method is called twice for the same shard, the second call will be
ignored, and onDone callback won't be called.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`GarbageScheduleCollectOptions`](../interfaces/GarbageScheduleCollectOptions.md) |
| `onDone` | () => `void` |

#### Returns

`void`

***

### throwIfError()

> **throwIfError**(): `void`

Defined in: [src/Garbage.ts:78](https://github.com/clickup/pg-tube/blob/master/src/Garbage.ts#L78)

Throws errors if they happen in background. Notice that we do not limit
parallelism for send() calls expecting that it's gonna be done by the
caller.

#### Returns

`void`

***

### end()

> **end**(): `void`

Defined in: [src/Garbage.ts:90](https://github.com/clickup/pg-tube/blob/master/src/Garbage.ts#L90)

Stops the long running loops.

#### Returns

`void`
