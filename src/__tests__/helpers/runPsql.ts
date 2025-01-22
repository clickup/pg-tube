import { execSync } from "child_process";

export default function runPsql(sql: string): string {
  try {
    return execSync("psql -v ON_ERROR_STOP=1", {
      encoding: "utf-8",
      shell: "/bin/bash",
      stdio: [undefined, undefined, undefined],
      input: sql,
      env: {
        ...process.env,
        PGHOST: process.env["PGHOST"] || process.env["DB_HOST_DEFAULT"],
        PGPORT: process.env["PGPORT"] || process.env["DB_PORT"],
        PGUSER: process.env["PGUSER"] || process.env["DB_USER"],
        PGPASSWORD: process.env["PGPASSWORD"] || process.env["DB_PASS"],
        PGDATABASE: process.env["PGDATABASE"] || process.env["DB_DATABASE"],
      },
    });
  } catch (e: any) {
    if (e.signal === "SIGINT" || e.message?.match(/Cancel request sent/)) {
      throw "";
    }

    throw e;
  }
}
