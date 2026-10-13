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

function dataRows(csv: string): string[][] {
  return csv
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","));
}

describe("exportCsv", () => {
  test("exportCsv formats the amount column as a decimal", () => {
    const rows = dataRows(exportCsv(setupDb(), "flat-4b"));
    expect(rows.map((r) => r[3])).toEqual(["45.00", "12.00", "30.00"]);
  });

  test("exportCsv keeps two decimal places", () => {
    const db = setupDb();
    const flatIds = ["flat-priya-id", "flat-imran-id", "flat-sara-id"];
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 1005,
      description: "Milk",
      splitAmong: flatIds,
      createdAt: "2026-09-10T09:00:00.000Z",
    });
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-imran-id",
      amountCents: 1050,
      description: "Bread",
      splitAmong: flatIds,
      createdAt: "2026-09-11T09:00:00.000Z",
    });
    const rows = dataRows(exportCsv(db, "flat-4b"));
    expect(rows.slice(-2).map((r) => r[3])).toEqual(["10.05", "10.50"]);
  });

  test("exportCsv formats an amount under one dollar with a leading zero", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 5,
      description: "Sticker",
      splitAmong: ["flat-priya-id"],
      createdAt: "2026-09-12T09:00:00.000Z",
    });
    const rows = dataRows(exportCsv(db, "flat-4b"));
    expect(rows.at(-1)?.[3]).toBe("0.05");
  });

  test("exportCsv keeps header and row count", () => {
    const csv = exportCsv(setupDb(), "flat-4b");
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("date,payer,description,amount");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("2026-09-01T09:00:00.000Z,Priya,Electricity bill,45.00");
  });
});
