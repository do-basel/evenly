const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  createEvent: (name: string, currency: string) =>
    req('/api/events', { method: 'POST', body: JSON.stringify({ name, currency }) }),

  getEvent: (inviteCode: string) =>
    req(`/api/events/${inviteCode}`),

  joinEvent: (inviteCode: string, name: string, photo_url?: string) =>
    req(`/api/events/${inviteCode}/members`, {
      method: 'POST',
      body: JSON.stringify({ name, photo_url }),
    }),

  getMe: (inviteCode: string, memberToken: string) =>
    req(`/api/events/${inviteCode}/members/me`, {
      headers: { 'X-Member-Token': memberToken },
    }),

  addExpense: (
    inviteCode: string,
    memberToken: string,
    data: {
      description: string;
      amount_cents: number;
      paid_by: string;
      split_type: string;
      participants: { memberId: string; shareValue: number }[];
    }
  ) =>
    req(`/api/events/${inviteCode}/expenses`, {
      method: 'POST',
      headers: { 'X-Member-Token': memberToken },
      body: JSON.stringify(data),
    }),

  deleteExpense: (_inviteCode: string, expenseId: string, memberToken: string) =>
    req(`/api/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: { 'X-Member-Token': memberToken },
    }),

  getSettlement: (inviteCode: string) =>
    req(`/api/events/${inviteCode}/settlements`),

  markSettled: (inviteCode: string, memberToken: string, to_member_id: string, amount_cents: number) =>
    req(`/api/events/${inviteCode}/settlements/mark`, {
      method: 'POST',
      headers: { 'X-Member-Token': memberToken },
      body: JSON.stringify({ to_member_id, amount_cents }),
    }),
};
