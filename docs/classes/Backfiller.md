[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / Backfiller

# Class: Backfiller

Defined in: [src/Backfiller.ts:23](https://github.com/clickup/pg-tube/blob/master/src/Backfiller.ts#L23)

Schedules slow-running backfill injection for a particular tube/shard with
limited parallelism (not more than one backfill injection per partition).

## Constructors

### new Backfiller()

> **new Backfiller**(`_options`): [`Backfiller`](Backfiller.md)

Defined in: [src/Backfiller.ts:27](https://github.com/clickup/pg-tube/blob/master/src/Backfiller.ts#L27)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `_options` | [`BackfillerOptions`](../interfaces/BackfillerOptions.md) |

#### Returns

[`Backfiller`](Backfiller.md)

## Methods

### scheduleBackfill()

> **scheduleBackfill**(`options`, `onDone`): `void`

Defined in: [src/Backfiller.ts:34](https://github.com/clickup/pg-tube/blob/master/src/Backfiller.ts#L34)

Schedules backfill-pods injection to a shard.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`BackfillerScheduleCollectOptions`](../interfaces/BackfillerScheduleCollectOptions.md) |
| `onDone` | () => `void` |

#### Returns

`void`

***

### throwIfError()

> **throwIfError**(): `void`

Defined in: [src/Backfiller.ts:51](https://github.com/clickup/pg-tube/blob/master/src/Backfiller.ts#L51)

Throws errors if they happen in background.

#### Returns

`void`
