// data.jsx — shared mock data for the rooms list redesign

const ROOMS = [
  {
    id: 'r-monastery',
    name: 'The Monastery',
    sub: '120s · No-limit · 0-1 tiles',
    buyIn: '$50/$100',
    seats: 6, taken: 5,
    status: 'live',
    nextHand: '00:34',
    createdLabel: '12m ago',
    pot: 4280,
    potTrend: [80, 240, 460, 680, 950, 1480, 2100, 2940, 3680, 4280],
    lastWord: 'TINCTURES',
    lastWordPts: 64,
    lastWordBy: 'Mira Q.',
    handsPlayed: 18,
    avg: '$2,140',
    hot: true,
    avatars: [
      { name: 'Mira Quill',   seed: 0, color: '#e6b450' },
      { name: 'Jamie',        seed: 1, color: '#7ec4cf' },
      { name: 'Raja',         seed: 2, color: '#d97757' },
      { name: 'Ellis',        seed: 3, color: '#b8a6f0' },
      { name: 'Zack',         seed: 4, color: '#9ec27a' },
    ],
    dealer: 1,
    currentTurn: 3,
  },
  {
    id: 'r-cursive',
    name: 'Cursive Classic',
    sub: '90s · Pot-limit · 2 tiles',
    buyIn: '$5/$10',
    seats: 4, taken: 3,
    status: 'open',
    nextHand: '01:15',
    createdLabel: '34m ago',
    pot: 320,
    potTrend: [10, 40, 70, 100, 140, 200, 240, 280, 300, 320],
    lastWord: 'QUARRY',
    lastWordPts: 38,
    lastWordBy: 'Dani',
    handsPlayed: 7,
    avg: '$420',
    avatars: [
      { name: 'Dani',  seed: 5, color: '#f0a8c0' },
      { name: 'Theo',  seed: 6, color: '#a8d0f0' },
      { name: 'Yumi',  seed: 7, color: '#e6c25c' },
    ],
    dealer: 0,
    currentTurn: 2,
  },
  {
    id: 'r-rookie',
    name: 'Rookie Room',
    sub: '60s · Limit · No choice tiles',
    buyIn: 'Free',
    seats: 4, taken: 1,
    status: 'open',
    nextHand: '03:00',
    createdLabel: '2m ago',
    pot: 0,
    potTrend: [0,0,0,0,0,0,0,0,0,0],
    lastWord: null,
    handsPlayed: 0,
    avg: '—',
    avatars: [
      { name: 'You', seed: 99, color: '#d4af37' },
    ],
    dealer: 0,
    currentTurn: 0,
  },
  {
    id: 'r-highroller',
    name: 'High Roller Deck',
    sub: '180s · No-limit · 2 choice tiles',
    buyIn: '$25/$50',
    seats: 6, taken: 4,
    status: 'live',
    nextHand: '04:22',
    createdLabel: '1h ago',
    pot: 1820,
    potTrend: [40, 120, 280, 420, 580, 760, 980, 1240, 1560, 1820],
    lastWord: 'ZEPHYR',
    lastWordPts: 51,
    lastWordBy: 'Ollo',
    handsPlayed: 12,
    avg: '$1,210',
    avatars: [
      { name: 'Ollo',   seed: 10, color: '#e07a5f' },
      { name: 'Petra',  seed: 11, color: '#81b29a' },
      { name: 'Nox',    seed: 12, color: '#f2cc8f' },
      { name: 'Wynn',   seed: 13, color: '#a78bfa' },
    ],
    dealer: 2,
    currentTurn: 0,
  },
  {
    id: 'r-fullrack',
    name: 'Full Rack Nightly',
    sub: '120s · No-limit · 1 choice tile',
    buyIn: '$10/$20',
    seats: 4, taken: 4,
    status: 'full',
    nextHand: 'Live',
    createdLabel: '22m ago',
    pot: 980,
    potTrend: [30, 80, 160, 260, 380, 500, 620, 760, 880, 980],
    lastWord: 'RUSTICS',
    lastWordPts: 29,
    lastWordBy: 'Zack',
    handsPlayed: 9,
    avg: '$760',
    avatars: [
      { name: 'Zack',  seed: 20, color: '#9ec27a' },
      { name: 'Lina',  seed: 21, color: '#f0a8c0' },
      { name: 'Bram',  seed: 22, color: '#c8a878' },
      { name: 'Iris',  seed: 23, color: '#7ec4cf' },
    ],
    dealer: 3,
    currentTurn: 1,
  },
  {
    id: 'r-teston',
    name: 'Teston Table',
    sub: '120s · No-limit · 0-1 tiles',
    buyIn: '$2/$4',
    seats: 4, taken: 1,
    status: 'open',
    nextHand: '01:00',
    createdLabel: '2m ago',
    pot: 0,
    potTrend: [0,0,0,0,0,0,0,0,0,0],
    lastWord: null,
    handsPlayed: 0,
    avg: '—',
    avatars: [
      { name: 'You', seed: 98, color: '#d4af37' },
    ],
    dealer: 0,
    currentTurn: 0,
  },
];

// live ticker events
const TICKER = [
  { t: '00:00', room: 'The Monastery',     msg: 'Mira played TINCTURES',  pts: 64,  kind: 'big' },
  { t: '00:08', room: 'High Roller Deck',  msg: 'Wynn raised to $400',    kind: 'raise' },
  { t: '00:14', room: 'Full Rack Nightly', msg: 'Zack played RUSTICS',    pts: 29,  kind: 'play' },
  { t: '00:21', room: 'The Monastery',     msg: 'Ellis folded',           kind: 'fold' },
  { t: '00:29', room: 'High Roller Deck',  msg: 'Ollo played ZEPHYR',     pts: 51,  kind: 'big' },
  { t: '00:37', room: 'Cursive Classic',   msg: 'Dani called $20',        kind: 'call' },
  { t: '00:44', room: 'The Monastery',     msg: 'Pot grew to $4,280',     kind: 'pot' },
  { t: '00:52', room: 'Cursive Classic',   msg: 'Theo played QUARRY',     pts: 38,  kind: 'play' },
  { t: '01:01', room: 'Full Rack Nightly', msg: 'Lina shoved all-in',     kind: 'raise' },
  { t: '01:08', room: 'The Monastery',     msg: 'Jamie checked',          kind: 'check' },
  { t: '01:15', room: 'High Roller Deck',  msg: 'Petra folded',           kind: 'fold' },
  { t: '01:22', room: 'The Monastery',     msg: 'Mira raised to $1,200',  kind: 'raise' },
];

const STATS = [
  { label: 'Your chips',     val: '$1,500', accent: true },
  { label: 'Longest word',   val: 'RUSTICS', sub: '7 letters' },
  { label: 'Most valuable',  val: 'ZACK',    sub: 'BUZZARDS · 92pts' },
  { label: 'Biggest winner', val: 'Mira Q.', sub: '+$4,820 today' },
];

// Sparkline path generator (0..1 normalized)
function sparkPath(values, width, height, pad = 2) {
  if (!values || values.length === 0) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = width - pad * 2;
  const h = height - pad * 2;
  return values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

// initials for avatar
function initials(name) {
  return name.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
}

// generic avatar component
function Avo({ a, size = 28, ring = false }) {
  return (
    <div title={a.name} style={{
      width: size, height: size, borderRadius: '50%',
      background: a.color, color: '#0c1410',
      fontFamily: 'Inter, system-ui', fontWeight: 700,
      fontSize: size * 0.38, letterSpacing: -0.5,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: ring ? '0 0 0 2px #0c2620, 0 0 0 3.5px #d4af37' : '0 0 0 2px #0c2620',
      flexShrink: 0,
    }}>{initials(a.name)}</div>
  );
}

function AvatarStack({ list, size = 24, max = 5 }) {
  const shown = list.slice(0, max);
  const overflow = list.length - shown.length;
  return (
    <div style={{ display: 'flex' }}>
      {shown.map((a, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.32 }}>
          <Avo a={a} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div style={{
          marginLeft: -size * 0.32, width: size, height: size, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', color: '#e8dcc0',
          fontFamily: 'Inter', fontWeight: 700, fontSize: size * 0.38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 2px #0c2620',
        }}>+{overflow}</div>
      )}
    </div>
  );
}

// Status dot
function StatusDot({ status }) {
  const c = status === 'live' ? '#ff5d4e' : status === 'open' ? '#9ec27a' : status === 'full' ? 'rgba(232,220,192,0.4)' : '#d4af37';
  const label = status === 'live' ? 'LIVE' : status === 'open' ? 'OPEN' : status === 'full' ? 'FULL' : '—';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.2, color: c, fontWeight: 600 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: c,
        boxShadow: status === 'live' ? `0 0 8px ${c}` : 'none',
        animation: status === 'live' ? 'pulse 1.6s ease-in-out infinite' : 'none',
      }}/>
      {label}
    </span>
  );
}

// Tiny pot sparkline
function Sparkline({ values, w = 96, h = 28, color = '#d4af37', fill = true }) {
  const d = sparkPath(values, w, h);
  if (!values || values.every(v => v === 0)) {
    return <div style={{ width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(232,220,192,0.25)', fontFamily: 'JetBrains Mono', fontSize: 10 }}>—</div>;
  }
  const areaD = d + ` L ${w-2},${h-2} L 2,${h-2} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {fill && <path d={areaD} fill={color} opacity="0.12"/>}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

// Mini bird's-eye felt with seats — used in floor-plan variation
function MiniFelt({ room, size = 180, showPot = true, ringDealer = true }) {
  const seatPositions = room.seats === 4
    ? [
        { x: 0.5, y: 0.88 },
        { x: 0.08, y: 0.5 },
        { x: 0.5, y: 0.12 },
        { x: 0.92, y: 0.5 },
      ]
    : [
        { x: 0.5, y: 0.92 },
        { x: 0.12, y: 0.72 },
        { x: 0.08, y: 0.32 },
        { x: 0.5, y: 0.08 },
        { x: 0.92, y: 0.32 },
        { x: 0.88, y: 0.72 },
      ];
  const w = size, h = size * 0.7;
  const avSize = Math.max(20, size * 0.13);
  return (
    <div style={{
      position: 'relative', width: w, height: h,
      background: 'radial-gradient(ellipse at center, #1a4a35 0%, #0e3422 60%, #08291b 100%)',
      borderRadius: w * 0.45,
      border: '2px solid #3a2815',
      boxShadow: 'inset 0 0 24px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
    }}>
      {/* inner brass rail */}
      <div style={{ position: 'absolute', inset: 6, borderRadius: w * 0.42, border: '1px solid rgba(212,175,55,0.22)' }}/>
      {/* center pot */}
      {showPot && room.pot > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(232,220,192,0.5)', letterSpacing: 1.4 }}>POT</div>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: Math.max(14, size * 0.11), color: '#d4af37', fontWeight: 600, lineHeight: 1 }}>
            ${room.pot.toLocaleString()}
          </div>
        </div>
      )}
      {showPot && room.pot === 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.35)', letterSpacing: 2,
        }}>WAITING</div>
      )}
      {/* seats */}
      {seatPositions.slice(0, room.seats).map((p, i) => {
        const player = room.avatars[i];
        const isDealer = ringDealer && i === room.dealer;
        const isTurn = i === room.currentTurn && room.status === 'live';
        if (!player) {
          return (
            <div key={i} style={{
              position: 'absolute', left: `${p.x*100}%`, top: `${p.y*100}%`,
              transform: 'translate(-50%,-50%)',
              width: avSize, height: avSize, borderRadius: '50%',
              border: '1.5px dashed rgba(232,220,192,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'JetBrains Mono', fontSize: 7, color: 'rgba(232,220,192,0.3)', letterSpacing: 1,
            }}>—</div>
          );
        }
        return (
          <div key={i} style={{
            position: 'absolute', left: `${p.x*100}%`, top: `${p.y*100}%`,
            transform: 'translate(-50%,-50%)',
          }}>
            <Avo a={player} size={avSize} ring={isTurn}/>
            {isDealer && (
              <div style={{
                position: 'absolute', right: -4, bottom: -2,
                width: avSize * 0.45, height: avSize * 0.45, borderRadius: '50%',
                background: '#f4e4c1', color: '#3a2815',
                fontFamily: 'Inter', fontWeight: 800, fontSize: avSize * 0.28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid #3a2815',
                boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}>D</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
