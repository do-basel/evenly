import Notch from '../components/Notch';
import { useState } from 'react';

interface Props {
  inviteCode: string;
  eventName: string;
  onEnter: () => void;
}

export default function ShareLink({ inviteCode, eventName, onEnter }: Props) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/j/${inviteCode}`;

  const copy = async () => {
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div dir="rtl" style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 40px' }}>
      <Notch />

      {/* Success icon */}
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--positive)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 38, fontWeight: 800, margin: '40px 0 22px' }}>✓</div>

      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em', textAlign: 'center' }}>تم إنشاء الرحلة</div>
      <div style={{ fontSize: 14, color: 'var(--sub)', fontWeight: 600, marginTop: 6, maxWidth: 240, textAlign: 'center' }}>
        شارك الرابط لدعوة أصدقائك — يكتبون أسماءهم عند الدخول
      </div>

      {/* Link box */}
      <div style={{ alignSelf: 'stretch', marginTop: 30, background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 'var(--r-input)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }} dir="ltr">
        <span style={{ fontSize: 16, color: 'var(--sub)', flexShrink: 0 }}>🔗</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', fontFamily: 'Hanken Grotesk, sans-serif', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {link}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ alignSelf: 'stretch', display: 'flex', gap: 10, marginTop: 12 }}>
        <button
          onClick={copy}
          style={{
            flex: 1, height: 50, borderRadius: 'var(--r-btn)', background: copied ? 'var(--positive)' : 'var(--accent)',
            color: 'var(--accent-ink)', border: 'none', fontSize: 15, fontWeight: 700,
            fontFamily: 'var(--font-body)', boxShadow: 'var(--btn-shadow)', cursor: 'pointer',
          }}
        >
          {copied ? '✓ تم النسخ' : 'نسخ الرابط'}
        </button>
        <button
          onClick={() => navigator.share?.({ url: link, title: `انضم إلى رحلة ${eventName}` }).catch(() => {})}
          style={{ width: 50, height: 50, borderRadius: 'var(--r-btn)', background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, color: 'var(--accent)', cursor: 'pointer' }}
        >
          ⤴
        </button>
      </div>

      <button
        onClick={onEnter}
        style={{
          alignSelf: 'stretch', marginTop: 'auto', paddingTop: 24, height: 54, borderRadius: 'var(--r-btn)',
          background: 'var(--surface)', border: '1.5px solid var(--accent)', color: 'var(--accent)',
          fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)', cursor: 'pointer',
        }}
      >
        الدخول إلى الرحلة
      </button>
    </div>
  );
}
