import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../src/db.ts";
import { seedDemoData } from "../src/seed.ts";
import { createExpense } from "../src/expenses.ts";
import { formatCents } from "../src/money/index.ts";
import { exportCsv } from "../src/csv.ts";

function setupDb(): Database {
  const db = new Database(":memory:");
  initSchema(db);
  seedDemoData(db);
  return db;
}

function dataRows(csv: string): string[] {
  return csv.trimEnd().split("\n").slice(1);
}

function amountOf(row: string): string {
  return row.slice(row.lastIndexOf(",") + 1);
}

describe("exportCsv", () => {
  test("exportCsv formats the amount column as a decimal amount, not raw cents", () => {
    const db = setupDb();
    const stored = db
      .query("SELECT amount_cents as amountCents FROM expenses WHERE group_id = ? ORDER BY created_at ASC")
      .all("flat-4b") as { amountCents: number }[];

    const amounts = dataRows(exportCsv(db, "flat-4b")).map(amountOf);

    expect(amounts).toEqual(stored.map((r) => formatCents(r.amountCents)));
    expect(amounts[0]).toBe("45.00");
    for (const a of amounts) expect(a).toMatch(/^-?\d+\.\d{2}$/);
  });

  test("exportCsv keeps the header and the other columns unchanged", () => {
    const db = setupDb();
    const csv = exportCsv(db, "flat-4b");
    const rows = dataRows(csv);

    expect(csv.split("\n")[0]).toBe("date,payer,description,amount");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toBe("2026-09-01T09:00:00.000Z,Priya,Electricity bill,45.00");
  });

  test("exportCsv exports a 1-cent expense as 0.01", () => {
    const db = setupDb();
    createExpense(db, {
      groupId: "flat-4b",
      payerId: "flat-priya-id",
      amountCents: 1,
      description: "Penny",
      splitAmong: ["flat-priya-id"],
      createdAt: "2026-09-30T09:00:00.000Z",
    });

    const rows = dataRows(exportCsv(db, "flat-4b"));

    expect(rows.at(-1)).toBe("2026-09-30T09:00:00.000Z,Priya,Penny,0.01");
  });
});
