/**
 * A helper function which interpolates query parameters. We have to do it
 * manually, because "extended protocol" (which has native quoting and
 * parameters) is not supported along with replication protocol.
 */
export default function interpolate(query: string, ...params: any[]): string {
  return query.replace(/\$(\d+)/g, (_, n) => {
    const value = params[parseInt(n) - 1];
    if (value === null || value === undefined) {
      return "NULL";
    }

    return "'" + ("" + value).replace(/\0/g, "").replace(/'/g, "''") + "'";
  });
}
