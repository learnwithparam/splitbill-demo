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
    .trimEnd()
    .split("\n")
    .slice(1)
    .map((line) => line.split(",").at(-1)!);
}

describe("exportCsv", () => {
  test("exportCsv formats the amount column as a decimal amount", () => {
    const csv = exportCsv(setupDb(), "flat-4b");
    expect(csv.split("\n")[0]).toBe("date,payer,description,amount");
    expect(amountColumn(csv)).toEqual(["45.00", "12.00", "30.00"]);
  });

  test("exportCsv keeps the cents of a non-round amount", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 1005,
      description: "Milk, eggs",
      splitAmong: ["flat-priya-id"],
      createdAt: "2026-09-10T09:00:00.000Z",
    });
    const lines = exportCsv(db, "flat-4b").trimEnd().split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[4]).toBe('2026-09-10T09:00:00.000Z,Priya,"Milk, eggs",10.05');
  });
});
