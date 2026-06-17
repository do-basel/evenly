import { useState } from 'react';
import { api } from '../api';
import { getMembership, getMemberships, removeMembership } from '../storage';
import type { Event, Member } from '../types';
import type { Strings } from '../i18n';

interface Props {
  s: Strings;
  dir: string;
  inviteCode: string;
  event: Event;
  onBack: () => void;
  onRenamed: (newName: string) => void;
  onLeft: () => void;
}

export default function TripSettings({ s, dir, inviteCode, event, onBack, onRenamed, onLeft }: Props) {
  const membership = getMembership(inviteCode)!;
  const [tripName, setTripName] = useState(event.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>(event.members);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<string | null>(event.photo_url ?? null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savedPhoto, setSavedPhoto] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);

  // First member by join order is the creator (reliable fallback when isCreator not in localStorage)
  const isCreator = membership.isCreator || members[0]?.id === membership.memberId;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('الصورة كبيرة جداً (الحد 2MB)'); return; }
    setSavingPhoto(true);
    setError('');
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await api.updateTripPhoto(inviteCode, membership.memberToken, dataUrl);
        setPhoto(dataUrl);
        const all = getMemberships();
        const updated = all.map((m) =>
          m.inviteCode === inviteCode ? { ...m, tripPhotoUrl: dataUrl } : m
        );
        localStorage.setItem('evenly_memberships', JSON.stringify(updated));
        setSavedPhoto(true);
        setTimeout(() => setSavedPhoto(false), 2000);
      } catch (err: any) {
        setError(err.message ?? 'حدث خطأ في حفظ الصورة');
      } finally {
        setSavingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRename = async () => {
    if (!tripName.trim() || tripName.trim() === event.name) return;
    setSaving(true);
    setError('');
    try {
      await api.renameEvent(inviteCode, membership.memberToken, tripName.trim());
      // Update local storage
      const all = getMemberships();
      const updated = all.map((m) =>
        m.inviteCode === inviteCode ? { ...m, eventName: tripName.trim() } : m
      );
      localStorage.setItem('evenly_memberships', JSON.stringify(updated));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onRenamed(tripName.trim());
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (member: Member) => {
    if (member.id === membership.memberId) return; // can't remove self
    setRemovingId(member.id);
    try {
      await api.removeMember(inviteCode, membership.memberToken, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
    } finally {
      setRemovingId(null);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    setError('');
    try {
      await api.removeMember(inviteCode, membership.memberToken, membership.memberId);
      removeMembership(inviteCode);
      onLeft();
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
      setLeaving(false);
      setConfirmLeave(false);
    }
  };

  const handleDeleteTrip = async () => {
    setDeletingTrip(true);
    setError('');
    try {
      await api.deleteTrip(inviteCode, membership.memberToken);
      removeMembership(inviteCode);
      onLeft();
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ');
      setDeletingTrip(false);
      setConfirmDelete(false);
    }
  };

  const shareLink = `${window.location.origin}/j/${inviteCode}`;
  const [copiedLink, setCopiedLink] = useState(false);
  const copyLink = () => {
    navigator.clipboard.writeText(shareLink).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div dir={dir} style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
        <button
          onClick={onBack}
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 16, cursor: 'pointer', color: 'var(--ink)', flexShrink: 0 }}
        >
          {dir === 'rtl' ? '→' : '←'}
        </button>
        <div style={{ fontSize: 20, fontWeight: 800 }}>إعدادات الرحلة</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>

        {/* Trip photo — creator only */}
        {isCreator && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 12 }}>صورة الرحلة</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
              <label style={{ width: 72, height: 72, borderRadius: 'var(--r-card)', cursor: 'pointer', background: photo ? 'transparent' : 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, overflow: 'hidden', flexShrink: 0, border: '2px dashed var(--line)', position: 'relative' }}>
                {photo
                  ? <img src={photo} alt="trip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🏕️'}
                <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} onChange={handlePhotoChange} />
              </label>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {savingPhoto ? 'جاري الحفظ...' : savedPhoto ? '✓ تم الحفظ' : 'اضغط لإضافة صورة'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 3 }}>JPG, PNG — max 2MB</div>
              </div>
            </div>
          </>
        )}

        {/* Trip name — creator only */}
        {isCreator && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>اسم الرحلة</div>
            <input
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '14px 16px', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', direction: dir as any, marginBottom: 12 }}
            />
            <button
              onClick={handleRename}
              disabled={saving || !tripName.trim() || tripName.trim() === event.name}
              style={{ width: '100%', height: 48, borderRadius: 'var(--r-btn)', background: saved ? 'var(--positive)' : saving ? 'var(--sub)' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)', cursor: 'pointer', marginBottom: 28 }}
            >
              {saved ? s.saved : saving ? s.saving : 'تغيير الاسم'}
            </button>
          </>
        )}

        {/* Invite link */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 9 }}>رابط الدعوة</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          <div style={{ flex: 1, background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 'var(--r-input)', padding: '12px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr' }}>
            {shareLink}
          </div>
          <button
            onClick={copyLink}
            style={{ height: 46, paddingInline: 16, borderRadius: 'var(--r-btn)', background: copiedLink ? 'var(--positive)' : 'var(--accent)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            {copiedLink ? '✓' : s.copyLink}
          </button>
        </div>

        {/* Members */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', marginBottom: 12 }}>الأعضاء ({members.length})</div>
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)', padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
              {m.photo_url
                ? <img src={m.photo_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : m.name[0]}
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
              {m.name}
              {m.id === membership.memberId && <span style={{ fontSize: 11, color: 'var(--sub)', fontWeight: 600, marginRight: 6 }}>(أنت)</span>}
            </div>
            {/* Creator can remove others; members see no remove button */}
            {isCreator && m.id !== membership.memberId && (
              <button
                onClick={() => handleRemove(m)}
                disabled={removingId === m.id}
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--negative)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}
              >
                {removingId === m.id ? '...' : 'إزالة'}
              </button>
            )}
          </div>
        ))}

        {error && <div style={{ color: 'var(--negative)', fontSize: 13, fontWeight: 600, marginTop: 12 }}>{error}</div>}

        {/* Leave trip */}
        <div style={{ marginTop: 28, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
          {!confirmLeave ? (
            <button
              onClick={() => setConfirmLeave(true)}
              style={{ width: '100%', height: 48, borderRadius: 'var(--r-btn)', background: 'var(--surface)', color: 'var(--negative)', border: '1.5px solid var(--negative)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              {dir === 'rtl' ? 'مغادرة الرحلة' : 'Leave Trip'}
            </button>
          ) : (
            <div style={{ background: '#FDF0EE', borderRadius: 'var(--r-card)', padding: '14px 16px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12 }}>
                {dir === 'rtl' ? 'هل تريد مغادرة الرحلة؟ لن تظهر لك بعد الآن.' : 'Leave this trip? It will be removed from your list.'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmLeave(false)} style={{ flex: 1, height: 40, borderRadius: 'var(--r-btn)', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                  {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={handleLeave} disabled={leaving} style={{ flex: 1, height: 40, borderRadius: 'var(--r-btn)', background: 'var(--negative)', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', color: '#fff' }}>
                  {leaving ? '...' : (dir === 'rtl' ? 'مغادرة' : 'Leave')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete trip — creator only */}
        {isCreator && (
          <div style={{ marginTop: 12, marginBottom: 8 }}>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ width: '100%', height: 48, borderRadius: 'var(--r-btn)', background: 'var(--negative)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                {dir === 'rtl' ? 'حذف الرحلة للجميع' : 'Delete Trip for Everyone'}
              </button>
            ) : (
              <div style={{ background: '#FDF0EE', borderRadius: 'var(--r-card)', padding: '14px 16px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12 }}>
                  {dir === 'rtl' ? 'سيتم حذف الرحلة والمصروفات للجميع. لا يمكن التراجع.' : 'This will permanently delete the trip and all expenses for everyone.'}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, height: 40, borderRadius: 'var(--r-btn)', background: 'var(--chip)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                    {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button onClick={handleDeleteTrip} disabled={deletingTrip} style={{ flex: 1, height: 40, borderRadius: 'var(--r-btn)', background: 'var(--negative)', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', color: '#fff' }}>
                    {deletingTrip ? '...' : (dir === 'rtl' ? 'حذف نهائي' : 'Delete')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
