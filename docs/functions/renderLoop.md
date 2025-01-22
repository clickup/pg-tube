[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / renderLoop

# Function: renderLoop()

> **renderLoop**(`databaseOptions`, `renderHeader`?, `iterations`?): `Promise`\<`void`\>

Defined in: [src/cli.ts:174](https://github.com/clickup/pg-tube/blob/master/src/cli.ts#L174)

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `databaseOptions` | [`DatabaseOptions`](../interfaces/DatabaseOptions.md)[] | `undefined` |
| `renderHeader`? | () => `Promise`\<\{ `header`: `string`; `mainTubes`: `string`[]; \}\> | `undefined` |
| `iterations`? | `number` | `Number.MAX_SAFE_INTEGER` |

## Returns

`Promise`\<`void`\>
