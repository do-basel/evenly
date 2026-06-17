export interface Event {
  id: string;
  name: string;
  invite_code: string;
  currency: string;
  created_at: string;
  members: Member[];
  expenses: ExpenseWithSplits[];
  balances: Balance[];
  settlement: SettlementPayment[];
}

export interface Member {
  id: string;
  name: string;
  photo_url: string | null;
  event_id: string;
  member_token?: string;
  created_at?: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  member_id: string;
  share_value: number;
  amount_cents: number;
}

export interface Expense {
  id: string;
  event_id: string;
  description: string;
  amount_cents: number;
  paid_by: string;
  created_by: string;
  split_type: 'equal' | 'percentage' | 'shares';
  created_at: string;
}

export interface ExpenseWithSplits extends Expense {
  splits: ExpenseSplit[];
}

export interface Balance {
  memberId: string;
  netCents: number;
}

export interface SettlementPayment {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amountCents: number;
}

export interface StoredMembership {
  inviteCode: string;
  eventName: string;
  memberId: string;
  memberToken: string;
  memberName: string;
  currency: string;
  createdAt: string;
  isCreator?: boolean;
}
