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

function addExpense(db: Database, amountCents: number, createdAt: string): void {
  createExpense(db, {
    groupId: "flat-4b",
    payerId: "flat-priya-id",
    amountCents,
    description: "Test expense",
    splitAmong: ["flat-priya-id"],
    createdAt,
  });
}

describe("exportCsv", () => {
  test("exportCsv formats the amount column as a decimal", () => {
    const db = setupDb();
    addExpense(db, 1000, "2030-01-01T00:00:00.000Z");
    const csv = exportCsv(db, "flat-4b");
    expect(csv.split("\n")[0]).toBe("date,payer,description,amount");
    const amounts = amountColumn(csv);
    expect(amounts[0]).toBe("45.00");
    expect(amounts.at(-1)).toBe("10.00");
    expect(csv).not.toContain(",4500");
  });

  test("exportCsv keeps cents in the amount column", () => {
    const db = setupDb();
    addExpense(db, 1005, "2030-01-01T00:00:00.000Z");
    addExpense(db, 7, "2030-01-02T00:00:00.000Z");
    const amounts = amountColumn(exportCsv(db, "flat-4b"));
    expect(amounts.slice(-2)).toEqual(["10.05", "0.07"]);
  });
});
