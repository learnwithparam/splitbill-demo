import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../src/db.ts";
import { seedDemoData } from "../src/seed.ts";
import { exportCsv } from "../src/csv.ts";
import { createExpense } from "../src/expenses.ts";

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

  test("exportCsv formats non-round cents", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 1005,
      description: "Milk",
      splitAmong: ["flat-priya-id", "flat-imran-id", "flat-sara-id"],
      createdAt: "2026-09-10T09:00:00.000Z",
    });
    const amounts = amountColumn(exportCsv(db, "flat-4b"));
    expect(amounts).toHaveLength(4);
    expect(amounts.at(-1)).toBe("10.05");
  });
});
