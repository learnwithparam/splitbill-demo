import type { Database } from "bun:sqlite";
import type { Transfer } from "./types.ts";

export interface MemberBalance {
  memberId: string;
  name: string;
  paidCents: number;
  owedCents: number;
  netCents: number; // positive: is owed money; negative: owes money
}

/** Net balance per member: what they paid minus what they owe, across all expenses in the group. */
export function computeBalances(db: Database, groupId: string): MemberBalance[] {
  const members = db
    .query("SELECT id, name FROM members WHERE group_id = ?")
    .all(groupId) as { id: string; name: string }[];

  const paid = new Map<string, number>();
  const owed = new Map<string, number>();

  const paidRows = db
    .query(
      `SELECT payer_id as payerId, SUM(amount_cents) as total
       FROM expenses WHERE group_id = ? GROUP BY payer_id`,
    )
    .all(groupId) as { payerId: string; total: number }[];
  for (const row of paidRows) paid.set(row.payerId, row.total);

  const owedRows = db
    .query(
      `SELECT s.member_id as memberId, SUM(s.share_cents) as total
       FROM expense_shares s
       JOIN expenses e ON e.id = s.expense_id
       WHERE e.group_id = ?
       GROUP BY s.member_id`,
    )
    .all(groupId) as { memberId: string; total: number }[];
  for (const row of owedRows) owed.set(row.memberId, row.total);

  return members.map((m) => {
    const paidCents = paid.get(m.id) ?? 0;
    const owedCents = owed.get(m.id) ?? 0;
    return { memberId: m.id, name: m.name, paidCents, owedCents, netCents: paidCents - owedCents };
  });
}

interface Party {
  id: string;
  amount: number; // cents still to receive (creditor) or pay (debtor)
}

/**
 * Transfers that settle every balance to exactly zero, payable mostly in cash: the whole-dollar
 * part of each balance is settled first, then the leftover cents with separate transfers under $1.
 */
export function settleUp(balances: MemberBalance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ id: b.memberId, amount: b.netCents }));
  const debtors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ id: b.memberId, amount: -b.netCents }));

  // Pass 1 moves only whole dollars, so every transfer is a multiple of 100. Afterwards one
  // side has no whole dollars left, so each pass-2 transfer is under 100 cents.
  const dollarPart = (p: Party): Party => ({ id: p.id, amount: Math.floor(p.amount / 100) * 100 });
  const dollarCreditors = creditors.map(dollarPart);
  const dollarDebtors = debtors.map(dollarPart);
  const dollarTransfers = matchGreedy(dollarCreditors, dollarDebtors);

  const settled = new Map<string, number>();
  for (const t of dollarTransfers) {
    settled.set(t.fromMemberId, (settled.get(t.fromMemberId) ?? 0) + t.amountCents);
    settled.set(t.toMemberId, (settled.get(t.toMemberId) ?? 0) + t.amountCents);
  }
  const remainder = (p: Party): Party => ({ id: p.id, amount: p.amount - (settled.get(p.id) ?? 0) });
  const centsTransfers = matchGreedy(creditors.map(remainder), debtors.map(remainder));

  return [...dollarTransfers, ...centsTransfers];
}

/** Greedy largest-first matching of debtors to creditors, until one side runs out. */
function matchGreedy(creditorsIn: Party[], debtorsIn: Party[]): Transfer[] {
  const creditors = creditorsIn.filter((p) => p.amount > 0).sort((a, b) => b.amount - a.amount);
  const debtors = debtorsIn.filter((p) => p.amount > 0).sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!;
    const debtor = debtors[di]!;
    const amount = Math.min(creditor.amount, debtor.amount);
    if (amount > 0) {
      transfers.push({ fromMemberId: debtor.id, toMemberId: creditor.id, amountCents: amount });
    }
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }
  return transfers;
}
