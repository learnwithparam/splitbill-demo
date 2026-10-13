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

function amountColumn(csv: string): string[] {
  return csv
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(",").at(-1)!);
}

describe("exportCsv", () => {
  test("formats the amount column as a decimal", () => {
    const csv = exportCsv(setupDb(), "flat-4b");
    expect(amountColumn(csv)).toEqual(["45.00", "12.00", "30.00"]);
  });

  test("keeps the cents in non-round amounts", () => {
    const db = setupDb();
    const members = ["flat-priya-id", "flat-imran-id", "flat-sara-id"];
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 1005,
      description: "Odd amount",
      splitAmong: members,
      createdAt: "2026-10-01T09:00:00.000Z",
    });
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-imran-id",
      amountCents: 7,
      description: "Tiny amount",
      splitAmong: members,
      createdAt: "2026-10-02T09:00:00.000Z",
    });
    expect(amountColumn(exportCsv(db, "flat-4b")).slice(-2)).toEqual(["10.05", "0.07"]);
  });

  test("formats an amount under one dollar with a leading zero", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-sara-id",
      amountCents: 5,
      description: "Five cents",
      splitAmong: ["flat-priya-id", "flat-imran-id", "flat-sara-id"],
      createdAt: "2026-10-03T09:00:00.000Z",
    });
    expect(amountColumn(exportCsv(db, "flat-4b")).at(-1)).toBe("0.05");
  });

  test("header and row count unchanged", () => {
    const lines = exportCsv(setupDb(), "flat-4b").trim().split("\n");
    expect(lines[0]).toBe("date,payer,description,amount");
    expect(lines).toHaveLength(4);
  });
});
