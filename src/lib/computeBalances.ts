export interface ExpenseRow {
  id: string;
  paid_by: string;
  amount_cents: number;
}

export interface SplitRow {
  expense_id: string;
  member_id: string;
  amount_cents: number;
}

export interface BalanceResult {
  memberId: string;
  netCents: number;
}

export function computeBalances(
  expenses: ExpenseRow[],
  splits: SplitRow[]
): BalanceResult[] {
  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    balances[expense.paid_by] = (balances[expense.paid_by] ?? 0) + Number(expense.amount_cents);
  }

  for (const split of splits) {
    balances[split.member_id] = (balances[split.member_id] ?? 0) - Number(split.amount_cents);
  }

  const result = Object.entries(balances).map(([memberId, netCents]) => ({ memberId, netCents }));

  const sum = result.reduce((s, r) => s + r.netCents, 0);
  if (sum !== 0) throw new Error(`Balance invariant violated: sum is ${sum}, expected 0`);

  return result;
}
