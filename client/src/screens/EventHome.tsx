import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { getMembership, formatCurrency } from '../storage';
import type { Event, ExpenseWithSplits } from '../types';
import type { Lang, Strings } from '../i18n';

interface Props {
  lang: Lang;
  s: Strings;
  dir: string;
  inviteCode: string;
  onBack: () => void;
  onAddExpense: (event: Event) => void;
  onSettlement: (event: Event) => void;
  onTripSettings: (event: Event) => void;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {name[0]}
    </div>
  );
}

export default function EventHome({ lang: _lang, s, dir, inviteCode, onBack, onAddExpense, onSettlement, onTripSettings }: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const membership = getMembership(inviteCode);

  const load = useCallback(async () => {
    try {
      const e = await api.getEvent(inviteCode) as Event;
      setEvent(e);
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, [inviteCode]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (expenseId: string) => {
    if (!membership) return;
    setDeleting(expenseId);
    try {
      await api.deleteExpense(inviteCode, expenseId, membership.memberToken);
      await load();
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const memberName = (id: string) => event?.members.find((m) => m.id === id)?.name ?? '؟';
  const myBalance = event?.balances.find((b) => b.memberId === membership?.memberId);

  if (loading) {
    return (
      <div dir={dir} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontSize: 16, color: 'var(--sub)' }}>
        {s.loading}
      </div>
    );
  }

  if (!event) {
    return (
      <div dir={dir} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24, gap: 16 }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{s.loadFailed}</div>
        <button onClick={onBack} style={{ padding: '12px 24px', borderRadius: 'var(--r-btn)', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{s.back}</button>
      </div>
    );
  }

  const shareLink = `${window.location.origin}/j/${inviteCode}`;

  return (
    <div dir={dir} style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer', color: 'var(--ink)', flexShrink: 0 }}>
            {dir === 'rtl' ? '→' : '←'}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{event.name}</div>
            <div style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600, marginTop: 1 }}>{event.members.length} {s.persons} · {event.currency}</div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareLink).catch(() => {});
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            style={{ width: 32, height: 32, borderRadius: '50%', background: copiedLink ? 'var(--positive)' : 'var(--chip)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: copiedLink ? '#fff' : 'var(--accent)', flexShrink: 0 }}
          >
            {copiedLink ? '✓' : '🔗'}
          </button>
          {membership?.isCreator && (
            <button
              onClick={() => onTripSettings(event)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 15, cursor: 'pointer', color: 'var(--ink)', flexShrink: 0 }}
            >
              ⚙
            </button>
          )}
        </div>

        {myBalance && (
          <div style={{ background: myBalance.netCents >= 0 ? '#EEF7F1' : '#FDF0EE', borderRadius: 'var(--r-card)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)' }}>
              {myBalance.netCents >= 0 ? s.owed : s.owes}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: myBalance.netCents >= 0 ? 'var(--positive)' : 'var(--negative)', fontFamily: 'Hanken Grotesk, sans-serif' }}>
              {formatCurrency(myBalance.netCents, event.currency)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 2 }}>
          {event.members.map((m) => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Avatar name={m.name} size={32} />
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--sub)', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 0' }}>
        {event.expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--sub)', fontSize: 14, fontWeight: 600 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
            {s.noExpenses}
          </div>
        ) : (
          event.expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              currency={event.currency}
              memberName={memberName}
              myMemberId={membership?.memberId}
              onDelete={() => handleDelete(expense.id)}
              deleting={deleting === expense.id}
              s={s}
            />
          ))
        )}
      </div>

      {/* Bottom actions */}
      <div style={{ padding: '16px 20px 32px', display: 'flex', gap: 10 }}>
        <button
          onClick={() => onAddExpense(event)}
          style={{ flex: 1, height: 52, borderRadius: 'var(--r-btn)', background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)', boxShadow: 'var(--btn-shadow)', cursor: 'pointer' }}
        >
          + {s.newExpense}
        </button>
        <button
          onClick={() => onSettlement(event)}
          style={{ flex: 1, height: 52, borderRadius: 'var(--r-btn)', background: 'var(--surface)', color: 'var(--accent)', border: '1.5px solid var(--accent)', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
        >
          ÷ {s.settlement}
        </button>
      </div>
    </div>
  );
}

function ExpenseCard({ expense, currency, memberName, myMemberId, onDelete, deleting, s }: {
  expense: ExpenseWithSplits;
  currency: string;
  memberName: (id: string) => string;
  myMemberId?: string;
  onDelete: () => void;
  deleting: boolean;
  s: Strings;
}) {
  const isOwner = expense.created_by === myMemberId;
  const mySplit = expense.splits.find((sp) => sp.member_id === myMemberId);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)', padding: '13px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{expense.description}</div>
          <div style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600, marginTop: 3 }}>
            {s.paidByMember} {memberName(expense.paid_by)}
          </div>
        </div>
        <div style={{ textAlign: 'left', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Hanken Grotesk, sans-serif' }}>
            {formatCurrency(expense.amount_cents, currency)}
          </div>
          {mySplit && (
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sub)' }}>
              {s.myShare}: {formatCurrency(mySplit.amount_cents, currency)}
            </div>
          )}
        </div>
      </div>
      {isOwner && (
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--negative)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}
        >
          {deleting ? s.deleting : s.delete}
        </button>
      )}
    </div>
  );
}
