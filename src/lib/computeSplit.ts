export type SplitType = 'equal' | 'percentage' | 'shares' | 'manual';

export interface SplitParticipant {
  memberId: string;
  shareValue: number;
}

export interface SplitResult {
  memberId: string;
  amountCents: number;
}

export function computeSplit(
  amountCents: number,
  splitType: SplitType,
  participants: SplitParticipant[]
): SplitResult[] {
  if (participants.length === 0) throw new Error('participants cannot be empty');

  if (splitType === 'equal') {
    const base = Math.floor(amountCents / participants.length);
    const remainder = amountCents - base * participants.length;
    return participants.map((p, i) => ({
      memberId: p.memberId,
      amountCents: i < remainder ? base + 1 : base,
    }));
  }

  if (splitType === 'percentage') {
    const total = participants.reduce((s, p) => s + p.shareValue, 0);
    if (Math.round(total) !== 100) throw new Error('Percentages must sum to 100');
    if (participants.some((p) => p.shareValue < 0)) throw new Error('Percentages cannot be negative');
    const raw = participants.map((p) => Math.floor((p.shareValue / 100) * amountCents));
    const distributed = raw.reduce((s, v) => s + v, 0);
    let remainder = amountCents - distributed;
    return participants.map((p, i) => ({
      memberId: p.memberId,
      amountCents: raw[i] + (i < remainder ? 1 : 0),
    }));
  }

  if (splitType === 'shares') {
    if (participants.some((p) => p.shareValue < 0)) throw new Error('Shares cannot be negative');
    const totalShares = participants.reduce((s, p) => s + p.shareValue, 0);
    if (totalShares === 0) throw new Error('Total shares cannot be zero');
    const raw = participants.map((p) => Math.floor((p.shareValue / totalShares) * amountCents));
    const distributed = raw.reduce((s, v) => s + v, 0);
    let remainder = amountCents - distributed;
    return participants.map((p, i) => ({
      memberId: p.memberId,
      amountCents: raw[i] + (i < remainder ? 1 : 0),
    }));
  }

  if (splitType === 'manual') {
    if (participants.some((p) => p.shareValue < 0)) throw new Error('Amounts cannot be negative');
    const totalCents = participants.reduce((s, p) => s + p.shareValue, 0);
    if (totalCents !== amountCents) throw new Error(`Manual amounts must sum to ${amountCents} cents`);
    return participants.map((p) => ({ memberId: p.memberId, amountCents: p.shareValue }));
  }

  throw new Error(`Unknown split type: ${splitType}`);
}
