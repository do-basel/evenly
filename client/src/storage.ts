import type { StoredMembership } from './types';

const MEMBERSHIPS_KEY = 'evenly_memberships';
const AUTH_KEY = 'evenly_auth';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  photo_url: string | null;
  language: string;
}

export interface AuthState {
  token: string;
  user: AuthUser;
}

export function getAuth(): AuthState | null {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function saveAuth(state: AuthState): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function getMemberships(): StoredMembership[] {
  try {
    return JSON.parse(localStorage.getItem(MEMBERSHIPS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveMembership(m: StoredMembership): void {
  const list = getMemberships().filter((x) => x.inviteCode !== m.inviteCode);
  list.unshift(m);
  localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(list));
}

export function getMembership(inviteCode: string): StoredMembership | undefined {
  return getMemberships().find((m) => m.inviteCode === inviteCode);
}

export function removeMembership(inviteCode: string): void {
  const list = getMemberships().filter((x) => x.inviteCode !== inviteCode);
  localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(list));
}

// Legacy profile shim — used by CreateTrip to get user name
export interface Profile {
  name: string;
}

export function getProfile(): Profile | null {
  const auth = getAuth();
  if (auth) return { name: auth.user.name };
  return null;
}

export function clearProfile(): void {
  clearAuth();
}

export function formatCurrency(cents: number, currency: string): string {
  const amount = Math.abs(cents) / 100;
  const formatted = amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbols: Record<string, string> = { SAR: 'ر.س', USD: '$', EUR: '€' };
  return `${formatted} ${symbols[currency] ?? currency}`;
}
