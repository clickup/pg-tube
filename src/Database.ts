import { inspect } from "util";
import compact from "lodash/compact";
import type { PoolConfig, QueryResult } from "pg";
import { Pool } from "pg";
import PgQueryStream from "pg-query-stream";
import escapeIdent from "./helpers/escapeIdent";
import interpolate from "./helpers/interpolate";

const IDLE_TIMEOUT_MS = 3000;

export interface DatabaseOptions {
  /** Node-postgres connection pool config, can use PGBouncer or other proxy. */
  config: PoolConfig;
  /** A separate pool which is used by queryStream(). It must NOT use PGBouncer
   * or other proxy and should connect to PG directly. Since queryStream()
   * aborts connections on long-running queries sometimes as a part of its
   * normal workflow, we should connect to PG directly. Who knows what leaks may
   * appear in PgBouncer workflow otherwise... */
  directConfig: PoolConfig;
  /** PG schema where all library functions reside. */
  schema?: string;
  /** If passed, it's called when we don't want to throw an error through and/or
   * crash Node process. */
  swallowedErrorLogger?: (error: unknown) => void;
}

/**
 * Represents a PG database with primitives to send queries and read a
 * continuous stream of rows from some query.
 */
export default class Database {
  private _pool: Pool;
  private _directPool: Pool;
  private _statementTimeoutMs: number;
  private _statementTimeoutMsMaintenance: number;
  readonly config: Readonly<PoolConfig>;
  readonly directConfig: Readonly<PoolConfig>;
  readonly schema: string;

  constructor(options: DatabaseOptions) {
    this._statementTimeoutMs = options.config.statement_timeout || 10000;
    this._statementTimeoutMsMaintenance = Math.round(
      this._statementTimeoutMs * 1.5,
    );
    this.config = {
      idleTimeoutMillis: IDLE_TIMEOUT_MS,
      ...options.config,
      statement_timeout: undefined,
      application_name: options.config.application_name ?? "pg-tube",
    };
    this.directConfig = {
      idleTimeoutMillis: IDLE_TIMEOUT_MS,
      ...options.directConfig,
      statement_timeout: undefined,
      application_name:
        options.directConfig.application_name ?? "pg-tube/direct",
    };
    this.schema = options.schema ?? "tube";
    this._pool = new Pool(this.config);
    this._directPool = new Pool(this.directConfig);
    if (options.swallowedErrorLogger) {
      this._pool.on("error", (e) => options.swallowedErrorLogger!(e));
      this._directPool.on("error", (e) => options.swallowedErrorLogger!(e));
    }
  }

  /**
   * Disconnects from the database.
   */
  async end(): Promise<void> {
    await Promise["all"]([
      !(this._pool as any).ending && this._pool.end(),
      !(this._directPool as any).ending && this._directPool.end(),
    ]);
  }

  /**
   * Sends a query to the connection pool.
   */
  async query<TRow extends unknown[]>(
    query: string,
    ...params: unknown[]
  ): Promise<TRow[]> {
    return this.slowQuery(() => {}, this._statementTimeoutMs, query, ...params);
  }

  /**
   * Sends a slower maintenance query (to e.g. add/remove tubes or repartition).
   */
  async maintenanceQuery<TRow extends unknown[]>(
    query: string,
    ...params: unknown[]
  ): Promise<TRow[]> {
    return this.slowQuery(
      () => {},
      this._statementTimeoutMsMaintenance,
      query,
      ...params,
    );
  }

  /**
   * Sends a potentially long-running query to the connection pool. Delivers
   * PG-generated notices back to the caller as they arrive (this allows to run
   * slow stored functions and provide their feedback as they run).
   */
  async slowQuery<TRow extends unknown[]>(
    onNotice: (msg: string) => void,
    timeoutMs: number | undefined,
    query: string,
    ...params: unknown[]
  ): Promise<TRow[]> {
    const listener = (notice: { message?: string }): void => {
      notice.message && onNotice(notice.message);
    };

    const client = await this._pool.connect();
    client.on("notice", listener);
    try {
      const queries = compact([
        `SET LOCAL search_path TO ${escapeIdent(this.schema)}`,
        timeoutMs &&
          interpolate("SET LOCAL statement_timeout TO $1", timeoutMs),
        interpolate(query, ...params),
      ]);
      const res: QueryResult[] = (await client.query<TRow>({
        rowMode: "array",
        text: queries.join("; "),
      })) as any;
      return res[res.length - 1].rows;
    } catch (e: any) {
      if (e && typeof e.stack === "string") {
        e.stack =
          e.stack.trimRight() +
          "\n" +
          inspect({ query, params }, { compact: true });
      }

      throw e;
    } finally {
      client.off("notice", listener);
      client.release();
    }
  }

  /**
   * Sends a queryGen query, reads the responded SQL text, then executes that
   * SQL and returns a stream of rows.
   * - You MUST finalize the returned iterable, otherwise the open connection
   *   may leak if the caller throws between creation of the stream and calling
   *   "for await" on it).
   * - Fully supports back-pressure: if you stop reading from the stream, it
   *   will not overflow memory (a feature of PgQueryStream).
   */
  async *queryStream<TRow>(
    queryGen: [string, ...unknown[]],
    batchSize = 100,
    comment: string,
  ): AsyncIterable<TRow> {
    const sqlCommentPrefix = `/*${comment}*/ `;
    const client = await this._directPool.connect();
    try {
      const queries = [
        sqlCommentPrefix + "BEGIN",
        `SET LOCAL search_path TO ${escapeIdent(this.schema)}`,
        "SET LOCAL enable_bitmapscan TO off",
        "SET LOCAL enable_seqscan TO off",
        interpolate(...queryGen),
      ];
      const res = (await client.query({
        rowMode: "array",
        text: queries.join("; "),
      })) as any;
      const sql: string = res[queries.length - 1].rows[0][0];
      const stream = client.query(
        new PgQueryStream(sqlCommentPrefix + sql, undefined, { batchSize }),
      );
      let consumedFully = false;
      try {
        yield* stream;
        consumedFully = true;
      } catch (e: any) {
        if (e && typeof e.stack === "string") {
          e.stack =
            e.stack.trimRight() +
            "\n" +
            inspect(
              { queries, sql: sql.trim().replace(/\s+/gs, " ") },
              { compact: true },
            );
        }

        throw e;
      } finally {
        if (!consumedFully) {
          // This closes the connection which still holds the long running query.
          await (client as any).end();
        }
      }
    } finally {
      await client.query(sqlCommentPrefix + "ROLLBACK").catch(() => {});
      client.release();
    }
  }
}
