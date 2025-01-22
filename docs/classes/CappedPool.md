[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / CappedPool

# Class: CappedPool

Defined in: [src/helpers/CappedPool.ts:10](https://github.com/clickup/pg-tube/blob/master/src/helpers/CappedPool.ts#L10)

A pool of Promises which allows to run not more than N Promises in parallel.

## Constructors

### new CappedPool()

> **new CappedPool**(`_options`): [`CappedPool`](CappedPool.md)

Defined in: [src/helpers/CappedPool.ts:16](https://github.com/clickup/pg-tube/blob/master/src/helpers/CappedPool.ts#L16)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `_options` | [`CappedPoolOptions`](../interfaces/CappedPoolOptions.md) |

#### Returns

[`CappedPool`](CappedPool.md)

## Methods

### through()

> **through**\<`T`\>(`func`): `Promise`\<`T`\>

Defined in: [src/helpers/CappedPool.ts:23](https://github.com/clickup/pg-tube/blob/master/src/helpers/CappedPool.ts#L23)

Calls a function and returns its result (or throws its exception).
Guarantees that there will be no more than `parallelism` funcs running at
the same time.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `func` | () => `Promise`\<`T`\> |

#### Returns

`Promise`\<`T`\>

***

### backPressure()

> **backPressure**(): `Promise`\<`void`\>

Defined in: [src/helpers/CappedPool.ts:40](https://github.com/clickup/pg-tube/blob/master/src/helpers/CappedPool.ts#L40)

Waits until there are no more pending (scheduled) functions.

#### Returns

`Promise`\<`void`\>

***

### drain()

> **drain**(): `Promise`\<`void`\>

Defined in: [src/helpers/CappedPool.ts:51](https://github.com/clickup/pg-tube/blob/master/src/helpers/CappedPool.ts#L51)

Makes sure there are no more inflight requests happening in the background.

#### Returns

`Promise`\<`void`\>

***

### inflight()

> **inflight**(): `number`

Defined in: [src/helpers/CappedPool.ts:62](https://github.com/clickup/pg-tube/blob/master/src/helpers/CappedPool.ts#L62)

Returns the number of functions which are currently inflight.

#### Returns

`number`

***

### addError()

> **addError**(`e`): `void`

Defined in: [src/helpers/CappedPool.ts:70](https://github.com/clickup/pg-tube/blob/master/src/helpers/CappedPool.ts#L70)

Adds an error to the pool, so the next call to any API async function will
throw it.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `e` | `unknown` |

#### Returns

`void`

***

### throwIfError()

> **throwIfError**(): `void`

Defined in: [src/helpers/CappedPool.ts:77](https://github.com/clickup/pg-tube/blob/master/src/helpers/CappedPool.ts#L77)

Throws an error if it happened in any of the scheduled functions.

#### Returns

`void`
