import { inspect } from "util";
import compact from "lodash/compact";
import flatMap from "lodash/flatMap";
import mapValues from "lodash/mapValues";
import range from "lodash/range";
import type Database from "./Database";
import addRowNumberOver from "./helpers/addRowNumberOver";
import deltaMs from "./helpers/deltaMs";
import interpolate from "./helpers/interpolate";
import type Op from "./Op";
import type Pod from "./Pod";
import Worker from "./Worker";

type UpstreamLogEventBody =
  | {
      type: "tubes";
    }
  | {
      type: "workers";
    }
  | {
      type: "ensureExists";
      tube: string;
      partitions: number;
      predicate: string;
      tables?: number;
    }
  | {
      type: "ensureAbsent";
      tube: string;
    }
  | {
      type: "podsStream";
      tube: string;
      partitions: number;
      partition: number;
      fetchChunkSize: number;
      podCount: number;
      podIdsTotal: number;
      podIdsAvgLen: Partial<Record<Op, number>>;
      firstPodDurationMs: number | undefined;
    }
  | {
      type: "podsDelete";
      tube: string;
      partitions: number;
      partition: number;
      podCount: number;
    }
  | {
      type: "scheduleBackfill";
      tube: string;
      orderCol: string;
      shardFrom: number;
      shardTo: number;
    }
  | {
      type: "backfill" | "backfillNotice";
      tube: string;
      tbl: string;
      orderCol: string;
      shard: number;
      notice?: string;
      podIdsTotal?: number;
    }
  | {
      type: "podsInsert" | "podsInsertNotice";
      tube: string;
      query: string;
      shard: number;
      op: Op;
      notice?: string;
      podIdsTotal?: number;
    };

export type UpstreamLogEvent = {
  island: number | undefined;
  duration: number;
} & UpstreamLogEventBody;

export interface UpstreamOptions {
  /** Source database of this upstream. */
  readonly database: Database;
  /** Island number. */
  readonly island?: number;
  /** PG portal window size. */
  readonly chunkSize: number;
  /** Minimal time between tube stream reopening. If the worker wants to reopen
   * the stream earlier than this time elapsed since the last stream opening, an
   * artificial delay will be introduced to meet the delay.  */
  readonly reopenMinMs: number;
  /** If more than this time is passed since the stream is opened, the stream
   * will be closed and reopened. */
  readonly reopenMaxMs: number;
  /** If more than this number of pods is loaded from the stream, the stream
   * will be reopened. */
  readonly maxPods?: number;
  /** If true, then backfill pods won't be returned. This mode is useful to e.g.
   * turn on graceful degradation mode to temporarily reduce the load on the
   * downstream when an outage or downstream overloading is happening. */
  readonly excludeBackfill?: boolean;
  /** Allows to log different events from the upstream. */
  readonly logger?: (event: UpstreamLogEvent, seqs?: string[]) => void;
}

export default class Upstream {
  readonly database: Database;
  readonly island?: number;

  constructor(private _options: UpstreamOptions) {
    this.database = this._options.database;
    this.island = this._options.island;
  }

  get reopenMinMs(): number {
    return this._options.reopenMinMs;
  }

  /**
   * Hides details about the upstream object when debug-printing.
   */
  [inspect.custom](): string {
    return this.constructor.name;
  }

  /**
   * Creates Worker objects for all of the tubes partitions in the database. The
   * number of workers per tube is defined by the number of tube's partitions.
   */
  async workers(): Promise<Worker[]> {
    return this.wrapLogger(
      {
        type: "workers",
      },
      async () => {
        const rows = await this.database.query<[string, number]>(
          "SELECT DISTINCT tube, partitions FROM tube_list() ORDER BY 1",
        );

        return flatMap(rows, ([tube, partitions]) =>
          range(0, partitions).map(
            (partition) =>
              new Worker({ upstream: this, tube, partitions, partition }),
          ),
        );
      },
    );
  }

  /**
   * Fetches all tubes attached to the database.
   */
  async tubes(): Promise<string[]> {
    return this.wrapLogger(
      {
        type: "tubes",
      },
      async () =>
        flatMap(
          await this.database.query<string[]>(
            "SELECT DISTINCT tube FROM tube_list() ORDER BY 1",
          ),
        ),
    );
  }

  /**
   * Returns statistics about tubes contents in the database.
   */
  async stats(): Promise<Array<typeof STATS_EXAMPLE>> {
    const rows: Array<typeof STATS_EXAMPLE> = [];
    for (const row of await this.database.query<any[]>(
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; " +
        `SELECT ${Object.keys(STATS_EXAMPLE).join(", ")} FROM tube_stats()`,
    )) {
      rows.push(
        Object.fromEntries(
          Object.keys(STATS_EXAMPLE).map((k, i) => [k, row[i]] as const),
        ) as any,
      );
    }

    return rows;
  }

  /**
   * Returns the number of tube partitions (or null if there is no such tube).
   */
  async partitions(tube: string): Promise<number | null> {
    const rows = await this.database.query<[number]>(
      "SELECT DISTINCT partitions FROM tube_list() WHERE tube=$1",
      tube,
    );
    return rows.length > 0 ? rows[0][0] : null;
  }

  /**
   * Returns the tube predicate, "" if there is no predicate, or null if there
   * is no such tube.
   */
  async predicate(tube: string): Promise<string | null> {
    const rows = await this.database.query<[string | null]>(
      "SELECT DISTINCT predicate FROM tube_list() WHERE tube=$1",
      tube,
    );
    return rows.length > 0 ? rows[0][0] ?? "" : null;
  }

  /**
   * Ensures the tube exists, has the provided number of partitions and
   * predicate (pass "" for an empty predicate), and that the provided tables
   * are attached to it.
   */
  async ensureExists(
    tube: string,
    partitions: number,
    predicate: string,
    tables?: Array<{ table: string; shard: number } | string>,
  ): Promise<void> {
    if (partitions < 1 || partitions > 100) {
      throw Error(`Invalid number of partitions: ${partitions}`);
    }

    await this.wrapLogger(
      {
        type: "ensureExists",
        tube,
        partitions,
        predicate,
        tables: tables?.length,
      },
      async () => {
        await this.database.maintenanceQuery(
          "SELECT tube_ensure_exists($1, $2, $3)",
          tube,
          partitions,
          predicate,
        );
        if (tables) {
          for (const tbl of tables) {
            const { table, shard } =
              typeof tbl === "string" ? { table: tbl, shard: null } : tbl;
            await this.database.maintenanceQuery(
              "SELECT tube_table_ensure_attached($1, $2, $3)",
              tube,
              table,
              shard,
            );
          }
        }
      },
    );
  }

  /**
   * Ensures the tube is absent.
   */
  async ensureAbsent(tube: string): Promise<void> {
    await this.wrapLogger(
      {
        type: "ensureAbsent",
        tube,
      },
      async () => {
        await this.database.maintenanceQuery(
          "SELECT tube_ensure_absent($1)",
          tube,
        );
      },
    );
  }

  /**
   * Schedules backfill for shards range. The backfill command pod will then be
   * picked up by a Backfiller worker and exchanged with backfill pods.
   */
  async scheduleBackfill(
    tube: string,
    orderCol: string,
    shardFrom: number,
    shardTo?: number,
  ): Promise<number> {
    const [[num]] = await this.database.query<[number]>(
      "SELECT tube_backfill_schedule($1, $2, $3, $4)",
      tube,
      orderCol,
      shardFrom,
      shardTo ?? 0x7fffffff,
    );
    return num;
  }

  /**
   * Creates an iterable to read some tube partition's pods.
   * - limited by reopenMaxMs in time
   * - limited by maxPods pods max
   */
  async *podsStream(
    tube: string,
    partitions: number,
    partition: number,
  ): AsyncIterable<Pod> {
    const streamStart = process.hrtime.bigint();

    // See https://stackoverflow.com/a/42294524 why not cursor & FETCH ALL.
    const stream = this.database.queryStream<Pod & { ids: string | string[] }>(
      [
        "SELECT tube_pods_sql($1, $2, $3, $4)",
        tube,
        partitions,
        partition,
        !!this._options.excludeBackfill,
      ],
      this._options.chunkSize,
      `${tube}:${partition}`,
    );

    let podCount = 0;
    let podIdsTotal = 0;
    const podIdsAvgLen: Partial<Record<Op, [number, number]>> = {};
    let firstPodDurationMs: number | undefined = undefined;
    for await (const pod of stream) {
      if (podCount === 0) {
        firstPodDurationMs = deltaMs(streamStart);
      }

      if (typeof pod.ids === "string") {
        // Built-in node-postgres parseBigIntegerArray() is slow, so we use our
        // own parsing code which is way faster.
        pod.ids =
          pod.ids.length === 2
            ? []
            : pod.ids.substring(1, pod.ids.length - 1).split(",");
      }

      podCount++;
      podIdsTotal += pod.ids.length;
      const slot = (podIdsAvgLen[pod.op] ??= [0, 0]);
      slot[0]++;
      slot[1] += pod.ids.length;

      yield pod;

      if (deltaMs(streamStart) > this._options.reopenMaxMs) {
        break;
      }

      if (podCount >= (this._options.maxPods ?? Number.MAX_SAFE_INTEGER)) {
        break;
      }
    }

    this._options.logger?.({
      type: "podsStream",
      island: this._options.island,
      tube,
      partitions,
      partition,
      fetchChunkSize: this._options.chunkSize,
      duration: deltaMs(streamStart),
      podCount,
      podIdsTotal,
      podIdsAvgLen: mapValues(podIdsAvgLen, (v) => v![1] / v![0]),
      firstPodDurationMs: firstPodDurationMs ?? deltaMs(streamStart),
    });
  }

  /**
   * Deletes pods from a tube.
   */
  async podsDelete(
    tube: string,
    partitions: number,
    partition: number,
    seqs: string[],
  ): Promise<void> {
    if (seqs.length === 0) {
      return;
    }

    await this.wrapLogger(
      {
        type: "podsDelete",
        tube,
        partitions,
        partition,
        podCount: seqs.length,
      },
      async () =>
        this.database.query(
          "SELECT tube_pods_delete($1, $2, $3, $4)",
          tube,
          partitions,
          partition,
          "{" + seqs.join(",") + "}",
        ),
      seqs,
    );
  }

  /**
   * Bulk-inserts pods from a potentially long-running SQL query.
   * - The query is expected to return exactly 2 columns: the primary key
   *   (typically "id") and the row number (typically the result of row_number()
   *   window function); the names of those columns don't matter.
   * - Alternatively, if the query doesn't include "row_number" and "over"
   *   words, then it may be simple returning 1 column; the engine will try to
   *   modify it and inject "row_number() OVER (ORDER BY ...)" clause
   *   automatically (but for very complicated queries, it may fail, since it
   *   tries to parse "WHERE" and "ORDER BY" clauses).
   * - You can provide multiple tubes to insert to. In this case, the insert
   *   will be transactional ("all or nothing").
   */
  async podsInsert(
    timeoutMs: number,
    tubeOrTubes: string | string[],
    queryIn: [string, ...unknown[]],
    shard: number,
    op: Op,
  ): Promise<void> {
    const tubes = (
      typeof tubeOrTubes === "string" ? [tubeOrTubes] : tubeOrTubes
    ).join(",");
    const query = interpolate(
      addRowNumberOver(queryIn[0]),
      ...queryIn.slice(1),
    );
    let timeStart = process.hrtime.bigint();
    let lastNotice: string | undefined = undefined;
    let lastPodIdsTotal: number | undefined = undefined;
    const noticeLogger = (notice: string): void => {
      lastNotice = notice;
      lastPodIdsTotal = parseNoticePodIdsTotal(notice);
      this._options.logger?.({
        type: "podsInsertNotice",
        island: this._options.island,
        duration: deltaMs(timeStart),
        tube: tubes,
        query,
        shard,
        op,
        notice: lastNotice,
        podIdsTotal: lastPodIdsTotal,
      });
      timeStart = process.hrtime.bigint();
    };

    await this.wrapLogger(
      {
        type: "podsInsert",
        tube: tubes,
        query,
        shard,
        op,
        get notice() {
          return lastNotice;
        },
        get podIdsTotal() {
          return lastPodIdsTotal;
        },
      },
      async () =>
        this.database.slowQuery(
          noticeLogger,
          timeoutMs,
          "SELECT tube_pods_insert($1, $2, $3, $4)",
          tubes,
          query,
          shard,
          op,
        ),
    );
  }

  /**
   * Calls long-running functions which inject backfill pods to a tube.
   */
  async backfill(
    timeoutMs: number,
    tube: string,
    tbl: string,
    orderCol: string,
    shard: number,
  ): Promise<void> {
    let timeStart = process.hrtime.bigint();
    let lastNotice: string | undefined = undefined;
    let lastPodIdsTotal: number | undefined = undefined;
    const noticeLogger = (notice: string): void => {
      lastNotice = notice;
      lastPodIdsTotal = parseNoticePodIdsTotal(notice);
      this._options.logger?.({
        type: "backfillNotice",
        island: this._options.island,
        duration: deltaMs(timeStart),
        tube,
        tbl,
        orderCol,
        shard,
        notice: lastNotice,
        podIdsTotal: lastPodIdsTotal,
      });
      timeStart = process.hrtime.bigint();
    };

    await this.wrapLogger(
      {
        type: "backfill",
        tube,
        tbl,
        orderCol,
        shard,
        get notice() {
          return lastNotice;
        },
        get podIdsTotal() {
          return lastPodIdsTotal;
        },
      },
      async () => {
        const [[step1]] = await this.database.query<[string]>(
          "SELECT tube_backfill_step1()",
        );

        timeStart = process.hrtime.bigint();
        await this.database.slowQuery(
          noticeLogger,
          timeoutMs,
          "SELECT tube_backfill_step2($1)",
          `${timeoutMs - 1000} ms`,
        );

        timeStart = process.hrtime.bigint();
        await this.database.slowQuery(
          noticeLogger,
          timeoutMs,
          "SELECT tube_backfill_step3($1, $2, $3, $4, $5)",
          step1,
          tube,
          tbl,
          orderCol,
          shard,
        );
      },
    );
  }

  /**
   * Wraps some code's successful execution with a logger call.
   */
  private async wrapLogger<TRet>(
    event: UpstreamLogEventBody,
    func: () => Promise<TRet>,
    seqs?: string[],
  ): Promise<TRet> {
    const timeStart = process.hrtime.bigint();
    try {
      return await func();
    } finally {
      this._options.logger?.(
        {
          ...event,
          island: this._options.island,
          duration: deltaMs(timeStart),
        },
        seqs,
      );
    }
  }
}

const STATS_EXAMPLE = {
  tube: "",
  predicate: "",
  partition: 0,
  shards: 0,
  inc_count: "0",
  inc_min_seq: "0" as string | null,
  inc_max_seq: "0" as string | null,
  inc_min_ts: null as Date | null,
  inc_max_ts: null as Date | null,
  backfill_count: "0",
  backfill_min_seq: "0" as string | null,
  backfill_max_seq: "0" as string | null,
  backfill_min_ts: null as Date | null,
  backfill_max_ts: null as Date | null,
  control_count: "0",
};

export function parseNotice(
  notice: string,
): Partial<Record<string, string | null>> {
  return Object.fromEntries(
    compact(
      notice
        .trim()
        .replace(/\s*--.*/s, "")
        .split(/\s+/)
        .map((pair) =>
          pair.match(/^(\w+)=(.*)$/)
            ? [RegExp.$1, RegExp.$2 === "<NULL>" ? null : RegExp.$2]
            : null,
        ),
    ),
  );
}

function parseNoticePodIdsTotal(notice: string): number | undefined {
  const parsed = parseNotice(notice);
  return parsed["insert_finished"] === "t"
    ? parseInt(parsed["insert_ids"] ?? "0")
    : undefined;
}
