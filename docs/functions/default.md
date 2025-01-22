[**@time-loop/pg-tube**](../README.md)

***

[@time-loop/pg-tube](../globals.md) / default

# Function: default()

> **default**(...`text`): `void`

Defined in: [src/helpers/log.ts:3](https://github.com/clickup/pg-tube/blob/master/src/helpers/log.ts#L3)

Log to `stdout` by overwriting the previous output in the terminal.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`text` | `string`[] | The text to log to `stdout`. |

## Returns

`void`

## Example

```
import logUpdate = require('log-update');

const frames = ['-', '\\', '|', '/'];
let i = 0;

setInterval(() => {
	const frame = frames[i = ++i % frames.length];

	logUpdate(
`
		♥♥
${frame} unicorns ${frame}
		♥♥
`
	);
}, 80);
```
