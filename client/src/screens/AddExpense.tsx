import { useState } from 'react';
import { api } from '../api';
import { getMembership } from '../storage';
import type { Event } from '../types';

interface Props {
  inviteCode: string;
  event: Event;
  onBack: () => void;
  onSaved: () => void;
}

type SplitType = 'equal' | 'percentage' | 'shares';

export default function AddExpense({ inviteCode, event, onBack, onSaved }: Props) {
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
    if (!description.trim()) { setError('أدخل وصف المصروف'); return; }
    if (!amountStr || amountCents <= 0) { setError('أدخل المبلغ'); return; }
    if (!membership) { setError('لم يتم التعرف عليك'); return; }

    const participants = event.members.map((m) => ({
      memberId: m.id,
      shareValue: splitType === 'equal' ? 1 : Number(overrides[m.id] ?? 0),
    }));

    if (splitType === 'percentage') {
      const total = participants.reduce((s, p) => s + p.shareValue, 0);
      if (Math.round(total) !== 100) { setError('النسب يجب أن تساوي 100'); return; }
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
    equal: 'بالتساوي',
    percentage: 'بالنسبة %',
    shares: 'بالحصص',
  };

  return (
    <div dir="rtl" style={{ minHeight: '844px', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 90, height: 26, background: '#000', borderRadius: 14, zIndex: 30 }} />

      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', color: 'var(--ink)' }}>←</button>
        <div style={{ fontSize: 20, fontWeight: 800 }}>مصروف جديد</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {/* Description */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>الوصف</div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="مثال: عشاء، تاكسي..."
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 15, fontWeight: 600, color: 'var(--ink)', outline: 'none', direction: 'rtl', marginBottom: 18 }}
        />

        {/* Amount */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>المبلغ ({event.currency})</div>
        <input
          type="number"
          inputMode="decimal"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          placeholder="0.00"
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 18, fontWeight: 700, color: 'var(--ink)', outline: 'none', direction: 'ltr', textAlign: 'left', marginBottom: 18, fontFamily: 'Hanken Grotesk, sans-serif' }}
        />

        {/* Paid by */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>دفع بواسطة</div>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 15, fontWeight: 600, color: 'var(--ink)', outline: 'none', direction: 'rtl', marginBottom: 18, fontFamily: 'var(--font-body)' }}
        >
          {event.members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.id === membership?.memberId ? ' (أنت)' : ''}</option>
          ))}
        </select>

        {/* Split type */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>طريقة القسمة</div>
        <div style={{ display: 'flex', gap: 8, background: 'var(--chip)', borderRadius: 'var(--r-pill)', padding: 4, marginBottom: 20 }}>
          {(['equal', 'percentage', 'shares'] as SplitType[]).map((t) => (
            <button
              key={t}
              onClick={() => setSplitType(t)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: 12,
                fontFamily: 'var(--font-body)', border: 'none', cursor: 'pointer',
                background: splitType === t ? 'var(--accent)' : 'transparent',
                color: splitType === t ? '#fff' : 'var(--ink)',
              }}
            >
              {SPLIT_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Overrides for percentage/shares */}
        {splitType !== 'equal' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 10 }}>
              {splitType === 'percentage' ? 'النسب (المجموع = 100)' : 'الحصص'}
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
          style={{
            width: '100%', height: 54, borderRadius: 'var(--r-btn)',
            background: loading ? 'var(--sub)' : 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)',
            boxShadow: 'var(--btn-shadow)', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'جارٍ الحفظ...' : 'حفظ المصروف'}
        </button>
      </div>
    </div>
  );
}
