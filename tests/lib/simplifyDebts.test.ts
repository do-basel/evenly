import { simplifyDebts } from '../../src/lib/simplifyDebts';

describe('simplifyDebts', () => {
  it('returns empty list when no balances', () => {
    expect(simplifyDebts([])).toEqual([]);
  });

  it('single payment for two-person debt', () => {
    const result = simplifyDebts([
      { memberId: 'alice', netCents: 1000 },
      { memberId: 'bob', netCents: -1000 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ fromMemberId: 'bob', toMemberId: 'alice', amountCents: 1000 });
  });

  it('minimises three-way debt', () => {
    const result = simplifyDebts([
      { memberId: 'alice', netCents: 2000 },
      { memberId: 'bob', netCents: -1000 },
      { memberId: 'charlie', netCents: -1000 },
    ]);
    expect(result).toHaveLength(2);
    expect(result.reduce((s, p) => s + p.amountCents, 0)).toBe(2000);
    result.forEach((p) => expect(p.toMemberId).toBe('alice'));
  });

  it('payments net out all balances exactly', () => {
    const balances = [
      { memberId: 'alice', netCents: 1500 },
      { memberId: 'bob', netCents: -500 },
      { memberId: 'charlie', netCents: -700 },
      { memberId: 'dave', netCents: -300 },
    ];
    const payments = simplifyDebts(balances);
    const check: Record<string, number> = {};
    for (const p of payments) {
      check[p.fromMemberId] = (check[p.fromMemberId] ?? 0) - p.amountCents;
      check[p.toMemberId] = (check[p.toMemberId] ?? 0) + p.amountCents;
    }
    for (const { memberId, netCents } of balances) {
      expect(check[memberId] ?? 0).toBe(netCents);
    }
  });
});
