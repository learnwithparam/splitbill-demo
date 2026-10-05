import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../src/db.ts";
import { seedDemoData } from "../src/seed.ts";
import { createExpense } from "../src/expenses.ts";
import { exportCsv } from "../src/csv.ts";

const FLAT_IDS = ["flat-priya-id", "flat-imran-id", "flat-sara-id"];

function setupDb(): Database {
  const db = new Database(":memory:");
  initSchema(db);
  seedDemoData(db);
  return db;
}

function amountColumn(csv: string): string[] {
  return csv
    .trimEnd()
    .split("\n")
    .slice(1)
    .map((line) => line.split(",").at(-1)!);
}

describe("exportCsv", () => {
  test("exportCsv formats the flat-4b amounts as decimals (45.00, 12.00, 30.00)", () => {
    const amounts = amountColumn(exportCsv(setupDb(), "flat-4b"));
    expect(amounts).toEqual(["45.00", "12.00", "30.00"]);
    for (const raw of ["4500", "1200", "3000"]) {
      expect(amounts).not.toContain(raw);
    }
  });

  test("exportCsv formats amounts with cents and amounts under one unit (10.05, 0.05)", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 1005,
      description: "Milk",
      splitAmong: FLAT_IDS,
      createdAt: "2026-09-10T09:00:00.000Z",
    });
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-sara-id",
      amountCents: 5,
      description: "Stamp",
      splitAmong: FLAT_IDS,
      createdAt: "2026-09-11T09:00:00.000Z",
    });
    const amounts = amountColumn(exportCsv(db, "flat-4b"));
    expect(amounts.slice(-2)).toEqual(["10.05", "0.05"]);
  });

  test("exportCsv keeps the header row unchanged", () => {
    const csv = exportCsv(setupDb(), "flat-4b");
    const lines = csv.trimEnd().split("\n");
    expect(lines[0]).toBe("date,payer,description,amount");
    expect(lines).toHaveLength(4);
  });
});
