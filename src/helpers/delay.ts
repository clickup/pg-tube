export default async function delay(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}
