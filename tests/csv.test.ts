import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../src/db.ts";
import { seedDemoData } from "../src/seed.ts";
import { createExpense } from "../src/expenses.ts";
import { exportCsv } from "../src/csv.ts";

function setupDb() {
  const db = new Database(":memory:");
  initSchema(db);
  seedDemoData(db);
  return db;
}

function dataRows(csv: string): string[] {
  return csv.trimEnd().split("\n").slice(1);
}

describe("exportCsv", () => {
  test("formats the amount column as a decimal string", () => {
    const db = setupDb();
    const rows = dataRows(exportCsv(db, "flat-4b"));
    for (const row of rows) {
      expect(row.split(",").at(-1)).toMatch(/^-?\d+\.\d{2}$/);
    }
    expect(rows.map((r) => r.split(",").at(-1))).toEqual(["45.00", "12.00", "30.00"]);
  });

  test("formats non-round cents with two decimals", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 1005,
      description: "Milk",
      splitAmong: ["flat-priya-id", "flat-imran-id", "flat-sara-id"],
      createdAt: "2026-09-10T09:00:00.000Z",
    });
    const row = dataRows(exportCsv(db, "flat-4b")).find((r) => r.includes(",Milk,"));
    expect(row).toBeDefined();
    expect(row!.endsWith(",10.05")).toBe(true);
  });

  test("keeps header and one row per expense", () => {
    const db = setupDb();
    const csv = exportCsv(db, "flat-4b");
    expect(csv.split("\n")[0]).toBe("date,payer,description,amount");
    expect(dataRows(csv)).toHaveLength(3);
  });
});
