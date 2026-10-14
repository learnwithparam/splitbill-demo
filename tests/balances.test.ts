import { describe, expect, test } from "bun:test";
import { settleUp, type MemberBalance } from "../src/balances.ts";
import type { Transfer } from "../src/types.ts";

function balance(memberId: string, netCents: number): MemberBalance {
  return { memberId, name: memberId, paidCents: 0, owedCents: 0, netCents };
}

/** Each member's net after applying the transfers; all zero means fully settled. */
function netsAfter(balances: MemberBalance[], transfers: Transfer[]): Map<string, number> {
  const nets = new Map(balances.map((b) => [b.memberId, b.netCents]));
  for (const t of transfers) {
    nets.set(t.fromMemberId, nets.get(t.fromMemberId)! + t.amountCents);
    nets.set(t.toMemberId, nets.get(t.toMemberId)! - t.amountCents);
  }
  return nets;
}

function expectSettled(balances: MemberBalance[], transfers: Transfer[]) {
  for (const [, net] of netsAfter(balances, transfers)) expect(net).toBe(0);
}

function expectWholeDollarsOrCentsOnly(transfers: Transfer[]) {
  for (const t of transfers) {
    expect(Number.isInteger(t.amountCents)).toBe(true);
    expect(t.amountCents).toBeGreaterThan(0);
    expect(t.amountCents % 100 === 0 || t.amountCents < 100).toBe(true);
  }
}

function sortTransfers(transfers: Transfer[]): Transfer[] {
  return [...transfers].sort(
    (a, b) =>
      a.fromMemberId.localeCompare(b.fromMemberId) ||
      a.toMemberId.localeCompare(b.toMemberId) ||
      a.amountCents - b.amountCents,
  );
}

/** Small deterministic PRNG so the random cases are reproducible. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function randomZeroSumBalances(rand: () => number, count: number): MemberBalance[] {
  const nets = Array.from({ length: count - 1 }, () => Math.floor(rand() * 20001) - 10000);
  nets.push(-nets.reduce((sum, n) => sum + n, 0));
  return nets.map((n, i) => balance(`m${i}`, n));
}

/** The single-pass greedy matching settleUp used before whole-dollar settling. */
function onePassSettleUp(balances: MemberBalance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ id: b.memberId, amount: b.netCents }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ id: b.memberId, amount: -b.netCents }))
    .sort((a, b) => b.amount - a.amount);
  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!;
    const debtor = debtors[di]!;
    const amount = Math.min(creditor.amount, debtor.amount);
    if (amount > 0) transfers.push({ fromMemberId: debtor.id, toMemberId: creditor.id, amountCents: amount });
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }
  return transfers;
}

describe("settleUp", () => {
  test("issue example: $100 dinner for three gives $33 transfers plus cents-only remainders", () => {
    const balances = [balance("asha", 6667), balance("ben", -3333), balance("chen", -3334)];
    const transfers = settleUp(balances);
    expect(sortTransfers(transfers)).toEqual(
      sortTransfers([
        { fromMemberId: "ben", toMemberId: "asha", amountCents: 3300 },
        { fromMemberId: "chen", toMemberId: "asha", amountCents: 3300 },
        { fromMemberId: "ben", toMemberId: "asha", amountCents: 33 },
        { fromMemberId: "chen", toMemberId: "asha", amountCents: 34 },
      ]),
    );
  });

  test("every transfer is whole dollars or cents only", () => {
    const rand = seededRandom(193);
    for (let i = 0; i < 200; i++) {
      const balances = randomZeroSumBalances(rand, 2 + Math.floor(rand() * 7));
      expectWholeDollarsOrCentsOnly(settleUp(balances));
    }
    expectWholeDollarsOrCentsOnly(
      settleUp([balance("asha", 2075), balance("dev", 1050), balance("ben", -3125)]),
    );
  });

  test("settles exactly when one debtor owes two creditors cents amounts (2075 / 1050 / -3125)", () => {
    const balances = [balance("asha", 2075), balance("dev", 1050), balance("ben", -3125)];
    const transfers = settleUp(balances);
    expectSettled(balances, transfers);
    expectWholeDollarsOrCentsOnly(transfers);
  });

  test("settles exactly for seeded random zero-sum balances", () => {
    const rand = seededRandom(42);
    for (let i = 0; i < 500; i++) {
      const balances = randomZeroSumBalances(rand, 2 + Math.floor(rand() * 9));
      expectSettled(balances, settleUp(balances));
    }
  });

  test("whole-dollar balances produce no sub-dollar transfers and match the one-pass result", () => {
    const rand = seededRandom(7);
    for (let i = 0; i < 200; i++) {
      const balances = randomZeroSumBalances(rand, 2 + Math.floor(rand() * 7)).map((b) =>
        balance(b.memberId, b.netCents - (b.netCents % 100)),
      );
      // Re-balance to zero sum on the last member, keeping it whole dollars.
      const last = balances[balances.length - 1]!;
      last.netCents -= balances.reduce((sum, b) => sum + b.netCents, 0);
      const transfers = settleUp(balances);
      for (const t of transfers) expect(t.amountCents % 100).toBe(0);
      expect(transfers).toEqual(onePassSettleUp(balances));
    }
  });
});
