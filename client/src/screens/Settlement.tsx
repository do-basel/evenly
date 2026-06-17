import Notch from '../components/Notch';
import { formatCurrency } from '../storage';
import type { Event } from '../types';

interface Props {
  inviteCode: string;
  event: Event;
  onBack: () => void;
}

export default function Settlement({ event, onBack }: Props) {
  const { settlement, balances, members, currency } = event;

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  return (
    <div dir="rtl" style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Notch />

      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
        <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', color: 'var(--ink)' }}>←</button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>تسوية الحسابات</div>
          <div style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600, marginTop: 1 }}>{event.name}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Balances summary */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 12 }}>أرصدة الأعضاء</div>
        {balances.map((b) => (
          <div
            key={b.memberId}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)', padding: '12px 14px', marginBottom: 8 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                {memberName(b.memberId)[0]}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{memberName(b.memberId)}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: b.netCents >= 0 ? 'var(--positive)' : 'var(--negative)', fontFamily: 'Hanken Grotesk, sans-serif' }}>
              {b.netCents >= 0 ? '+' : ''}{formatCurrency(b.netCents, currency)}
            </div>
          </div>
        ))}

        {/* Payment plan */}
        {settlement.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 12, marginTop: 24 }}>خطة التسوية</div>
            {settlement.map((p, i) => (
              <div key={i} style={{ background: '#EEF7F1', border: '1px solid #C5E0CF', borderRadius: 'var(--r-card)', padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--negative)', fontWeight: 800 }}>{p.fromName}</span>
                    <span style={{ color: 'var(--sub)', margin: '0 6px' }}>→</span>
                    <span style={{ color: 'var(--positive)', fontWeight: 800 }}>{p.toName}</span>
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--positive)', fontFamily: 'Hanken Grotesk, sans-serif', flexShrink: 0 }}>
                  {formatCurrency(p.amountCents, currency)}
                </div>
              </div>
            ))}
          </>
        )}

        {settlement.length === 0 && balances.length > 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 14, fontWeight: 600, color: 'var(--positive)' }}>
            ✓ الجميع متساوون — لا توجد مدفوعات مطلوبة
          </div>
        )}

        {balances.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--sub)', fontSize: 14, fontWeight: 600 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
            لا توجد مصاريف بعد
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px 32px' }}>
        <button
          onClick={onBack}
          style={{
            width: '100%', height: 52, borderRadius: 'var(--r-btn)',
            background: 'var(--surface)', color: 'var(--accent)',
            border: '1.5px solid var(--accent)', fontSize: 15, fontWeight: 700,
            fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}
        >
          رجوع إلى الرحلة
        </button>
      </div>
    </div>
  );
}
