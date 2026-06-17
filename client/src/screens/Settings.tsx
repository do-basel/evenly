import { useState, useRef } from 'react';
import { api } from '../api';
import { getAuth, saveAuth } from '../storage';
import type { Lang, Strings } from '../i18n';

interface Props {
  lang: Lang;
  s: Strings;
  onBack: () => void;
  onLanguageChange: (lang: Lang) => void;
  onSignOut: () => void;
}

export default function Settings({ lang, s, onBack, onLanguageChange, onSignOut }: Props) {
  const auth = getAuth()!;
  const [name, setName] = useState(auth.user.name);
  const [photo, setPhoto] = useState<string | null>(auth.user.photo_url);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('الصورة كبيرة جداً (الحد 2MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError(s.name); return; }
    setSaving(true);
    setError('');
    try {
      const updated: any = await api.updateMe({ name: name.trim(), photo_url: photo });
      saveAuth({ token: auth.token, user: { ...auth.user, ...updated } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleLangChange = async (newLang: Lang) => {
    try {
      const updated: any = await api.updateMe({ language: newLang });
      saveAuth({ token: auth.token, user: { ...auth.user, ...updated } });
    } catch { /* ignore */ }
    onLanguageChange(newLang);
  };

  const initial = name[0]?.toUpperCase() ?? '؟';

  return (
    <div dir={dir} style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
        <button
          onClick={onBack}
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer', color: 'var(--ink)', flexShrink: 0 }}
        >
          {lang === 'ar' ? '→' : '←'}
        </button>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{s.settings}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        {/* Profile photo */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 12 }}>{s.profilePhoto}</div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: '50%', cursor: 'pointer',
              background: photo ? 'transparent' : 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 28, fontWeight: 700, overflow: 'hidden', flexShrink: 0,
              border: '2px dashed var(--line)',
            }}
          >
            {photo
              ? <img src={photo} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{s.tapToChange}</div>
            <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 3 }}>JPG, PNG — max 2MB</div>
          </div>
        </div>

        {/* Display name */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.displayName}</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 15, fontWeight: 600,
            fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', direction: dir, marginBottom: 24,
          }}
        />

        {/* Language */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 12 }}>{s.language}</div>
        <div style={{ display: 'flex', gap: 8, background: 'var(--chip)', borderRadius: 'var(--r-pill)', padding: 4, marginBottom: 28 }}>
          {(['ar', 'en'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => handleLangChange(l)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: 14,
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                background: lang === l ? 'var(--accent)' : 'transparent',
                color: lang === l ? '#fff' : 'var(--ink)',
              }}
            >
              {l === 'ar' ? s.arabic : s.english}
            </button>
          ))}
        </div>

        {/* Email (read-only) */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.email}</div>
        <div style={{
          width: '100%', background: 'var(--chip)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 14, fontWeight: 600,
          color: 'var(--sub)', direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left', marginBottom: 28,
        }}>
          {auth.user.email}
        </div>

        {error && <div style={{ color: 'var(--negative)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', height: 52, borderRadius: 'var(--r-btn)',
            background: saved ? 'var(--positive)' : saving ? 'var(--sub)' : 'var(--accent)',
            color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
            fontFamily: 'var(--font-body)', boxShadow: 'var(--btn-shadow)',
            cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 16,
          }}
        >
          {saved ? s.saved : saving ? s.saving : s.saveChanges}
        </button>

        <button
          onClick={onSignOut}
          style={{
            width: '100%', height: 52, borderRadius: 'var(--r-btn)',
            background: 'var(--surface)', color: 'var(--negative)',
            border: '1.5px solid var(--negative)', fontSize: 15, fontWeight: 700,
            fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}
        >
          {s.signOut}
        </button>
      </div>
    </div>
  );
}
