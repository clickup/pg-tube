[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / MapOfSets

# Class: MapOfSets\<TGroup, TMember\>

Defined in: [src/helpers/MapOfSets.ts:4](https://github.com/clickup/pg-tube/blob/master/src/helpers/MapOfSets.ts#L4)

A generic pattern of having a map of grouped members.

## Extends

- `Map`\<`TGroup`, `Set`\<`TMember`\>\>

## Type Parameters

| Type Parameter |
| ------ |
| `TGroup` |
| `TMember` |

## Constructors

### new MapOfSets()

> **new MapOfSets**\<`TGroup`, `TMember`\>(`entries`?): [`MapOfSets`](MapOfSets.md)\<`TGroup`, `TMember`\>

Defined in: node\_modules/typescript/lib/lib.es2015.collection.d.ts:50

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entries`? | `null` \| readonly readonly \[`TGroup`, `Set`\<`TMember`\>\][] |

#### Returns

[`MapOfSets`](MapOfSets.md)\<`TGroup`, `TMember`\>

#### Inherited from

`Map< TGroup, Set<TMember> >.constructor`

### new MapOfSets()

> **new MapOfSets**\<`TGroup`, `TMember`\>(`iterable`?): [`MapOfSets`](MapOfSets.md)\<`TGroup`, `TMember`\>

Defined in: node\_modules/typescript/lib/lib.es2015.collection.d.ts:49

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `iterable`? | `null` \| `Iterable`\<readonly \[`TGroup`, `Set`\<`TMember`\>\], `any`, `any`\> |

#### Returns

[`MapOfSets`](MapOfSets.md)\<`TGroup`, `TMember`\>

#### Inherited from

`Map< TGroup, Set<TMember> >.constructor`

## Methods

### add()

> **add**(`group`, `member`): `void`

Defined in: [src/helpers/MapOfSets.ts:8](https://github.com/clickup/pg-tube/blob/master/src/helpers/MapOfSets.ts#L8)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `group` | `TGroup` |
| `member` | `TMember` |

#### Returns

`void`
