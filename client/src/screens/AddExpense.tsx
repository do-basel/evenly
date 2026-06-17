import { useState } from 'react';
import { api } from '../api';
import { getMembership } from '../storage';
// removed unused: formatCurrency from '../storage';
import type { Event } from '../types';
import type { Lang, Strings } from '../i18n';

interface Props {
  lang: Lang;
  s: Strings;
  dir: string;
  inviteCode: string;
  event: Event;
  onBack: () => void;
  onSaved: () => void;
}

type SplitType = 'equal' | 'percentage' | 'shares';

export default function AddExpense({ lang: _lang, s, dir, inviteCode, event, onBack, onSaved }: Props) {
  const membership = getMembership(inviteCode);
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidBy, setPaidBy] = useState(membership?.memberId ?? event.members[0]?.id ?? '');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amountCents = Math.round(parseFloat(amountStr || '0') * 100);

  const handleSubmit = async () => {
    if (!description.trim()) { setError(s.description); return; }
    if (!amountStr || amountCents <= 0) { setError(s.amount); return; }
    if (!membership) return;

    const participants = event.members.map((m) => ({
      memberId: m.id,
      shareValue: splitType === 'equal' ? 1 : Number(overrides[m.id] ?? 0),
    }));

    if (splitType === 'percentage') {
      const total = participants.reduce((sum, p) => sum + p.shareValue, 0);
      if (Math.round(total) !== 100) { setError(s.percentTotal); return; }
    }

    setLoading(true);
    setError('');
    try {
      await api.addExpense(inviteCode, membership.memberToken, {
        description: description.trim(),
        amount_cents: amountCents,
        paid_by: paidBy,
        split_type: splitType,
        participants,
      });
      onSaved();
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const SPLIT_LABELS: Record<SplitType, string> = {
    equal: s.equally,
    percentage: s.byPercent,
    shares: s.byShares,
  };

  return (
    <div dir={dir} style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer', color: 'var(--ink)', flexShrink: 0 }}>
          {dir === 'rtl' ? '→' : '←'}
        </button>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{s.newExpense}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.description}</div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={s.expenseDescPlaceholder}
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 15, fontWeight: 600, color: 'var(--ink)', outline: 'none', direction: dir as any, marginBottom: 18 }}
        />

        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.amount} ({event.currency})</div>
        <input
          type="number"
          inputMode="decimal"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          placeholder="0.00"
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 18, fontWeight: 700, color: 'var(--ink)', outline: 'none', direction: 'ltr', textAlign: 'left', marginBottom: 18, fontFamily: 'Hanken Grotesk, sans-serif' }}
        />

        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.paidBy}</div>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 15, fontWeight: 600, color: 'var(--ink)', outline: 'none', direction: dir as any, marginBottom: 18, fontFamily: 'var(--font-body)' }}
        >
          {event.members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.id === membership?.memberId ? ` (${s.you})` : ''}</option>
          ))}
        </select>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.splitMethod}</div>
        <div style={{ display: 'flex', gap: 8, background: 'var(--chip)', borderRadius: 'var(--r-pill)', padding: 4, marginBottom: 20 }}>
          {(['equal', 'percentage', 'shares'] as SplitType[]).map((tp) => (
            <button
              key={tp}
              onClick={() => setSplitType(tp)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: 12,
                fontFamily: 'var(--font-body)', border: 'none', cursor: 'pointer',
                background: splitType === tp ? 'var(--accent)' : 'transparent',
                color: splitType === tp ? '#fff' : 'var(--ink)',
              }}
            >
              {SPLIT_LABELS[tp]}
            </button>
          ))}
        </div>

        {splitType !== 'equal' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 10 }}>
              {splitType === 'percentage' ? s.percentTotal : s.shares}
            </div>
            {event.members.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={overrides[m.id] ?? ''}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder={splitType === 'percentage' ? '%' : '#'}
                  style={{ width: 80, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', outline: 'none', direction: 'ltr', textAlign: 'center', fontFamily: 'Hanken Grotesk, sans-serif' }}
                />
              </div>
            ))}
          </div>
        )}

        {error && <div style={{ color: 'var(--negative)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
      </div>

      <div style={{ padding: '16px 20px 32px' }}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', height: 54, borderRadius: 'var(--r-btn)', background: loading ? 'var(--sub)' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)', boxShadow: 'var(--btn-shadow)', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? s.saving2 : s.save}
        </button>
      </div>
    </div>
  );
}
