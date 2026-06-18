import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { getMembership, getMemberships, formatCurrency } from '../storage';
import type { Event, ExpenseWithSplits } from '../types';
import type { Lang, Strings } from '../i18n';

interface Props {
  lang: Lang;
  s: Strings;
  dir: string;
  inviteCode: string;
  onBack: () => void;
  onAddExpense: (event: Event) => void;
  onEditExpense: (event: Event, expense: ExpenseWithSplits) => void;
  onSettlement: (event: Event) => void;
  onTripSettings: (event: Event) => void;
}

function Avatar({ name, photo, size = 36 }: { name: string; photo?: string | null; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name[0]}
    </div>
  );
}

export default function EventHome({ lang: _lang, s, dir, inviteCode, onBack, onAddExpense, onEditExpense, onSettlement, onTripSettings }: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const membership = getMembership(inviteCode);
  const [myPhoto, setMyPhoto] = useState<string | null>(null);

  const handleMyPhotoChange = async (file: File) => {
    if (!membership) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await api.updateMemberPhoto(inviteCode, membership.memberToken, dataUrl);
        setMyPhoto(dataUrl);
      } catch { /* ignore */ }
    };
    reader.readAsDataURL(file);
  };

  const load = useCallback(async () => {
    try {
      const e = await api.getEvent(inviteCode, membership?.memberToken) as Event;
      setEvent(e);
      // Seed my photo from member list
      if (membership) {
        const me = e.members.find((m) => m.id === membership.memberId);
        if (me?.photo_url) setMyPhoto(me.photo_url);
      }
      // Sync trip photo to localStorage so MyTrips can display it
      if (e.photo_url !== undefined) {
        const all = getMemberships();
        const updated = all.map((m) =>
          m.inviteCode === inviteCode ? { ...m, tripPhotoUrl: e.photo_url } : m
        );
        localStorage.setItem('evenly_memberships', JSON.stringify(updated));
      }
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, [inviteCode]);

  useEffect(() => { load(); }, [load]);


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
          {membership && (
            <button
              onClick={() => onTripSettings(event)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 15, cursor: 'pointer', color: 'var(--ink)', flexShrink: 0 }}
            >
              ⚙
            </button>
          )}
          {/* My avatar — tap to change photo */}
          {membership && (
            <label style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
              {myPhoto
                ? <img src={myPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : membership.memberName?.[0] ?? '؟'}
              <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMyPhotoChange(f); }} />
            </label>
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
              <Avatar name={m.name} photo={m.photo_url} size={32} />
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--sub)', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 0' }}>
        {(() => {
          const myId = membership?.memberId;
          const visibleExpenses = myId
            ? event.expenses.filter((e) =>
                e.paid_by === myId || e.splits.some((sp) => sp.member_id === myId)
              )
            : event.expenses;

          if (visibleExpenses.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--sub)', fontSize: 14, fontWeight: 600 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
                {s.noExpenses}
              </div>
            );
          }

          return visibleExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              currency={event.currency}
              memberName={memberName}
              myMemberId={myId}
              s={s}
              onEdit={() => onEditExpense(event, expense)}
            />
          ));
        })()}
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

function ExpenseCard({ expense, currency, memberName, myMemberId, s, onEdit }: {
  expense: ExpenseWithSplits;
  currency: string;
  memberName: (id: string) => string;
  myMemberId?: string;
  s: Strings;
  onEdit: () => void;
}) {
  const [showReceipt, setShowReceipt] = useState(false);
  const mySplit = expense.splits.find((sp) => sp.member_id === myMemberId);
  const isMyExpense = expense.created_by === myMemberId;

  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)', padding: '13px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{expense.description}</div>
            <div style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600, marginTop: 3 }}>
              {s.paidByMember} {memberName(expense.paid_by)}
            </div>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Hanken Grotesk, sans-serif' }}>
              {formatCurrency(expense.amount_cents, currency)}
            </div>
            {mySplit && (
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sub)' }}>
                {s.myShare}: {formatCurrency(mySplit.amount_cents, currency)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {expense.receipt_url && (
                <button
                  onClick={() => setShowReceipt(true)}
                  style={{ fontSize: 11, fontWeight: 700, color: 'var(--sub)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font-body)' }}
                >
                  🧾 {s.viewReceipt}
                </button>
              )}
              {isMyExpense && (
                <button
                  onClick={onEdit}
                  style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'var(--font-body)' }}
                >
                  {s.editExpense} ✎
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt full-screen overlay */}
      {showReceipt && expense.receipt_url && (
        <div
          onClick={() => setShowReceipt(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <img
            src={expense.receipt_url}
            alt="receipt"
            style={{ maxWidth: '100%', maxHeight: '90dvh', borderRadius: 12, objectFit: 'contain' }}
          />
          <button
            onClick={() => setShowReceipt(false)}
            style={{ position: 'absolute', top: 20, insetInlineEnd: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: 18, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
