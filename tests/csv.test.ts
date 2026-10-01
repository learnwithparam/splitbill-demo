import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../src/db.ts";
import { seedDemoData } from "../src/seed.ts";
import { createExpense } from "../src/expenses.ts";
import { exportCsv } from "../src/csv.ts";

function setupDb(): Database {
  const db = new Database(":memory:");
  initSchema(db);
  seedDemoData(db);
  return db;
}

const FLAT_IDS = ["flat-priya-id", "flat-imran-id", "flat-sara-id"];

describe("exportCsv", () => {
  test("exportCsv formats the amount column as a decimal string", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-imran-id",
      amountCents: 1005,
      description: "Milk",
      splitAmong: FLAT_IDS,
      createdAt: "2026-09-10T09:00:00.000Z",
    });
    const lines = exportCsv(db, "flat-4b").trimEnd().split("\n");
    const electricity = lines.find((l) => l.includes("Electricity bill"));
    const milk = lines.find((l) => l.includes("Milk"));
    expect(electricity).toEndWith(",45.00");
    expect(milk).toEndWith(",10.05");
  });

  test("exportCsv keeps header and escapes text columns", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-sara-id",
      amountCents: 250,
      description: 'Tea, "chai"',
      splitAmong: FLAT_IDS,
      createdAt: "2026-09-11T09:00:00.000Z",
    });
    const lines = exportCsv(db, "flat-4b").trimEnd().split("\n");
    expect(lines[0]).toBe("date,payer,description,amount");
    expect(lines).toHaveLength(1 + 4);
    expect(lines[4]).toBe('2026-09-11T09:00:00.000Z,Sara,"Tea, ""chai""",2.50');
  });
});
