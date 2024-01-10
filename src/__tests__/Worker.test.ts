import first from "lodash/first";
import flatten from "lodash/flatten";
import range from "lodash/range";
import Backfiller from "../Backfiller";
import Database from "../Database";
import Downstream from "../Downstream";
import Garbage from "../Garbage";
import delay from "../helpers/delay";
import interpolate from "../helpers/interpolate";
import Op from "../Op";
import type Touch from "../Touch";
import Upstream from "../Upstream";
import type Worker from "../Worker";
import runPsql from "./helpers/runPsql";

const SHARD = 1;
const SCHEMA = `test_pg_tube_worker${SHARD}`;
const TUBE = "mytube";
const TABLE = "mytable";

let activeGen: AsyncGenerator<unknown, void>;
let activeDatabase: Database;

async function setUp({
  batchSize,
  batchParallelism,
  streamChunkSize = 1,
  streamMaxPods,
  pods,
  backfill,
  predicate,
}: {
  batchSize: number;
  batchParallelism: number;
  streamChunkSize?: number;
  streamMaxPods?: number;
  pods: number[][];
  backfill?: number;
  predicate?: string;
}): Promise<{
  worker: Worker;
  gen: ReturnType<Worker["run"]>;
  touches: Touch[][];
  processHooks: Array<() => unknown | Promise<unknown>>;
}> {
  runPsql(`
    BEGIN;

    DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;
    CREATE SCHEMA ${SCHEMA};
    SET LOCAL statement_timeout TO 30000;
    SET LOCAL search_path TO ${SCHEMA};
    \\i ${__dirname}/../../sql/pg-tube-up.sql

    CREATE TABLE ${TABLE}(id bigint, s text);
    INSERT INTO ${TABLE}
      SELECT s, s::text FROM generate_series(1, ${backfill || 1}) s;
    SELECT tube_ensure_exists('${TUBE}', 1, ${interpolate("$1", predicate)});
    SELECT tube_table_ensure_attached('${TUBE}', '${TABLE}');

    ${pods
      .slice(0, Math.floor(pods.length / 2))
      .map((ids) => `SELECT ${TABLE}_touch('{${ids.join(",")}}');`)
      .join("\n")}

    ${
      backfill
        ? `
            SELECT tube_backfill_step1() \\gset
            SELECT tube_backfill_step2();
            SELECT tube_backfill_step3(:'tube_backfill_step1', '${TUBE}', '${TABLE}', 'id', ${SHARD});
          `
        : ""
    }

    ${pods
      .slice(Math.floor(pods.length / 2))
      .map((ids) => `SELECT ${TABLE}_touch('{${ids.join(",")}}');`)
      .join("\n")}
    
    COMMIT;
  `);

  const config = {
    host: process.env.PGHOST || process.env.DB_HOST_DEFAULT,
    port: parseInt(process.env.PGPORT || process.env.DB_PORT || "5432"),
    database: process.env.PGDATABASE || process.env.DB_DATABASE,
    user: process.env.PGUSER || process.env.DB_USER,
    password: process.env.PGPASSWORD || process.env.DB_PASS,
  };
  const database = new Database({
    config,
    directConfig: config,
    schema: SCHEMA,
  });
  const upstream = new Upstream({
    database,
    chunkSize: streamChunkSize,
    reopenMinMs: 1,
    reopenMaxMs: 60000,
    maxPods: streamMaxPods,
  });
  const touches: Touch[][] = [];
  const processHooks: Array<() => unknown> = [];
  const downstream = new Downstream({
    batchSize,
    parallelism: batchParallelism,
    process: async (batch) => {
      await delay(10);
      await processHooks.shift()?.();
      touches.push(batch);
    },
  });
  const garbage = new Garbage({
    fetch: async () => ({ ids: [] }),
    send: downstream.send.bind(downstream),
    parallelism: 1,
  });
  const backfiller = new Backfiller({
    upstream,
    timeoutMs: 20000,
  });
  const worker = first(await upstream.workers())!;
  const gen = worker.run({
    downstream,
    garbage,
    backfiller,
  });

  activeDatabase = database;
  activeGen = gen;

  return { worker, gen, touches, processHooks };
}

afterEach(async () => {
  activeGen && (await activeGen.return());
  activeDatabase && (await activeDatabase.end());
});

it("should load and process the entire stream", async () => {
  const { gen, touches } = await setUp({
    batchSize: 2,
    batchParallelism: 0,
    pods: [
      [11, 22, 33],
      [44, 55, 66, 77],
    ],
  });

  expect((await gen.next()).value).toMatchObject({ seq: "1" });
  expect(touches.splice(0)).toMatchObject([[{ id: "11" }, { id: "22" }]]);

  expect((await gen.next()).value).toMatchObject({ seq: "2" });
  expect(touches.splice(0)).toMatchObject([
    [{ id: "33", seq: "1" }, { id: "44" }],
    [{ id: "55", seq: "2" }, { id: "66" }],
  ]);

  expect((await gen.next()).value).toEqual("drain");
  expect(touches.splice(0)).toMatchObject([[{ id: "77", seq: "2" }]]);
});

it("should dedup same-id touches", async () => {
  const { gen, touches } = await setUp({
    batchSize: 3,
    batchParallelism: 0,
    pods: [
      [11, 22],
      [22, 55, 66, 77],
    ],
  });

  expect((await gen.next()).value).toMatchObject({ seq: "1" });
  expect(touches.splice(0)).toMatchObject([]);

  expect((await gen.next()).value).toMatchObject({ seq: "2" });
  expect(touches.splice(0)).toMatchObject([
    [
      { id: "11", seq: "1" },
      { id: "22", seq: "1" },
      { id: "55", seq: "2" },
    ],
  ]);

  expect((await gen.next()).value).toEqual("drain");
  expect(touches.splice(0)).toMatchObject([
    [
      { id: "66", seq: "2" },
      { id: "77", seq: "2" },
    ],
  ]);
});

it("should correctly close the stream when reaching size limit", async () => {
  const { gen, touches } = await setUp({
    streamChunkSize: 100,
    batchSize: 2,
    batchParallelism: 0,
    streamMaxPods: 1,
    pods: range(1, 2000).map((i) => [i * 10, i * 10 + 1, i * 10 + 2]),
  });

  expect((await gen.next()).value).toMatchObject({ seq: "1" });
  expect(touches.splice(0)).toMatchObject([[{ id: "10" }, { id: "11" }]]);

  expect((await gen.next()).value).toEqual("drain");
  expect(touches.splice(0)).toMatchObject([[{ id: "12", seq: "1" }]]);

  expect((await gen.next()).value).toMatchObject({ seq: "2" });
});

it("should drain when reaching stream size limit", async () => {
  const { gen, touches } = await setUp({
    batchSize: 2,
    batchParallelism: 0,
    streamMaxPods: 1,
    pods: [
      [11, 22, 33],
      [44, 55, 66, 77, 88],
    ],
  });

  expect((await gen.next()).value).toMatchObject({ seq: "1" });
  expect(touches.splice(0)).toMatchObject([[{ id: "11" }, { id: "22" }]]);

  expect((await gen.next()).value).toEqual("drain");
  expect(touches.splice(0)).toMatchObject([[{ id: "33", seq: "1" }]]);

  expect((await gen.next()).value).toMatchObject({ seq: "2" });
  expect(touches.splice(0)).toMatchObject([
    [{ id: "44" }, { id: "55" }],
    [{ id: "66" }, { id: "77" }],
  ]);

  expect((await gen.next()).value).toEqual("drain");
  expect(touches.splice(0)).toMatchObject([[{ id: "88" }]]);
});

it("should process backfill", async () => {
  const { worker, gen, touches } = await setUp({
    streamChunkSize: 100,
    batchSize: 4,
    batchParallelism: 0,
    pods: [
      [11, 22, 33, 44],
      [55, 66, 77],
    ],
    backfill: 17,
    predicate: "s <> '10'",
  });

  await worker.upstream.backfill(40000, TUBE, TABLE, "id", SHARD);

  while (true) {
    if ((await gen.next()).value === "drain") {
      break;
    }
  }

  expect(touches).toHaveLength(6);
  expect(
    flatten(touches)
      .filter(({ op }) => op === Op.BACKFILL)
      .map(({ id }) => id)
  ).toEqual([
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9", // no 10 since filtered by predicate
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
  ]);
});

it("should recover on processing errors", async () => {
  const {
    gen,
    touches,
    processHooks: processPromises,
  } = await setUp({
    batchSize: 1,
    batchParallelism: 3,
    pods: [[11, 22, 33]],
  });
  processPromises.push(() => {});
  processPromises.push(() => {
    throw Error("process() threw");
  });
  processPromises.push(() => {});
  try {
    for await (const _ of gen) {
      if (touches.length >= 3) {
        break;
      }
    }

    throw Error(
      "Expecting process() to throw through, but the worker loop succeeded"
    );
  } catch (e: any) {
    if (!e.message.includes("process() threw")) {
      throw e;
    }
  }

  expect(touches).toHaveLength(2);
});
