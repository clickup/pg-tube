#!/usr/bin/env node
import chalk from "chalk";
import flatten from "lodash/flatten";
import sum from "lodash/sum";
import minimist from "minimist";
import { table } from "table";
import type { DatabaseOptions } from "./Database";
import Database from "./Database";
import delay from "./helpers/delay";
import log from "./helpers/log";
import Op from "./Op";
import Upstream from "./Upstream";

const USAGE = [
  "Usage:",
  "  pg-tube   # shows tubes statuses",
  "  pg-tube backfill --tube={tube} --shards=1-10",
  '  pg-tube exists --tube={tube} --partitions={num} [--predicate="..."]',
];

const COLORS = [
  chalk.white,
  chalk.cyan,
  chalk.magentaBright,
  chalk.blueBright,
  chalk.green,
  chalk.yellow,
];

const COLUMNS = {
  host: {
    caption: "DB Host",
  },
  tube: {
    caption: "Tube, *Active",
    colorSource: true,
  },
  partition: {
    caption: "Partition #",
  },
  shards: {
    caption: "# of Shards",
  },
  inc_count: {
    caption: "Incr. pods",
  },
  inc_lag: {
    caption: "Incr. lag",
  },
  inc_seq: {
    caption: "Incr. min <==< max (diff) seq",
  },
  backfill_count: {
    caption: "Backfill pods",
  },
  backfill_lag: {
    caption: "Backfill lag",
  },
  backfill_seq: {
    caption: "Backfill seq",
  },
  control_count: {
    caption: "Control pods",
  },
  predicate: {
    caption: "Predicate",
  },
};

export async function main(
  argsIn: string[],
  databaseOptions?: DatabaseOptions[],
): Promise<boolean> {
  const args = minimist(argsIn, {
    string: ["tube", "order", "shards", "partitions", "predicate"],
  });

  if (!databaseOptions) {
    const hosts = (process.env["PGHOST"] || "localhost")
      .split(/[\s,;]+/)
      .filter((v) => v);
    const port = parseInt(process.env["PGPORT"] || "5432");
    const user = process.env["PGUSER"] || "";
    const password = process.env["PGPASSWORD"] || "";
    const database = process.env["PGDATABASE"] || "";
    const schema = process.env["PGSCHEMA"] || undefined;
    databaseOptions = hosts.map((host) => {
      const config = { host, port, user, password, database };
      return { config, directConfig: config, schema };
    });
  }

  if (!args._[0]) {
    await renderLoop(databaseOptions);
    return true;
  }

  if (args._[0] === "backfill") {
    if (typeof args["tube"] !== "string" || !args["tube"]) {
      throw "Please provide --tube, tube name to backfill";
    } else if (typeof args["order"] !== "string" || !args["tube"]) {
      throw "Please provide --order, column name to order backfill by";
    } else if (typeof args["shards"] !== "string" || !args["shards"]) {
      throw 'Please provide --shards, shard number or N-M interval or "all" to backfill';
    }

    const num = await scheduleBackfill(
      databaseOptions,
      args["tube"],
      args["order"],
      args["shards"],
    );

    log(`Scheduled backfill for ${num} microshard(s).`);
    await renderLoop(databaseOptions, undefined, 1);
    return true;
  }

  if (args._[0] === "pods-insert") {
    if (typeof args["tube"] !== "string" || !args["tube"]) {
      throw "Please provide --tube, tube name to insert pods";
    } else if (
      typeof args["query"] !== "string" ||
      args["query"].length === 0 ||
      !args["query"]
    ) {
      throw "Please provide --query, query to insert pods";
    } else if (typeof args["shard"] !== "number" || !args["shard"]) {
      throw "Please provide --shard, shard number to insert pods";
    }

    await podsInsert(
      databaseOptions,
      args["tube"],
      args["query"],
      args["shard"],
    );
    log(`Scheduled pods for query ${args["query"]} on shard ${args["shard"]}.`);
    return true;
  }

  if (args._[0] === "exists") {
    if (typeof args["tube"] !== "string" || !args["tube"]) {
      throw "Please provide --tube, tube name to backfill";
    } else if (
      args["partitions"] !== undefined &&
      (typeof args["partitions"] !== "string" ||
        !args["partitions"].match(/^\d+$/s))
    ) {
      throw "Invalid value in --partitions, number of partitions";
    } else if (
      args["predicate"] !== undefined &&
      typeof args["predicate"] !== "string"
    ) {
      throw "Invalid value in --predicate, tube SQL predicate expression";
    }

    await ensureExists(
      databaseOptions,
      args["tube"],
      args["partitions"] ? parseInt(args["partitions"]) : undefined,
      args["predicate"] ?? undefined,
    );

    log(`Scheduled backfill for ${args["num"]} microshard(s).`);
    await renderLoop(databaseOptions, undefined, 1);
    return true;
  }

  log(USAGE.join("\n"));
  return false;
}

export async function renderLoop(
  databaseOptions: DatabaseOptions[],
  renderHeader?: () => Promise<{ header: string; mainTubes: string[] }>,
  iterations = Number.MAX_SAFE_INTEGER,
): Promise<void> {
  const upstreams = createUpstreams(databaseOptions);
  for (let i = 0; i < iterations; i++) {
    const { header, mainTubes } = renderHeader
      ? await renderHeader()
      : { header: "", mainTubes: [] };
    const rows = flatten(
      await Promise["all"](
        upstreams.map(async (upstream) => renderDatabase(upstream, mainTubes)),
      ),
    );
    const tableStr = table(
      [Object.values(COLUMNS).map(({ caption }) => caption), ...rows],
      {
        drawHorizontalLine: (i, rowCount) =>
          i === 0 || i === 1 || i === rowCount,
      },
    );
    log(header + (header ? "\n" : "") + tableStr);
    await delay(500);
  }
}

export async function scheduleBackfill(
  databaseOptions: DatabaseOptions[],
  tube: string,
  orderCol: string,
  shards: string,
): Promise<number> {
  let shardFrom: number;
  let shardTo: number | undefined;
  if (shards === "all") {
    shardFrom = 0;
    shardTo = undefined;
  } else if (shards.match(/^(\d+)$/)) {
    shardFrom = shardTo = parseInt(RegExp.$1);
  } else if (shards.match(/^(\d+)-(\d+)$/)) {
    shardFrom = parseInt(RegExp.$1);
    shardTo = parseInt(RegExp.$2);
  } else {
    throw "Please provide --shards, shard number N or an N-M interval";
  }

  const upstreams = createUpstreams(databaseOptions);
  return sum(
    await Promise["all"](
      upstreams.map(async (upstream) =>
        upstream.scheduleBackfill(tube, orderCol, shardFrom, shardTo),
      ),
    ),
  );
}

export async function podsInsert(
  databaseOptions: DatabaseOptions[],
  tube: string,
  query: string,
  shard: number,
): Promise<number> {
  const upstreams = createUpstreams(databaseOptions);
  return sum(
    await Promise["all"](
      upstreams.map(async (upstream) =>
        upstream.podsInsert(1000 * 60 * 60, tube, [query], shard, Op.BACKFILL),
      ),
    ),
  );
}

export async function ensureExists(
  databaseOptions: DatabaseOptions[],
  tube: string,
  partitions: number | undefined,
  predicate: string | undefined,
): Promise<void> {
  for (const upstream of createUpstreams(databaseOptions)) {
    const newPartitions = partitions ?? (await upstream.partitions(tube)) ?? 1;
    const newPredicate = predicate ?? (await upstream.predicate(tube)) ?? "";
    log(
      `Ensuring ${tube} exists ` +
        `with "${newPredicate}" predicate ` +
        `and ${newPartitions} partitions ` +
        `on ${upstream.database.config.host}...`,
    );
    log.done();
    await upstream.ensureExists(tube, newPartitions, newPredicate);
  }
}

function createUpstreams(databaseOptions: DatabaseOptions[]): Upstream[] {
  return databaseOptions.map(
    (options) =>
      new Upstream({
        database: new Database({
          ...options,
          config: {
            ...options.config,
          },
        }),
        chunkSize: 1,
        reopenMinMs: 1000,
        reopenMaxMs: 10000,
      }),
  );
}

const colorsCache = new Map<string, (v: string) => string>();

async function renderDatabase(
  upstream: Upstream,
  mainTubes: string[],
): Promise<string[][]> {
  const stats = await upstream.stats();
  const common = { host: upstream.database.config.host };
  return stats.map((row) => {
    const colorSourceKey = Object.entries(COLUMNS).find(
      ([_, v]) => "colorSource" in v && v.colorSource,
    )?.[0]!;
    let color = (v: string): string => v;
    if (colorSourceKey) {
      const v = "" + row[colorSourceKey as keyof typeof row];
      if (!colorsCache.has(v)) {
        colorsCache.set(v, COLORS[colorsCache.size % COLORS.length]);
      }

      color = colorsCache.get(v)!;
    }

    return Object.entries(COLUMNS).map(([k, _info]) => {
      const data = { ...row, ...common };
      let v =
        k === "backfill_seq"
          ? renderSeq(row.backfill_min_seq, row.backfill_max_seq)
          : k === "inc_seq"
            ? renderSeq(row.inc_min_seq, row.inc_max_seq)
            : k === "backfill_lag"
              ? renderLag(row.backfill_min_ts, new Date()) // backfill lag is always relative to the current time
              : k === "inc_lag"
                ? renderLag(row.inc_min_ts, row.inc_max_ts)
                : data[k as keyof typeof data];
      if (k === "tube" && typeof v === "string" && mainTubes.includes(v)) {
        v += " *";
      }

      return color((v ?? "").toString().replace(/(^| )backfill_/g, "$1bf_"));
    });
  });
}

function renderSeq(min: string | null, max: string | null): string {
  return min && max
    ? `${min} <==< ${max} (${BigInt(max) - BigInt(min) + BigInt(1)})`
    : "-";
}

function renderLag(min: Date | null, max: Date | null): string {
  if (!min || !max) {
    return "-";
  }

  const UNITS = {
    h: 60 * 60,
    m: 60,
    s: 1,
  };

  let dt = Math.round((max.getTime() - min.getTime()) / 1000);
  const text: string[] = [];
  for (const [unit, seconds] of Object.entries(UNITS)) {
    if (dt >= seconds || seconds === 1) {
      text.push(Math.trunc(dt / seconds) + unit);
      dt = dt % seconds;
    }
  }

  return text.join(" ");
}

/**
 * A wrapper around main() to call it from a bin script.
 */
export function cli(): void {
  main(process.argv.slice(2))
    .then((success) => process.exit(success ? 0 : 1))
    .catch((e) => {
      log.done();
      log(e instanceof Error ? (e.stack ?? e.message).trim() : e);
      process.exit(1);
    });
}

if (require.main === module) {
  cli();
}
