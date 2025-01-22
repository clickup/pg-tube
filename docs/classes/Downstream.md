[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / Downstream

# Class: Downstream

Defined in: [src/Downstream.ts:22](https://github.com/clickup/pg-tube/blob/master/src/Downstream.ts#L22)

Takes care of not running too many process() functions at the same time.

## Constructors

### new Downstream()

> **new Downstream**(`_options`): [`Downstream`](Downstream.md)

Defined in: [src/Downstream.ts:25](https://github.com/clickup/pg-tube/blob/master/src/Downstream.ts#L25)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `_options` | [`DownstreamOptions`](../interfaces/DownstreamOptions.md) |

#### Returns

[`Downstream`](Downstream.md)

## Accessors

### batchSize

#### Get Signature

> **get** **batchSize**(): `number`

Defined in: [src/Downstream.ts:29](https://github.com/clickup/pg-tube/blob/master/src/Downstream.ts#L29)

##### Returns

`number`

## Methods

### send()

> **send**(`touches`): `Promise`\<`void`\>

Defined in: [src/Downstream.ts:33](https://github.com/clickup/pg-tube/blob/master/src/Downstream.ts#L33)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `touches` | [`Touch`](../interfaces/Touch.md)[] |

#### Returns

`Promise`\<`void`\>

***

### backPressure()

> **backPressure**(): `Promise`\<`void`\>

Defined in: [src/Downstream.ts:37](https://github.com/clickup/pg-tube/blob/master/src/Downstream.ts#L37)

#### Returns

`Promise`\<`void`\>

***

### drain()

> **drain**(): `Promise`\<`void`\>

Defined in: [src/Downstream.ts:41](https://github.com/clickup/pg-tube/blob/master/src/Downstream.ts#L41)

#### Returns

`Promise`\<`void`\>

***

### inflight()

> **inflight**(): `number`

Defined in: [src/Downstream.ts:45](https://github.com/clickup/pg-tube/blob/master/src/Downstream.ts#L45)

#### Returns

`number`
