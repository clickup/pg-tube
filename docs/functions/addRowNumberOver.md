[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / addRowNumberOver

# Function: addRowNumberOver()

> **addRowNumberOver**(`sql`): `string`

Defined in: [src/helpers/addRowNumberOver.ts:14](https://github.com/clickup/pg-tube/blob/master/src/helpers/addRowNumberOver.ts#L14)

Modifies a 1-column-returning SQL query which looks like:
```
SELECT id FROM some WHERE predicate ORDER BY field
```
to:
```
SELECT id, row_number() OVER (ORDER BY field)
FROM some WHERE predicate ORDER BY field
```

If the query already looks like it, just returns it.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `sql` | `string` |

## Returns

`string`
