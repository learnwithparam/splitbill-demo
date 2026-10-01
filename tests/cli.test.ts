import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../src/db.ts";
import { seedDemoData } from "../src/seed.ts";
import { run } from "../src/cli.ts";

function setupDb(): Database {
  const db = new Database(":memory:");
  initSchema(db);
  seedDemoData(db);
  return db;
}

describe("splitbill groups", () => {
  test("lists group ids and names", () => {
    const output = run(["groups"], setupDb());
    expect(output).toContain("goa-trip");
    expect(output).toContain("Goa trip");
    expect(output).toContain("flat-4b");
  });
});

describe("splitbill balances", () => {
  test("prints a balance line per member and a settle-up section", () => {
    const output = run(["balances", "goa-trip"], setupDb());
    expect(output).toContain("Asha");
    expect(output).toContain("Settle up:");
  });

  test("reports an unknown group", () => {
    const output = run(["balances", "no-such-group"], setupDb());
    expect(output).toContain("no such group");
  });
});

describe("splitbill export", () => {
  test("prints CSV with a header row", () => {
    const output = run(["export", "flat-4b"], setupDb());
    expect(output.split("\n")[0]).toBe("date,payer,description,amount");
  });

  test("export rows end in a formatted amount", () => {
    const output = run(["export", "flat-4b"], setupDb());
    const rows = output.trimEnd().split("\n").slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.split(",").at(-1)).toMatch(/^-?\d+\.\d{2}$/);
    }
  });
});

describe("splitbill with no command", () => {
  test("prints usage", () => {
    const output = run([], setupDb());
    expect(output).toContain("Usage:");
  });
});
