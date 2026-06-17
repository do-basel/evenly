import { useState } from 'react';
import { api } from '../api';
import { saveAuth } from '../storage';
import type { Lang, Strings } from '../i18n';

interface Props {
  lang: Lang;
  s: Strings;
  onDone: () => void;
}

export default function AuthScreen({ lang, s, onDone }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError(mode === 'login' ? s.login : s.register); return; }
    if (mode === 'register' && !name.trim()) { setError(s.name); return; }
    setLoading(true);
    try {
      const result: any = mode === 'login'
        ? await api.login(email.trim(), password)
        : await api.register(email.trim(), password, name.trim());
      saveAuth({ token: result.token, user: result.user });
      onDone();
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={dir} style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '60px 24px 40px' }}>
      {/* Logo */}
      <div style={{ width: 62, height: 62, borderRadius: 18, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 36, fontWeight: 800, marginBottom: 26, marginTop: 20 }}>÷</div>

      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>{s.welcome}</div>
      <div style={{ fontSize: 14, color: 'var(--sub)', fontWeight: 600, marginTop: 6, marginBottom: 32 }}>{s.welcomeSub}</div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, background: 'var(--chip)', borderRadius: 'var(--r-pill)', padding: 4, marginBottom: 24 }}>
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); }}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: 14,
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
              background: mode === m ? 'var(--accent)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--ink)',
            }}
          >
            {m === 'login' ? s.login : s.register}
          </button>
        ))}
      </div>

      {mode === 'register' && (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.name}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={s.namePlaceholder}
            style={inputStyle}
          />
        </>
      )}

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.email}</div>
      <input
        type="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={s.emailPlaceholder}
        style={{ ...inputStyle, direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left' }}
      />

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>{s.password}</div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder={s.passwordPlaceholder}
        style={{ ...inputStyle, direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left', marginBottom: 8 }}
      />

      {error && <div style={{ color: 'var(--negative)', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 16, height: 54, borderRadius: 'var(--r-btn)',
          background: loading ? 'var(--sub)' : 'var(--accent)', color: '#fff',
          border: 'none', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)',
          boxShadow: 'var(--btn-shadow)', cursor: loading ? 'not-allowed' : 'pointer', width: '100%',
        }}
      >
        {loading ? s.saving : (mode === 'login' ? s.login : s.register)}
      </button>

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--sub)', fontWeight: 600 }}>
        {s.identityStored}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 15, fontWeight: 600,
  fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', marginBottom: 18,
  display: 'block',
};
