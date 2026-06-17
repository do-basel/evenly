import { getAuth } from './storage';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const auth = getAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (auth?.token) headers['Authorization'] = `Bearer ${auth.token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  register: (email: string, password: string, name: string) =>
    req('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),

  login: (email: string, password: string) =>
    req('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  getMe: () => req('/api/auth/me'),

  updateMe: (updates: { name?: string; photo_url?: string | null; language?: string }) =>
    req('/api/auth/me', { method: 'PATCH', body: JSON.stringify(updates) }),

  // Events
  createEvent: (name: string, currency: string) =>
    req('/api/events', { method: 'POST', body: JSON.stringify({ name, currency }) }),

  getEvent: (inviteCode: string) =>
    req(`/api/events/${inviteCode}`),

  joinEvent: (inviteCode: string, name: string, photo_url?: string) =>
    req(`/api/events/${inviteCode}/members`, {
      method: 'POST',
      body: JSON.stringify({ name, photo_url }),
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

  renameEvent: (inviteCode: string, memberToken: string, name: string) =>
    req(`/api/events/${inviteCode}`, {
      method: 'PATCH',
      headers: { 'X-Member-Token': memberToken },
      body: JSON.stringify({ name }),
    }),

  removeMember: (inviteCode: string, memberToken: string, memberId: string) =>
    req(`/api/events/${inviteCode}/members/${memberId}`, {
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
