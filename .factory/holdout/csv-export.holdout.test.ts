// Holdout test (see .factory/config.json's "holdout" key): excluded from the
// build agent's worktree via sparse-checkout, and force-restored from the
// base branch before this runs, so a build can never see or edit these
// assertions. Grades exportCsv() on the amount column's formatting (issue
// #11): every value must be a "whole.cents" decimal string, zero-padded to
// two fraction digits, with no raw integer cents leaking through -
// properties a naive reformat (e.g. dividing by 100 without padding, or
// reusing formatCents only for some rows) could miss even though the issue
// only asked for the common case ("4500" -> "45.00").
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { initSchema } from "../../src/db.ts";
import { exportCsv } from "../../src/csv.ts";

function seed(db: Database, amounts: number[]): void {
  db.run("INSERT INTO groups (id, name) VALUES ('g1', 'Flat 4B')");
  db.run("INSERT INTO members (id, group_id, name, token) VALUES ('m1', 'g1', 'Priya', 'flat-priya')");
  amounts.forEach((cents, i) => {
    db.run(
      "INSERT INTO expenses (id, group_id, payer_id, amount_cents, description, created_at) VALUES (?, 'g1', 'm1', ?, ?, ?)",
      [`e${i}`, cents, `expense ${i}`, `2026-01-0${i + 1}T00:00:00.000Z`],
    );
  });
}

describe("exportCsv amount formatting", () => {
  test("formats every amount as a zero-padded decimal, never raw cents", () => {
    const db = new Database(":memory:");
    initSchema(db);
    // 5 -> "0.05", 100 -> "1.00", 4500 -> "45.00": the padding case, the
    // whole-dollar case, and the case the issue's own example already covers.
    seed(db, [5, 100, 4500]);

    const csv = db ? exportCsv(db, "g1") : "";
    const rows = csv.trim().split("\n").slice(1);
    const amounts = rows.map((r) => r.split(",").pop());

    expect(amounts).toContain("0.05");
    expect(amounts).toContain("1.00");
    expect(amounts).toContain("45.00");
    for (const a of amounts) {
      expect(a).toMatch(/^\d+\.\d{2}$/);
    }
    // None of the raw cents values should appear un-formatted.
    expect(csv).not.toContain(",5\n");
    expect(csv).not.toContain(",100\n");
    expect(csv).not.toContain(",4500\n");
  });
});
