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
  test("formats the amount column as a 2-decimal amount", () => {
    const db = setupDb();
    const members = ["flat-priya-id", "flat-imran-id", "flat-sara-id"];
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 1000,
      description: "Plants",
      splitAmong: members,
      createdAt: "2026-09-10T09:00:00.000Z",
    });
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-sara-id",
      amountCents: 1005,
      description: "Soap",
      splitAmong: members,
      createdAt: "2026-09-11T09:00:00.000Z",
    });

    const amounts = amountColumn(exportCsv(db, "flat-4b"));
    expect(amounts.slice(-2)).toEqual(["10.00", "10.05"]);
  });

  test("seeded flat-4b export uses formatted amounts", () => {
    const csv = exportCsv(setupDb(), "flat-4b");
    expect(csv.split("\n")[0]).toBe("date,payer,description,amount");
    const amounts = amountColumn(csv);
    expect(amounts).toEqual(["45.00", "12.00", "30.00"]);
    for (const amount of amounts) {
      expect(amount).toMatch(/^-?\d+\.\d{2}$/);
    }
  });
});
