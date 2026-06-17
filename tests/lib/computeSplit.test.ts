import { computeSplit } from '../../src/lib/computeSplit';

describe('computeSplit', () => {
  describe('equal', () => {
    it('divides evenly', () => {
      const result = computeSplit(300, 'equal', [
        { memberId: 'a', shareValue: 1 },
        { memberId: 'b', shareValue: 1 },
        { memberId: 'c', shareValue: 1 },
      ]);
      expect(result).toEqual([
        { memberId: 'a', amountCents: 100 },
        { memberId: 'b', amountCents: 100 },
        { memberId: 'c', amountCents: 100 },
      ]);
    });

    it('distributes remainder to first N participants', () => {
      const result = computeSplit(100, 'equal', [
        { memberId: 'a', shareValue: 1 },
        { memberId: 'b', shareValue: 1 },
        { memberId: 'c', shareValue: 1 },
      ]);
      const sum = result.reduce((s, r) => s + r.amountCents, 0);
      expect(sum).toBe(100);
    });

    it('sum always equals input exactly', () => {
      for (const total of [1, 7, 100, 101, 999, 1000, 10001]) {
        const result = computeSplit(total, 'equal', [
          { memberId: 'a', shareValue: 1 },
          { memberId: 'b', shareValue: 1 },
          { memberId: 'c', shareValue: 1 },
        ]);
        expect(result.reduce((s, r) => s + r.amountCents, 0)).toBe(total);
      }
    });
  });

  describe('percentage', () => {
    it('splits by percentage', () => {
      const result = computeSplit(10000, 'percentage', [
        { memberId: 'a', shareValue: 50 },
        { memberId: 'b', shareValue: 30 },
        { memberId: 'c', shareValue: 20 },
      ]);
      expect(result.find((r) => r.memberId === 'a')!.amountCents).toBe(5000);
      expect(result.find((r) => r.memberId === 'b')!.amountCents).toBe(3000);
      expect(result.find((r) => r.memberId === 'c')!.amountCents).toBe(2000);
    });

    it('sum equals input exactly', () => {
      const result = computeSplit(333, 'percentage', [
        { memberId: 'a', shareValue: 33 },
        { memberId: 'b', shareValue: 33 },
        { memberId: 'c', shareValue: 34 },
      ]);
      expect(result.reduce((s, r) => s + r.amountCents, 0)).toBe(333);
    });

    it('throws if percentages do not sum to 100', () => {
      expect(() =>
        computeSplit(100, 'percentage', [
          { memberId: 'a', shareValue: 50 },
          { memberId: 'b', shareValue: 30 },
        ])
      ).toThrow('Percentages must sum to 100');
    });

    it('throws if any percentage is negative', () => {
      expect(() =>
        computeSplit(100, 'percentage', [
          { memberId: 'a', shareValue: 110 },
          { memberId: 'b', shareValue: -10 },
        ])
      ).toThrow('Percentages cannot be negative');
    });
  });

  describe('shares', () => {
    it('splits by share count', () => {
      const result = computeSplit(600, 'shares', [
        { memberId: 'a', shareValue: 1 },
        { memberId: 'b', shareValue: 2 },
        { memberId: 'c', shareValue: 3 },
      ]);
      expect(result.find((r) => r.memberId === 'a')!.amountCents).toBe(100);
      expect(result.find((r) => r.memberId === 'b')!.amountCents).toBe(200);
      expect(result.find((r) => r.memberId === 'c')!.amountCents).toBe(300);
    });

    it('sum equals input exactly', () => {
      const result = computeSplit(1000, 'shares', [
        { memberId: 'a', shareValue: 1 },
        { memberId: 'b', shareValue: 1 },
        { memberId: 'c', shareValue: 1 },
      ]);
      expect(result.reduce((s, r) => s + r.amountCents, 0)).toBe(1000);
    });

    it('throws if participants is empty', () => {
      expect(() => computeSplit(100, 'equal', [])).toThrow('participants cannot be empty');
    });
  });
});
