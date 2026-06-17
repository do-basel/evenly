import { computeBalances, ExpenseRow, SplitRow } from '../../src/lib/computeBalances';

describe('computeBalances', () => {
  it('returns empty array when no expenses', () => {
    expect(computeBalances([], [])).toEqual([]);
  });

  it('payer has positive balance, others negative', () => {
    const expenses: ExpenseRow[] = [{ id: 'e1', paid_by: 'alice', amount_cents: 3000 }];
    const splits: SplitRow[] = [
      { expense_id: 'e1', member_id: 'alice', amount_cents: 1000 },
      { expense_id: 'e1', member_id: 'bob', amount_cents: 1000 },
      { expense_id: 'e1', member_id: 'charlie', amount_cents: 1000 },
    ];
    const result = computeBalances(expenses, splits);
    expect(result.find((r) => r.memberId === 'alice')!.netCents).toBe(2000);
    expect(result.find((r) => r.memberId === 'bob')!.netCents).toBe(-1000);
    expect(result.find((r) => r.memberId === 'charlie')!.netCents).toBe(-1000);
  });

  it('sum of all balances is always zero', () => {
    const expenses: ExpenseRow[] = [
      { id: 'e1', paid_by: 'alice', amount_cents: 6000 },
      { id: 'e2', paid_by: 'bob', amount_cents: 3000 },
    ];
    const splits: SplitRow[] = [
      { expense_id: 'e1', member_id: 'alice', amount_cents: 3000 },
      { expense_id: 'e1', member_id: 'bob', amount_cents: 3000 },
      { expense_id: 'e2', member_id: 'alice', amount_cents: 1500 },
      { expense_id: 'e2', member_id: 'bob', amount_cents: 1500 },
    ];
    const result = computeBalances(expenses, splits);
    expect(result.reduce((s, r) => s + r.netCents, 0)).toBe(0);
  });
});
