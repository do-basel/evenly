import type { Payment } from './simplifyDebts';

export interface SettlementRow {
  from_member_id: string;
  to_member_id: string;
  amount_cents: number;
}

export function computeDirectDebts(
  expenses: Array<{ id: string; paid_by: string }>,
  splits: Array<{ expense_id: string; member_id: string; amount_cents: number }>,
  settlements: SettlementRow[] = []
): Payment[] {
  const debtMap: Record<string, Record<string, number>> = {};

  const add = (from: string, to: string, cents: number) => {
    if (!debtMap[from]) debtMap[from] = {};
    debtMap[from][to] = (debtMap[from][to] ?? 0) + cents;
  };

  // Build raw pairwise debts from each expense
  for (const expense of expenses) {
    for (const split of splits) {
      if (split.expense_id !== expense.id) continue;
      if (split.member_id === expense.paid_by) continue;
      add(split.member_id, expense.paid_by, Number(split.amount_cents));
    }
  }

  // Subtract recorded settlement payments
  for (const s of settlements) {
    add(s.from_member_id, s.to_member_id, -Number(s.amount_cents));
  }

  // Net out each bidirectional pair and emit non-zero results
  const payments: Payment[] = [];
  const processed = new Set<string>();

  for (const from of Object.keys(debtMap)) {
    for (const to of Object.keys(debtMap[from])) {
      const key = [from, to].sort().join(':');
      if (processed.has(key)) continue;
      processed.add(key);

      const forward = debtMap[from]?.[to] ?? 0;
      const reverse = debtMap[to]?.[from] ?? 0;
      const net = forward - reverse;

      if (net > 0) {
        payments.push({ fromMemberId: from, toMemberId: to, amountCents: net });
      } else if (net < 0) {
        payments.push({ fromMemberId: to, toMemberId: from, amountCents: -net });
      }
    }
  }

  return payments;
}
