import { useState, useEffect } from 'react';
import { getMemberships, getAuth } from '../storage';
import type { StoredMembership } from '../types';
import type { Lang, Strings } from '../i18n';

interface Props {
  lang: Lang;
  s: Strings;
  dir: string;
  onCreateTrip: () => void;
  onOpenTrip: (code: string) => void;
  onSettings: () => void;
}

const TRIP_COLORS = [
  'linear-gradient(150deg,#E7B193,#CF8260)',
  'linear-gradient(150deg,#9DBE9F,#5E8769)',
  'linear-gradient(150deg,#C7BBA8,#9B8470)',
  'linear-gradient(150deg,#B5C7E0,#6E8FB0)',
  'linear-gradient(150deg,#E8C49A,#C9863A)',
];
const TRIP_EMOJIS = ['🏜️', '⛺️', '🏝️', '🗺️', '🏔️', '🌊', '🏕️', '✈️'];

export default function MyTrips({ lang: _lang, s, dir, onCreateTrip, onOpenTrip, onSettings }: Props) {
  const [memberships, setMemberships] = useState<StoredMembership[]>([]);
  const auth = getAuth();
  const photo = auth?.user.photo_url;
  const initial = auth?.user.name?.[0]?.toUpperCase() ?? '؟';

  useEffect(() => { setMemberships(getMemberships()); }, []);

  return (
    <div dir={dir} style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <button
          onClick={onSettings}
          style={{
            width: 38, height: 38, borderRadius: '50%', background: photo ? 'transparent' : 'var(--accent)',
            color: '#fff', border: photo ? '2px solid var(--line)' : 'none',
            fontSize: 15, fontWeight: 700, cursor: 'pointer', overflow: 'hidden', flexShrink: 0, padding: 0,
          }}
        >
          {photo
            ? <img src={photo} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initial}
        </button>
        <div style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>{s.myTrips}</div>
          <div style={{ fontSize: 13, color: 'var(--sub)', fontWeight: 600, marginTop: 2 }}>
            {memberships.length} {memberships.length === 1 ? s.trip : s.trips}
          </div>
        </div>
      </div>

      {/* Trips list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
        {memberships.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--sub)', fontSize: 14, fontWeight: 600 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✈️</div>
            {s.noTrips}
          </div>
        ) : (
          memberships.map((m, i) => (
            <div
              key={m.inviteCode}
              onClick={() => onOpenTrip(m.inviteCode)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--surface)', border: '1px solid var(--line)',
                boxShadow: 'var(--card-shadow)', borderRadius: 'var(--r-card)',
                padding: 13, cursor: 'pointer', marginBottom: 12,
              }}
            >
              <div style={{ width: 54, height: 54, borderRadius: 'var(--r-card)', background: TRIP_COLORS[i % TRIP_COLORS.length], flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                {TRIP_EMOJIS[i % TRIP_EMOJIS.length]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16.5, fontWeight: 800 }}>{m.eventName}</div>
                <div style={{ fontSize: 12.5, color: 'var(--sub)', fontWeight: 600, marginTop: 2 }}>{m.memberName}</div>
              </div>
              <div style={{ textAlign: dir === 'rtl' ? 'left' : 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11.5, color: 'var(--sub)', fontWeight: 600 }}>{s.trip}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Hanken Grotesk, sans-serif' }}>{m.currency}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create button */}
      <div style={{ padding: '16px 20px 32px' }}>
        <button
          onClick={onCreateTrip}
          style={{
            width: '100%', height: 54, borderRadius: 'var(--r-btn)', background: 'var(--accent)',
            color: '#fff', border: 'none', fontSize: 16, fontWeight: 700,
            fontFamily: 'var(--font-body)', boxShadow: 'var(--btn-shadow)', cursor: 'pointer',
          }}
        >
          {s.newTrip}
        </button>
      </div>
    </div>
  );
}
