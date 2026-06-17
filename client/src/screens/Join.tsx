import { useState, useEffect } from 'react';
import { api } from '../api';
import { saveMembership, getMembership } from '../storage';
import type { Event } from '../types';
import type { Lang, Strings } from '../i18n';

interface Props {
  lang: Lang;
  s: Strings;
  dir: string;
  inviteCode: string;
  onJoined: () => void;
}

export default function Join({ lang: _lang, s, dir, inviteCode, onJoined }: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const existing = getMembership(inviteCode);
    if (existing) { onJoined(); return; }

    api.getEvent(inviteCode)
      .then((e) => setEvent(e as Event))
      .catch(() => setError(s.notFound))
      .finally(() => setFetching(false));
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!name.trim()) { setError(s.name); return; }
    if (!event) return;
    setLoading(true);
    setError('');
    try {
      const member = await api.joinEvent(inviteCode, name.trim()) as any;
      saveMembership({
        inviteCode,
        eventName: event.name,
        memberId: member.id,
        memberToken: member.member_token,
        memberName: member.name,
        currency: event.currency,
        createdAt: new Date().toISOString(),
      });
      onJoined();
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div dir={dir} style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontSize: 16, color: 'var(--sub)' }}>
        {s.loading}
      </div>
    );
  }

  if (!event && error) {
    return (
      <div dir={dir} style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24, gap: 16 }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{error}</div>
        <div style={{ fontSize: 13, color: 'var(--sub)' }}>{s.checkLink}</div>
      </div>
    );
  }

  return (
    <div dir={dir} style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '60px 24px 40px' }}>
      <div style={{ width: 62, height: 62, borderRadius: 18, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 36, fontWeight: 800, marginBottom: 24, marginTop: 30 }}>÷</div>

      <div style={{ fontSize: 24, fontWeight: 800 }}>{s.joinTrip}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>{event?.name}</div>
      <div style={{ fontSize: 13, color: 'var(--sub)', fontWeight: 600, marginTop: 6 }}>
        {event?.members.length} {event?.members.length === 1 ? s.person : s.persons}
      </div>

      {event && event.members.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 4, flexWrap: 'wrap' }}>
          {event.members.slice(0, 5).map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--chip)', borderRadius: 100, padding: '6px 12px 6px 8px', fontSize: 13, fontWeight: 600 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                {m.name[0]}
              </div>
              {m.name}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.name}</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder={s.namePlaceholder}
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', direction: dir as any }}
        />
      </div>

      {error && <div style={{ color: 'var(--negative)', fontSize: 13, fontWeight: 600, marginTop: 12 }}>{error}</div>}

      <button
        onClick={handleJoin}
        disabled={loading}
        style={{
          marginTop: 28, width: '100%', height: 54, borderRadius: 'var(--r-btn)',
          background: loading ? 'var(--sub)' : 'var(--accent)', color: '#fff',
          border: 'none', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)',
          boxShadow: 'var(--btn-shadow)', cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? s.joining : s.joinNow}
      </button>
    </div>
  );
}
