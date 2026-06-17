import { useState, useRef } from 'react';
import { api } from '../api';
import { saveMembership, getAuth } from '../storage';
import type { Lang, Strings } from '../i18n';

interface Props {
  lang: Lang;
  s: Strings;
  dir: string;
  onBack: () => void;
  onCreated: (inviteCode: string, name: string) => void;
}

const CURRENCIES = [
  { code: 'SAR', label: 'ر.س' },
  { code: 'USD', label: '$' },
  { code: 'EUR', label: '€' },
];
const TRIP_EMOJIS = ['🏜️', '⛺️', '🏝️', '🗺️', '🏔️', '🌊', '🏕️', '✈️', '🎿', '🚗'];

export default function CreateTrip({ lang: _lang, s, dir, onBack, onCreated }: Props) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [emoji] = useState(() => TRIP_EMOJIS[Math.floor(Math.random() * TRIP_EMOJIS.length)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError(s.tripName); return; }
    setLoading(true);
    setError('');
    try {
      const event = await api.createEvent(name.trim(), currency) as any;
      const auth = getAuth();
      const joined = await api.joinEvent(event.invite_code, auth?.user.name ?? 'أنا') as any;
      saveMembership({
        inviteCode: event.invite_code,
        eventName: event.name,
        memberId: joined.id,
        memberToken: joined.member_token,
        memberName: joined.name,
        currency: event.currency,
        createdAt: event.created_at,
      });
      onCreated(event.invite_code, event.name);
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={dir} style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '52px 24px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{s.newTripTitle}</div>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 18, color: 'var(--sub)', cursor: 'pointer' }}>×</button>
      </div>

      {/* Trip photo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{ width: 104, height: 104, borderRadius: 26, background: photoPreview ? 'transparent' : 'var(--chip)', border: '2px dashed var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'var(--sub)', cursor: 'pointer', overflow: 'hidden' }}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="trip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              <span style={{ fontSize: 28 }}>{emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{s.tripPhoto}</span>
            </>
          )}
        </div>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.tripName}</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={s.tripNamePlaceholder}
        style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', direction: dir as any, marginBottom: 22 }}
      />

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 11 }}>{s.tripCurrency}</div>
      <div style={{ display: 'flex', gap: 8, background: 'var(--chip)', borderRadius: 'var(--r-pill)', padding: 4, marginBottom: 32 }}>
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            onClick={() => setCurrency(c.code)}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: 14,
              fontFamily: 'var(--font-body)', border: 'none', cursor: 'pointer',
              background: currency === c.code ? 'var(--accent)' : 'transparent',
              color: currency === c.code ? '#fff' : 'var(--ink)',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && <div style={{ color: 'var(--negative)', fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

      <button
        onClick={handleCreate}
        disabled={loading}
        style={{
          width: '100%', height: 54, borderRadius: 'var(--r-btn)', background: loading ? 'var(--sub)' : 'var(--accent)',
          color: '#fff', border: 'none', fontSize: 16, fontWeight: 700,
          fontFamily: 'var(--font-body)', boxShadow: 'var(--btn-shadow)', cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? s.creating : s.createTrip}
      </button>
    </div>
  );
}
