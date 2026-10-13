import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { exportCsv } from "../src/csv.ts";
import { initSchema } from "../src/db.ts";
import { createExpense } from "../src/expenses.ts";
import { seedDemoData } from "../src/seed.ts";

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
    .map((line) => line.split(",").at(-1) ?? "");
}

describe("exportCsv", () => {
  test("formats a 1000-cent expense as 10.00", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 1000,
      description: "Milk",
      splitAmong: ["flat-priya-id"],
      createdAt: "2026-10-01T09:00:00.000Z",
    });
    const lines = exportCsv(db, "flat-4b").trim().split("\n");
    expect(lines.at(-1)).toBe("2026-10-01T09:00:00.000Z,Priya,Milk,10.00");
  });

  test("formats non-round cent amounts with two decimals", () => {
    const db = setupDb();
    [1005, 7].forEach((amountCents, i) => {
      createExpense(db, {
        groupId: "flat-4b",
        payerId: "flat-priya-id",
        amountCents,
        description: `Odd ${i}`,
        splitAmong: ["flat-priya-id"],
        createdAt: `2026-10-0${i + 1}T09:00:00.000Z`,
      });
    });
    expect(amountColumn(exportCsv(db, "flat-4b")).slice(-2)).toEqual(["10.05", "0.07"]);
  });

  test("formats an amount under one dollar with a leading zero", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 5,
      description: "Sweet",
      splitAmong: ["flat-priya-id"],
      createdAt: "2026-10-01T09:00:00.000Z",
    });
    const lines = exportCsv(db, "flat-4b").trim().split("\n");
    expect(lines.at(-1)).toBe("2026-10-01T09:00:00.000Z,Priya,Sweet,0.05");
  });

  test("seeded group export uses formatted amounts", () => {
    const csv = exportCsv(setupDb(), "flat-4b");
    expect(csv.split("\n")[0]).toBe("date,payer,description,amount");
    expect(amountColumn(csv)).toEqual(["45.00", "12.00", "30.00"]);
  });
});
