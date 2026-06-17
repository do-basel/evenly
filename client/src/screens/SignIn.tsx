import { useState } from 'react';
import { saveProfile } from '../storage';

interface Props { onDone: () => void; }

export default function SignIn({ onDone }: Props) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    saveProfile({ name: name.trim() });
    onDone();
  };

  return (
    <div dir="rtl" style={{ height: '100%', minHeight: '844px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '60px 24px 40px' }}>
      {/* Notch */}
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 90, height: 26, background: '#000', borderRadius: 14, zIndex: 30 }} />

      {/* Logo */}
      <div style={{ width: 62, height: 62, borderRadius: 18, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-ink)', fontSize: 36, fontWeight: 800, marginBottom: 26, marginTop: 40 }}>÷</div>

      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.01em' }}>أهلاً بك في Evenly</div>
      <div style={{ fontSize: 14, color: 'var(--sub)', fontWeight: 600, marginTop: 6 }}>أدخل اسمك لمتابعة رحلاتك ومصاريفك</div>

      <div style={{ marginTop: 36 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>اسمك</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="مثال: أحمد"
          style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 15, fontWeight: 600,
            fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', direction: 'rtl',
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        style={{
          marginTop: 32, height: 54, borderRadius: 'var(--r-btn)', background: 'var(--accent)',
          color: 'var(--accent-ink)', border: 'none', fontSize: 16, fontWeight: 700,
          fontFamily: 'var(--font-body)', boxShadow: 'var(--btn-shadow)', cursor: 'pointer', width: '100%',
        }}
      >
        الدخول
      </button>

      <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--sub)', fontWeight: 600 }}>
        هويتك محفوظة على جهازك فقط
      </div>
    </div>
  );
}
