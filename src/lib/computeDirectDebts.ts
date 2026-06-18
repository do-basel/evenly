import type { Payment } from './simplifyDebts';

export function computeDirectDebts(
  expenses: Array<{ id: string; paid_by: string }>,
  splits: Array<{ expense_id: string; member_id: string; amount_cents: number }>
): Payment[] {
  // Build raw pairwise debts from each expense
  const debtMap: Record<string, Record<string, number>> = {};

  for (const expense of expenses) {
    for (const split of splits) {
      if (split.expense_id !== expense.id) continue;
      if (split.member_id === expense.paid_by) continue; // payer's own share

      const from = split.member_id;
      const to = expense.paid_by;

      if (!debtMap[from]) debtMap[from] = {};
      debtMap[from][to] = (debtMap[from][to] ?? 0) + Number(split.amount_cents);
    }
  }

  // Net out each bidirectional pair (A owes B 10, B owes A 3 → A owes B 7)
  const payments: Payment[] = [];
  const processed = new Set<string>();

  for (const [from, tos] of Object.entries(debtMap)) {
    for (const [to, amount] of Object.entries(tos)) {
      const key = [from, to].sort().join(':');
      if (processed.has(key)) continue;
      processed.add(key);

      const reverse = debtMap[to]?.[from] ?? 0;
      const net = amount - reverse;

      if (net > 0) {
        payments.push({ fromMemberId: from, toMemberId: to, amountCents: net });
      } else if (net < 0) {
        payments.push({ fromMemberId: to, toMemberId: from, amountCents: -net });
      }
    }
  }

  return payments;
}
