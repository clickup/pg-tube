[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / SeqTracker

# Class: SeqTracker

Defined in: [src/helpers/SeqTracker.ts:18](https://github.com/clickup/pg-tube/blob/master/src/helpers/SeqTracker.ts#L18)

Tracks which ids are used in which pods seq. Once a release of some id causes
a pod to become empty, seq of this pod is added to the list available via
extractEmptySeqs() call.

The reason of having this structure is that touches often de-duplicate with
each other, either within the same or across different transactions. This
especially happens when there is a change in multiple interconnected objects
in the database, each triggering a touch event for some common parent object.
We don't want to track individual touch events and group them; instead, we
track when they disappear during de-duplication and let SeqTracker remember
touch<->pod connection and a pod "busy" status.

## Constructors

### new SeqTracker()

> **new SeqTracker**(): [`SeqTracker`](SeqTracker.md)

#### Returns

[`SeqTracker`](SeqTracker.md)

## Methods

### \[custom\]()

> **\[custom\]**(): `string`

Defined in: [src/helpers/SeqTracker.ts:22](https://github.com/clickup/pg-tube/blob/master/src/helpers/SeqTracker.ts#L22)

#### Returns

`string`

***

### acquire()

> **acquire**(`__namedParameters`): `void`

Defined in: [src/helpers/SeqTracker.ts:32](https://github.com/clickup/pg-tube/blob/master/src/helpers/SeqTracker.ts#L32)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | [`OwningFifoTouch`](../interfaces/OwningFifoTouch.md) |

#### Returns

`void`

***

### release()

> **release**(`__namedParameters`): `void`

Defined in: [src/helpers/SeqTracker.ts:40](https://github.com/clickup/pg-tube/blob/master/src/helpers/SeqTracker.ts#L40)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | [`OwningFifoTouch`](../interfaces/OwningFifoTouch.md) |

#### Returns

`void`

***

### addEmptySeq()

> **addEmptySeq**(`seq`): `void`

Defined in: [src/helpers/SeqTracker.ts:56](https://github.com/clickup/pg-tube/blob/master/src/helpers/SeqTracker.ts#L56)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `seq` | `string` |

#### Returns

`void`

***

### extractEmptySeqs()

> **extractEmptySeqs**(): `string`[]

Defined in: [src/helpers/SeqTracker.ts:60](https://github.com/clickup/pg-tube/blob/master/src/helpers/SeqTracker.ts#L60)

#### Returns

`string`[]
