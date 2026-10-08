import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../src/db.ts";
import { seedDemoData } from "../src/seed.ts";
import { exportCsv } from "../src/csv.ts";
import { createExpense } from "../src/expenses.ts";

function setupDb() {
  const db = new Database(":memory:");
  initSchema(db);
  seedDemoData(db);
  return db;
}

function amountColumn(csv: string): string[] {
  const [, ...rows] = csv.trimEnd().split("\n");
  return rows.map((row) => row.split(",").at(-1)!);
}

describe("exportCsv", () => {
  test("exportCsv formats the amount column with formatCents", () => {
    const db = setupDb();
    const csv = exportCsv(db, "flat-4b");
    expect(csv.split("\n")[0]).toBe("date,payer,description,amount");
    expect(amountColumn(csv)).toEqual(["45.00", "12.00", "30.00"]);
  });

  test("exportCsv formats non-whole amounts to two decimals", () => {
    const db = setupDb();
    db.query("INSERT INTO groups (id, name) VALUES (?, ?)").run("odd", "Odd amounts");
    const base = Date.parse("2026-10-01T09:00:00.000Z");
    createExpense(db, {
      groupId: "odd",
      payerId: "flat-priya-id",
      amountCents: 1005,
      description: "Odd one",
      splitAmong: ["flat-priya-id"],
      createdAt: new Date(base).toISOString(),
    });
    createExpense(db, {
      groupId: "odd",
      payerId: "flat-priya-id",
      amountCents: 5,
      description: "Tiny",
      splitAmong: ["flat-priya-id"],
      createdAt: new Date(base + 1000).toISOString(),
    });
    expect(amountColumn(exportCsv(db, "odd"))).toEqual(["10.05", "0.05"]);
  });

  test("exportCsv formats an amount under one dollar with a leading zero", () => {
    const db = setupDb();
    db.query("INSERT INTO groups (id, name) VALUES (?, ?)").run("small", "Small amounts");
    const base = Date.parse("2026-10-02T09:00:00.000Z");
    [5, 50, 99].forEach((amountCents, i) => {
      createExpense(db, {
        groupId: "small",
        payerId: "flat-priya-id",
        amountCents,
        description: `Small ${amountCents}`,
        splitAmong: ["flat-priya-id"],
        createdAt: new Date(base + i * 1000).toISOString(),
      });
    });
    expect(amountColumn(exportCsv(db, "small"))).toEqual(["0.05", "0.50", "0.99"]);
  });
});
