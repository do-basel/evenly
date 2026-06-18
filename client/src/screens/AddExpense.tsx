import { useState } from 'react';
import { api } from '../api';
import { getMembership } from '../storage';
import type { Event, ExpenseWithSplits } from '../types';
import type { Lang, Strings } from '../i18n';

interface Props {
  lang: Lang;
  s: Strings;
  dir: string;
  inviteCode: string;
  event: Event;
  expense?: ExpenseWithSplits;
  onBack: () => void;
  onSaved: () => void;
}

type SplitType = 'equal' | 'percentage' | 'manual';

function normalizeSplitType(t: string): SplitType {
  if (t === 'percentage') return 'percentage';
  if (t === 'manual' || t === 'shares') return 'manual';
  return 'equal';
}

function initOverrides(expense: ExpenseWithSplits): Record<string, string> {
  const st = normalizeSplitType(expense.split_type);
  if (st === 'percentage') {
    return Object.fromEntries(expense.splits.map((sp) => [sp.member_id, String(sp.share_value)]));
  }
  if (st === 'manual') {
    return Object.fromEntries(expense.splits.map((sp) => [sp.member_id, (sp.amount_cents / 100).toFixed(2)]));
  }
  return {};
}

export default function AddExpense({ lang: _lang, s, dir, inviteCode, event, expense, onBack, onSaved }: Props) {
  const isEdit = !!expense;
  const membership = getMembership(inviteCode);

  const [description, setDescription] = useState(expense?.description ?? '');
  const [amountStr, setAmountStr] = useState(expense ? (expense.amount_cents / 100).toFixed(2) : '');
  const [paidBy, setPaidBy] = useState(expense?.paid_by ?? membership?.memberId ?? event.members[0]?.id ?? '');
  const [splitType, setSplitType] = useState<SplitType>(() =>
    expense ? normalizeSplitType(expense.split_type) : 'equal'
  );
  const [selectedForEqual, setSelectedForEqual] = useState<Set<string>>(() => {
    if (expense && normalizeSplitType(expense.split_type) === 'equal') {
      return new Set(expense.splits.map((sp) => sp.member_id));
    }
    return new Set(event.members.map((m) => m.id));
  });
  const [overrides, setOverrides] = useState<Record<string, string>>(() =>
    expense ? initOverrides(expense) : {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amountCents = Math.round(parseFloat(amountStr || '0') * 100);

  const handleSubmit = async () => {
    if (!description.trim()) { setError(s.description); return; }
    if (!amountStr || amountCents <= 0) { setError(s.amount); return; }
    if (!membership) return;

    const activeMembers = splitType === 'equal'
      ? event.members.filter((m) => selectedForEqual.has(m.id))
      : event.members;

    if (splitType === 'equal' && activeMembers.length === 0) {
      setError(dir === 'rtl' ? 'اختر عضواً واحداً على الأقل' : 'Select at least one member');
      return;
    }

    if (splitType === 'manual') {
      const totalEntered = event.members.reduce((sum, m) => sum + Math.round(Number(overrides[m.id] ?? 0) * 100), 0);
      if (totalEntered !== amountCents) {
        setError(dir === 'rtl' ? 'مجموع المبالغ يجب أن يساوي الإجمالي' : 'Amounts must sum to the total');
        return;
      }
    }

    const participants = splitType === 'manual'
      ? event.members
          .filter((m) => Number(overrides[m.id] ?? 0) > 0)
          .map((m) => ({ memberId: m.id, shareValue: Math.round(Number(overrides[m.id]) * 100) }))
      : activeMembers.map((m) => ({
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
      const data = {
        description: description.trim(),
        amount_cents: amountCents,
        paid_by: paidBy,
        split_type: splitType,
        participants,
      };
      if (isEdit && expense) {
        await api.updateExpense(expense.id, membership.memberToken, data);
      } else {
        await api.addExpense(inviteCode, membership.memberToken, data);
      }
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
    manual: s.byShares,
  };

  return (
    <div dir={dir} style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer', color: 'var(--ink)', flexShrink: 0 }}>
          {dir === 'rtl' ? '→' : '←'}
        </button>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{isEdit ? s.editExpense : s.newExpense}</div>
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
          type="number" inputMode="decimal"
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
          {(['equal', 'percentage', 'manual'] as SplitType[]).map((tp) => (
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

        {splitType === 'equal' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 10 }}>
              {dir === 'rtl' ? 'الأعضاء المشاركون' : 'Participants'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {event.members.map((m) => {
                const selected = selectedForEqual.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedForEqual((prev) => {
                        const next = new Set(prev);
                        if (next.has(m.id)) { next.delete(m.id); } else { next.add(m.id); }
                        return next;
                      });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: selected ? 'var(--accent)' : 'var(--chip)',
                      color: selected ? '#fff' : 'var(--ink)',
                      border: selected ? 'none' : '1px solid var(--line)',
                      borderRadius: 100, padding: '7px 14px 7px 10px',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: selected ? 'rgba(255,255,255,0.3)' : 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                      {m.name[0]}
                    </div>
                    {m.name}
                    {m.id === membership?.memberId ? ` (${s.you})` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {splitType === 'percentage' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 10 }}>{s.percentTotal}</div>
            {event.members.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                <input
                  type="number" inputMode="decimal"
                  value={overrides[m.id] ?? ''}
                  onChange={(e) => setOverrides((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder="%"
                  style={{ width: 80, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', outline: 'none', direction: 'ltr', textAlign: 'center', fontFamily: 'Hanken Grotesk, sans-serif' }}
                />
              </div>
            ))}
          </div>
        )}

        {splitType === 'manual' && (() => {
          const enteredCents = event.members.reduce((sum, m) => sum + Math.round(Number(overrides[m.id] ?? 0) * 100), 0);
          const remainingCents = amountCents - enteredCents;
          const remainingColor = remainingCents === 0 ? 'var(--positive)' : remainingCents < 0 ? 'var(--negative)' : 'var(--ink)';
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, background: 'var(--chip)', borderRadius: 'var(--r-input)', padding: '10px 14px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)' }}>
                  {dir === 'rtl' ? 'المتبقي للتوزيع' : 'Remaining to assign'}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: remainingColor, fontFamily: 'Hanken Grotesk, sans-serif' }}>
                  {(remainingCents / 100).toFixed(2)} {event.currency}
                </div>
              </div>
              {event.members.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{m.name}{m.id === membership?.memberId ? <span style={{ fontSize: 11, color: 'var(--sub)', marginRight: 4 }}> ({s.you})</span> : ''}</div>
                  <input
                    type="number" inputMode="decimal"
                    value={overrides[m.id] ?? ''}
                    onChange={(e) => setOverrides((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="0.00"
                    style={{ width: 90, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', outline: 'none', direction: 'ltr', textAlign: 'center', fontFamily: 'Hanken Grotesk, sans-serif' }}
                  />
                </div>
              ))}
            </div>
          );
        })()}

        {error && <div style={{ color: 'var(--negative)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}
      </div>

      <div style={{ padding: '16px 20px 32px' }}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', height: 54, borderRadius: 'var(--r-btn)', background: loading ? 'var(--sub)' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)', boxShadow: 'var(--btn-shadow)', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? s.savingEdit : isEdit ? s.saveEdit : s.save}
        </button>
      </div>
    </div>
  );
}
