// v4-createroom.jsx — Create Room dialog in The Wire's vocabulary
// Desktop: two-column modal with live preview
// Mobile: bottom sheet with collapsed preview header

const { useState: useStCR } = React;

const BLIND_PRESETS = [
  { sb: 0,   bb: 0,   label: 'Free' },
  { sb: 1,   bb: 2,   label: 'Penny' },
  { sb: 5,   bb: 10,  label: 'Low' },
  { sb: 25,  bb: 50,  label: 'Mid' },
  { sb: 50,  bb: 100, label: 'High' },
];

function pickBlind(idx) { return BLIND_PRESETS[idx]; }

function CRTile({ children, active, onClick, mono = true, sub, dim = false, flex }) {
  return (
    <button onClick={onClick} style={{
      flex: flex ?? 1,
      padding: '11px 12px', borderRadius: 8, cursor: 'pointer',
      background: active ? 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)' : 'rgba(0,0,0,0.3)',
      color: active ? '#1a1208' : (dim ? 'rgba(232,220,192,0.5)' : '#e8dcc0'),
      border: active ? '1px solid #806316' : '1px solid rgba(212,175,55,0.15)',
      boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : 'none',
      fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter',
      fontSize: 12, fontWeight: 600, letterSpacing: mono ? 0.6 : 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      textAlign: 'center', minHeight: 40,
    }}>
      <span>{children}</span>
      {sub && <span style={{ fontSize: 10, opacity: 0.65, letterSpacing: 1, fontFamily: 'JetBrains Mono' }}>{sub}</span>}
    </button>
  );
}

function FieldHeader({ icon, label, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
      <span style={{ color: '#d4af37', fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.6 }}>{icon}</span>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.8, color: 'rgba(232,220,192,0.85)', textTransform: 'uppercase' }}>{label}</span>
      {hint && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.4)', letterSpacing: 1, marginLeft: 'auto' }}>{hint}</span>}
    </div>
  );
}

function CRState() {
  const [name, setName] = useStCR('Glutenin Table');
  const [isPrivate, setPrivate] = useStCR(false);
  const [timer, setTimer] = useStCR(60);
  const [betting, setBetting] = useStCR('no-limit');
  const [blindIdx, setBlindIdx] = useStCR(3); // Mid $25/$50
  const [seats, setSeats] = useStCR(4);
  const [twoLetter, setTwoLetter] = useStCR('0-1');
  const [bonuses, setBonuses] = useStCR('classic');
  return { name, setName, isPrivate, setPrivate, timer, setTimer, betting, setBetting, blindIdx, setBlindIdx, seats, setSeats, twoLetter, setTwoLetter, bonuses, setBonuses };
}

function PreviewWireRow({ s }) {
  const blind = pickBlind(s.blindIdx);
  const blindLabel = blind.sb === 0 ? 'Free' : `$${blind.sb}/$${blind.bb}`;
  const betShort = s.betting === 'no-limit' ? 'No-limit' : s.betting === 'pot-limit' ? 'Pot-limit' : 'Limit';
  const sub = `${s.timer}s · ${betShort} · ${s.twoLetter} tiles`;
  const previewRoom = {
    name: s.name || 'Untitled Table',
    sub, status: 'open', taken: 1, seats: s.seats,
    pot: 0, potTrend: [0,0,0,0,0,0,0,0,0,0], buyIn: blindLabel,
    nextHand: 'Waiting',
    avatars: [{ name: 'Dylan M', color: '#d4af37' }],
    dealer: 0, currentTurn: 0,
  };
  return (
    <div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, color: 'rgba(232,220,192,0.5)', marginBottom: 10 }}>
        PREVIEW · ROW ON THE WIRE
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.9fr 0.8fr 60px',
        gap: 12, alignItems: 'center',
        padding: '14px 16px', borderRadius: 10,
        background: 'rgba(212,175,55,0.05)', border: '1px dashed rgba(212,175,55,0.4)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f4e4c1' }}>{previewRoom.name}</div>
            {s.isPrivate && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: '#d4af37', letterSpacing: 1.2, padding: '2px 5px', borderRadius: 3, border: '1px solid rgba(212,175,55,0.4)' }}>PRIVATE</span>}
            <StatusDot status="open"/>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.1, color: 'rgba(232,220,192,0.45)', marginTop: 3 }}>{previewRoom.sub}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avo a={{ name: 'Dylan M', color: '#d4af37' }} size={20}/>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.5)' }}>1/{s.seats}</span>
        </div>
        <div>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 16, color: '#d4af37', fontWeight: 600, lineHeight: 1 }}>{blindLabel}</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.4)', marginTop: 2, letterSpacing: 1 }}>BLINDS</div>
        </div>
        <Sparkline values={[0,0,0,0,0,0,0,0,0,0]} w={80} h={26}/>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2L8 5L2 8Z" fill="#d4af37"/></svg>
        </div>
      </div>

      {/* Live feed preview entry */}
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, color: 'rgba(232,220,192,0.5)', margin: '20px 0 10px' }}>
        PREVIEW · OPENING ANNOUNCEMENT
      </div>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 12,
        padding: '10px 14px', borderRadius: 8,
        background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(212,175,55,0.12)',
        fontFamily: 'JetBrains Mono', fontSize: 11,
      }}>
        <span style={{ color: 'rgba(232,220,192,0.35)' }}>NOW</span>
        <span style={{ color: '#9ec27a' }}>●</span>
        <span style={{ color: 'rgba(232,220,192,0.55)' }}>{previewRoom.name}</span>
        <span style={{ color: '#f4e4c1', flex: 1, fontFamily: 'Inter' }}>
          Dylan opened the table · {blindLabel} {s.isPrivate ? '· private' : ''}
        </span>
      </div>
    </div>
  );
}
