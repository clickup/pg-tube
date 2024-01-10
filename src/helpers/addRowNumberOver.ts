/**
 * Modifies a 1-column-returning SQL query which looks like:
 * ```
 * SELECT id FROM some WHERE predicate ORDER BY field
 * ```
 * to:
 * ```
 * SELECT id, row_number() OVER (ORDER BY field)
 * FROM some WHERE predicate ORDER BY field
 * ```
 *
 * If the query already looks like it, just returns it.
 */
export default function addRowNumberOver(sql: string): string {
  if (sql.match(/\brow_number\s*\(\s*\)\s+OVER\b/is)) {
    return sql;
  }

  if (sql.match(/^\s*WITH\b/is)) {
    throw Error(
      `To make WITH clause work, you must also include "row_number OVER (...)" clause: ${sql}`
    );
  }

  if (
    sql.match(
      /^(.*?)(\s*\bFROM\b(?:.*)\bORDER\s+BY\b\s*(.*?)\s*(?:\bLIMIT\b.*)?)$/is
    )
  ) {
    return `${RegExp.$1}, row_number() OVER (ORDER BY ${RegExp.$3})${RegExp.$2}`;
  }

  if (sql.match(/^(.*?)(\s*\bFROM\b.*)$/is)) {
    return `${RegExp.$1}, row_number() OVER ()${RegExp.$2}`;
  }

  throw Error(
    `Cannot parse SQL query to extract FROM and optional ORDER BY clause: ${sql}`
  );
}
