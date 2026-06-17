export interface BalanceInput {
  memberId: string;
  netCents: number;
}

export interface Payment {
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
}

export function simplifyDebts(balances: BalanceInput[]): Payment[] {
  const payments: Payment[] = [];

  const creditors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ id: b.memberId, amount: b.netCents }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ id: b.memberId, amount: -b.netCents }))
    .sort((a, b) => b.amount - a.amount);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transfer = Math.min(creditor.amount, debtor.amount);

    payments.push({
      fromMemberId: debtor.id,
      toMemberId: creditor.id,
      amountCents: transfer,
    });

    creditor.amount -= transfer;
    debtor.amount -= transfer;

    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }

  return payments;
}
