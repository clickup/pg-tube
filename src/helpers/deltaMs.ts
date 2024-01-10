export default function deltaMs(startTime: bigint): number {
  return Number((process.hrtime.bigint() - startTime) / BigInt(1e6));
}
