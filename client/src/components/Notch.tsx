export default function Notch() {
  return (
    <div className="mock-notch" style={{
      position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
      width: 90, height: 26, background: '#000', borderRadius: 14, zIndex: 30,
    }} />
  );
}
