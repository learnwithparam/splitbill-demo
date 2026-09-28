// Holdout test (see .factory/config.json's "holdout" key): excluded from the
// build agent's worktree via sparse-checkout, and force-restored from the
// base branch before this runs, so a build can never see or edit these
// assertions. Grades settleUp() on correctness properties a feature change
// (e.g. issue #08, "make settling up easier") could plausibly break without
// tripping any test the build agent can see: shares no longer summing to
// zero, a self-transfer, a negative or fractional transfer amount.
import { describe, expect, test } from "bun:test";
import { settleUp, type MemberBalance } from "../../src/balances.ts";

function balance(memberId: string, netCents: number): MemberBalance {
  return { memberId, name: memberId, paidCents: Math.max(netCents, 0), owedCents: Math.max(-netCents, 0), netCents };
}

describe("settleUp", () => {
  test("returns no transfers when there is nothing to settle", () => {
    expect(settleUp([])).toEqual([]);
    expect(settleUp([balance("a", 0), balance("b", 0)])).toEqual([]);
  });

  test("every transfer amount is a positive integer number of cents", () => {
    const balances = [balance("a", 1500), balance("b", -700), balance("c", -800)];
    for (const t of settleUp(balances)) {
      expect(Number.isInteger(t.amountCents)).toBe(true);
      expect(t.amountCents).toBeGreaterThan(0);
    }
  });

  test("never generates a transfer from a member to themselves", () => {
    const balances = [balance("a", 500), balance("b", -300), balance("c", -200)];
    for (const t of settleUp(balances)) {
      expect(t.fromMemberId).not.toBe(t.toMemberId);
    }
  });

  test("applying every transfer zeroes each member's net balance", () => {
    const cases: MemberBalance[][] = [
      [balance("a", 1000), balance("b", -1000)],
      [balance("a", 1500), balance("b", -700), balance("c", -800)],
      [balance("a", 300), balance("b", 300), balance("c", -100), balance("d", -500)],
      [balance("a", 1), balance("b", -1)],
      [balance("a", 999), balance("b", -333), balance("c", -333), balance("d", -333)],
    ];

    for (const balances of cases) {
      const transfers = settleUp(balances);
      const net = new Map(balances.map((b) => [b.memberId, b.netCents]));
      for (const t of transfers) {
        net.set(t.fromMemberId, (net.get(t.fromMemberId) ?? 0) + t.amountCents);
        net.set(t.toMemberId, (net.get(t.toMemberId) ?? 0) - t.amountCents);
      }
      for (const [, remaining] of net) {
        expect(remaining).toBe(0);
      }
    }
  });

  test("total settled equals the total amount owed, exactly, with no leftover cents", () => {
    const balances = [balance("a", 1500), balance("b", -700), balance("c", -800)];
    const totalOwed = balances.filter((b) => b.netCents > 0).reduce((sum, b) => sum + b.netCents, 0);
    const totalTransferred = settleUp(balances).reduce((sum, t) => sum + t.amountCents, 0);
    expect(totalTransferred).toBe(totalOwed);
  });
});
