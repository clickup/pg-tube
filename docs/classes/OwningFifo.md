[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / OwningFifo

# Class: OwningFifo\<TTouch\>

Defined in: [src/helpers/OwningFifo.ts:15](https://github.com/clickup/pg-tube/blob/master/src/helpers/OwningFifo.ts#L15)

Similar to a set, but de-duplicates touches by their id (i.e. when trying to
override an existing touch with a new touch, the new touch is just ignored).
This structure owns its members, so an existing member can only be moved from
one fifo to another (or marked as consumed).

## Type Parameters

| Type Parameter |
| ------ |
| `TTouch` *extends* [`OwningFifoTouch`](../interfaces/OwningFifoTouch.md) |

## Constructors

### new OwningFifo()

> **new OwningFifo**\<`TTouch`\>(`_tracker`): [`OwningFifo`](OwningFifo.md)\<`TTouch`\>

Defined in: [src/helpers/OwningFifo.ts:18](https://github.com/clickup/pg-tube/blob/master/src/helpers/OwningFifo.ts#L18)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `_tracker` | [`SeqTracker`](SeqTracker.md) |

#### Returns

[`OwningFifo`](OwningFifo.md)\<`TTouch`\>

## Properties

| Property | Type |
| ------ | ------ |
| <a id="_map"></a> `_map` | `Map`\<`string`, `TTouch`\> |
| <a id="_tracker-1"></a> `_tracker` | [`SeqTracker`](SeqTracker.md) |

## Accessors

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: [src/helpers/OwningFifo.ts:20](https://github.com/clickup/pg-tube/blob/master/src/helpers/OwningFifo.ts#L20)

##### Returns

`number`

## Methods

### createInitial()

> **createInitial**(`touch`): `void`

Defined in: [src/helpers/OwningFifo.ts:24](https://github.com/clickup/pg-tube/blob/master/src/helpers/OwningFifo.ts#L24)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `touch` | `TTouch` |

#### Returns

`void`

***

### get()

> **get**(`__namedParameters`): `undefined` \| `TTouch`

Defined in: [src/helpers/OwningFifo.ts:33](https://github.com/clickup/pg-tube/blob/master/src/helpers/OwningFifo.ts#L33)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | \{ `id`: `string`; \} |
| `__namedParameters.id` | `string` |

#### Returns

`undefined` \| `TTouch`

***

### \[iterator\]()

> **\[iterator\]**(): `IterableIterator`\<`TTouch`, `any`, `any`\>

Defined in: [src/helpers/OwningFifo.ts:37](https://github.com/clickup/pg-tube/blob/master/src/helpers/OwningFifo.ts#L37)

#### Returns

`IterableIterator`\<`TTouch`, `any`, `any`\>

***

### \[custom\]()

> **\[custom\]**(): `string`

Defined in: [src/helpers/OwningFifo.ts:41](https://github.com/clickup/pg-tube/blob/master/src/helpers/OwningFifo.ts#L41)

#### Returns

`string`

***

### moveFrom()

> **moveFrom**(`src`, `__namedParameters`): `void`

Defined in: [src/helpers/OwningFifo.ts:49](https://github.com/clickup/pg-tube/blob/master/src/helpers/OwningFifo.ts#L49)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `src` | [`OwningFifo`](OwningFifo.md)\<`TTouch`\> |
| `__namedParameters` | `TTouch` |

#### Returns

`void`

***

### markConsumed()

> **markConsumed**(`__namedParameters`): `void`

Defined in: [src/helpers/OwningFifo.ts:68](https://github.com/clickup/pg-tube/blob/master/src/helpers/OwningFifo.ts#L68)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | `TTouch` |

#### Returns

`void`
