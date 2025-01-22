[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / interpolate

# Function: interpolate()

> **interpolate**(`query`, ...`params`): `string`

Defined in: [src/helpers/interpolate.ts:6](https://github.com/clickup/pg-tube/blob/master/src/helpers/interpolate.ts#L6)

A helper function which interpolates query parameters. We have to do it
manually, because "extended protocol" (which has native quoting and
parameters) is not supported along with replication protocol.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `query` | `string` |
| ...`params` | `any`[] |

## Returns

`string`
