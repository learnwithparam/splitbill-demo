import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../src/db.ts";
import { insertMember } from "../src/auth/tokens.ts";
import { createExpense } from "../src/expenses.ts";
import { exportCsv } from "../src/csv.ts";

function setupDb(amounts: number[]) {
  const db = new Database(":memory:");
  initSchema(db);
  db.query("INSERT INTO groups (id, name) VALUES (?, ?)").run("g1", "Test group");
  insertMember(db, { id: "m1", groupId: "g1", name: "Asha", token: "t1", role: "admin" });
  amounts.forEach((amountCents, i) => {
    createExpense(db, {
      groupId: "g1",
      payerId: "m1",
      amountCents,
      description: `Expense ${i}`,
      splitAmong: ["m1"],
      createdAt: new Date(Date.parse("2026-09-01T09:00:00.000Z") + i * 3_600_000).toISOString(),
    });
  });
  return db;
}

function dataRows(csv: string): string[] {
  return csv.trim().split("\n").slice(1);
}

describe("exportCsv", () => {
  test("exportCsv formats the amount column as a decimal string (1000 -> 10.00)", () => {
    const db = setupDb([1000]);
    const [row] = dataRows(exportCsv(db, "g1"));
    expect(row?.split(",").at(-1)).toBe("10.00");
  });

  test("exportCsv keeps non-zero cents (1005 -> 10.05)", () => {
    const db = setupDb([1005]);
    const [row] = dataRows(exportCsv(db, "g1"));
    expect(row?.split(",").at(-1)).toBe("10.05");
  });

  test("exportCsv keeps the header and one row per expense", () => {
    const db = setupDb([1000, 1005, 7]);
    const lines = exportCsv(db, "g1").trim().split("\n");
    expect(lines[0]).toBe("date,payer,description,amount");
    expect(lines.length).toBe(4);
    expect(lines.slice(1).map((l) => l.split(",").at(-1))).toEqual(["10.00", "10.05", "0.07"]);
  });
});
