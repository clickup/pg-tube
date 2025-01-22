import { inspect } from "util";
import last from "lodash/last";
import sumBy from "lodash/sumBy";
import { Client } from "pg";
import waitForExpect from "wait-for-expect";
import Database from "../Database";
import Op from "../Op";
import type { UpstreamLogEvent } from "../Upstream";
import Upstream, { parseNotice } from "../Upstream";
import runPsql from "./helpers/runPsql";

const SHARD = 1;
const SCHEMA = `test_pg_tube_upstream${SHARD}`;
const TUBE = "mytube";
const TUBE2 = "mytube2";
const TABLE = "mytable";

let activeDatabase: Database;

async function setUp(): Promise<{
  upstream: Upstream;
  logs: UpstreamLogEvent[];
}> {
  runPsql(`
    BEGIN;

    DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;
    CREATE SCHEMA ${SCHEMA};
    SET LOCAL statement_timeout TO 5000;
    SET LOCAL search_path TO ${SCHEMA};
    \\i ${__dirname}/../../sql/pg-tube-up.sql

    CREATE TABLE ${TABLE}(id bigint, s text);
    INSERT INTO ${TABLE} SELECT s, s::text FROM generate_series(1, 1000) s;
    SELECT tube_ensure_exists('${TUBE}', 1);
    SELECT tube_ensure_exists('${TUBE2}', 1);
    SELECT tube_table_ensure_attached('${TUBE}', '${TABLE}');

    COMMIT;
  `);

  const config = {
    host: process.env["PGHOST"] || process.env["DB_HOST_DEFAULT"],
    port: parseInt(process.env["PGPORT"] || process.env["DB_PORT"] || "5432"),
    database: process.env["PGDATABASE"] || process.env["DB_DATABASE"],
    user: process.env["PGUSER"] || process.env["DB_USER"],
    password: process.env["PGPASSWORD"] || process.env["DB_PASS"],
  };
  const database = new Database({
    config,
    directConfig: config,
    schema: SCHEMA,
  });
  const logs: UpstreamLogEvent[] = [];
  const upstream = new Upstream({
    database,
    chunkSize: 1,
    reopenMinMs: 1,
    reopenMaxMs: 60000,
    maxPods: 1,
    logger: (event) => logs.push(event),
  });

  activeDatabase = database;

  return { upstream, logs };
}

afterEach(async () => {
  activeDatabase && (await activeDatabase.end());
});

it("should bulk-insert pods with ordering", async () => {
  const { upstream, logs } = await setUp();
  await upstream.podsInsert(
    100000,
    TUBE,
    [`SELECT id FROM ${TABLE} ORDER BY id`],
    1,
    Op.TOUCH,
  );
  const rows = await upstream.database.query(
    `SELECT ids, op FROM ${SCHEMA}.${TUBE} ORDER BY seq`,
  );
  expect(rows[0][0]).toHaveLength(250);
  expect(rows[0][1]).toEqual(Op.TOUCH);
  expect(sumBy(rows, (row: any) => row[0].length)).toEqual(1000);
  expect(logs.filter(({ type }) => type === "podsInsert")).toMatchObject([
    { podIdsTotal: 1000 },
  ]);
  expect(
    last(logs.filter(({ type }) => type === "podsInsertNotice")),
  ).toMatchObject({ podIdsTotal: 1000 });
});

it("should bulk-insert pods without ordering", async () => {
  const { upstream } = await setUp();
  await upstream.podsInsert(
    100000,
    [TUBE, TUBE2],
    [`SELECT id, row_number() OVER () FROM ${TABLE}`],
    1,
    Op.TOUCH,
  );
  const rows = await upstream.database.query(
    `SELECT ids FROM ${SCHEMA}.${TUBE} ORDER BY seq`,
  );
  expect(rows[0][0]).toHaveLength(250);
  expect(sumBy(rows, (row: any) => row[0].length)).toEqual(1000);
  const rows2 = await upstream.database.query(
    `SELECT ids FROM ${SCHEMA}.${TUBE2} ORDER BY seq`,
  );
  expect(rows2[0][0]).toHaveLength(250);
});

it("should wait until all active transactions are finished before starting backfill", async () => {
  const { upstream, logs } = await setUp();
  const otherClient = new Client(activeDatabase.config);
  await otherClient.connect();
  let promise: Promise<void> | undefined = undefined;
  try {
    await otherClient.query("BEGIN");
    await otherClient.query(`INSERT INTO ${SCHEMA}.${TABLE} VALUES (0, '')`);
    promise = upstream.backfill(100000, TUBE, TABLE, "id", 1);
    await waitForExpect(
      () => expect(inspect(logs)).toContain("active_tx_xid="),
      10000,
    );
  } finally {
    await otherClient.query("ROLLBACK").catch(() => {});
    await otherClient.end().catch(() => {});
    await promise?.catch(() => {});
  }
});

it("should parse notices", () => {
  expect(parseNotice("tube_pods_insert: (some)")).toEqual({});

  expect(
    parseNotice(
      "tube_pods_insert: size=<NULL> fetch_ms=6025 insert_rows=1215 insert_finished=f (inserting)",
    ),
  ).toEqual({
    fetch_ms: "6025",
    insert_finished: "f",
    insert_rows: "1215",
    size: null,
  });
});
