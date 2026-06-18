import { useState } from 'react';
import { api } from '../api';
import { getMembership, formatCurrency } from '../storage';
import type { Event } from '../types';
import type { Lang, Strings } from '../i18n';

interface Props {
  lang: Lang;
  s: Strings;
  dir: string;
  inviteCode: string;
  event: Event;
  onBack: () => void;
}

export default function Settlement({ lang: _lang, s, dir, inviteCode, event, onBack }: Props) {
  const { settlement, members, currency } = event;
  const membership = getMembership(inviteCode);
  const myId = membership?.memberId;

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const memberPhoto = (id: string) => members.find((m) => m.id === id)?.photo_url ?? null;

  const myDebts = settlement.filter((p) => p.fromMemberId === myId);
  const owedToMe = settlement.filter((p) => p.toMemberId === myId);

  const [settling, setSettling] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [partial, setPartial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const openSettle = (toId: string, fullCents: number) => {
    setSettling(toId);
    setAmountStr((fullCents / 100).toFixed(2));
    setPartial(false);
    setError('');
  };

  const handleSettle = async () => {
    if (!settling || !membership) return;
    const cents = Math.round(parseFloat(amountStr || '0') * 100);
    if (cents <= 0) { setError(dir === 'rtl' ? 'أدخل مبلغاً صحيحاً' : 'Enter a valid amount'); return; }
    setLoading(true);
    setError('');
    try {
      await api.markSettled(inviteCode, membership.memberToken, settling, cents);
      setSettled((prev) => new Set([...prev, settling]));
      setSettling(null);
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const Avatar = ({ id }: { id: string }) => {
    const photo = memberPhoto(id);
    return (
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
        {photo ? <img src={photo} alt={memberName(id)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : memberName(id)[0]}
      </div>
    );
  };

  return (
    <div dir={dir} style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer', color: 'var(--ink)', flexShrink: 0 }}>
          {dir === 'rtl' ? '→' : '←'}
        </button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{s.settleUp}</div>
          <div style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600, marginTop: 1 }}>{event.name}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* I owe */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 12 }}>{s.myDebts}</div>

        {myDebts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0 28px', fontSize: 14, fontWeight: 700, color: 'var(--positive)' }}>
            {s.noDebts}
          </div>
        ) : (
          myDebts.map((p) => {
            const key = p.toMemberId;
            const isSettled = settled.has(key);
            return (
              <div key={key} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)', padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar id={p.toMemberId} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600 }}>{s.iOwe}</div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{memberName(p.toMemberId)}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--negative)', fontFamily: 'Hanken Grotesk, sans-serif' }}>
                      {formatCurrency(p.amountCents, currency)}
                    </div>
                  </div>
                </div>

                {isSettled ? (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: '#EEF7F1', borderRadius: 'var(--r-input)', fontSize: 13, fontWeight: 700, color: 'var(--positive)', textAlign: 'center' }}>
                    {s.settledSuccess}
                  </div>
                ) : settling === key ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 8, background: 'var(--chip)', borderRadius: 'var(--r-pill)', padding: 3, marginBottom: 10 }}>
                      <button
                        onClick={() => { setPartial(false); setAmountStr((p.amountCents / 100).toFixed(2)); }}
                        style={{ flex: 1, padding: '9px 0', borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: 12.5, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', background: !partial ? 'var(--accent)' : 'transparent', color: !partial ? '#fff' : 'var(--ink)' }}
                      >
                        {s.fullAmount}
                      </button>
                      <button
                        onClick={() => { setPartial(true); setAmountStr(''); }}
                        style={{ flex: 1, padding: '9px 0', borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: 12.5, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', background: partial ? 'var(--accent)' : 'transparent', color: partial ? '#fff' : 'var(--ink)' }}
                      >
                        {s.partialAmount}
                      </button>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sub)', marginBottom: 6 }}>{s.amountToPay} ({currency})</div>
                    <input
                      type="number" inputMode="decimal"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '11px 14px', fontSize: 16, fontWeight: 700, color: 'var(--ink)', outline: 'none', direction: 'ltr', textAlign: 'left', marginBottom: 8, fontFamily: 'Hanken Grotesk, sans-serif' }}
                    />
                    {error && <div style={{ color: 'var(--negative)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{error}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { setSettling(null); setError(''); }}
                        style={{ flex: 1, height: 42, borderRadius: 'var(--r-btn)', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}
                      >
                        {s.cancel}
                      </button>
                      <button
                        onClick={handleSettle}
                        disabled={loading}
                        style={{ flex: 2, height: 42, borderRadius: 'var(--r-btn)', background: loading ? 'var(--sub)' : 'var(--positive)', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', color: '#fff' }}
                      >
                        {loading ? s.settling : s.confirm}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openSettle(key, p.amountCents)}
                    style={{ marginTop: 12, width: '100%', height: 40, borderRadius: 'var(--r-btn)', background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                  >
                    {s.settleBtn}
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Owed to me */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 12, marginTop: 24 }}>{s.owedToMe}</div>

        {owedToMe.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 14, fontWeight: 700, color: 'var(--sub)' }}>
            {s.noOneOwesMe}
          </div>
        ) : (
          owedToMe.map((p) => (
            <div key={p.fromMemberId} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)', padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar id={p.fromMemberId} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600 }}>{memberName(p.fromMemberId)} {s.owesMe}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--positive)', fontFamily: 'Hanken Grotesk, sans-serif', marginTop: 2 }}>
                    {formatCurrency(p.amountCents, currency)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

      </div>

      <div style={{ padding: '16px 20px 32px' }}>
        <button
          onClick={onBack}
          style={{ width: '100%', height: 52, borderRadius: 'var(--r-btn)', background: 'var(--surface)', color: 'var(--accent)', border: '1.5px solid var(--accent)', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
        >
          {s.backToTrip}
        </button>
      </div>
    </div>
  );
}
