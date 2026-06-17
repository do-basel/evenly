import type { StoredMembership } from './types';

const MEMBERSHIPS_KEY = 'evenly_memberships';
const PROFILE_KEY = 'evenly_profile';

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

export interface Profile {
  name: string;
}

export function getProfile(): Profile | null {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}

export function formatCurrency(cents: number, currency: string): string {
  const amount = Math.abs(cents) / 100;
  const formatted = amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbols: Record<string, string> = { SAR: 'ر.س', USD: '$', EUR: '€' };
  return `${formatted} ${symbols[currency] ?? currency}`;
}
