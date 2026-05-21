// shared.jsx — auth + leaderboard shared theme, helpers, mock data

// ───── theme palette ─────────────────────────────────────────
const WP = {
  bgGrad: 'linear-gradient(180deg, #0a1d17 0%, #051410 100%)',
  bg: '#0a1d17',
  ink: '#051410',
  inkDeep: '#020a07',
  gold: '#d4af37',
  goldBright: '#f4e4c1',
  parchment: '#e8dcc0',
  parchmentDim: 'rgba(232,220,192,0.6)',
  parchmentFaint: 'rgba(232,220,192,0.3)',
  red: '#ff5d4e',
  green: '#9ec27a',
  blue: '#7ec4cf',
  amber: '#e6b450',
  violet: '#a78bfa',
  rule: 'rgba(212,175,55,0.18)',
  ruleFaint: 'rgba(212,175,55,0.08)',
  serif: '"Noto Serif", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  sans: 'Inter, system-ui, sans-serif',
};

// ───── building blocks ───────────────────────────────────────

// Polished wooden/parchment letter tile
function Tile({ letter, points, size = 28, dim = false }) {
  return (
    <div style={{
      width: size, height: size * 1.18, borderRadius: size * 0.12,
      background: dim
        ? 'linear-gradient(165deg, #c4b48a 0%, #a8987a 50%, #8a7a5e 100%)'
        : 'linear-gradient(165deg, #fff3d1 0%, #f4e4c1 50%, #d9c392 100%)',
      color: '#2b1810',
      fontFamily: WP.sans, fontWeight: 800,
      fontSize: size * 0.5, letterSpacing: -0.5,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 3px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.25)',
      position: 'relative', flexShrink: 0,
    }}>
      {letter}
      {points != null && (
        <span style={{
          position: 'absolute', bottom: 2, right: 3,
          fontFamily: WP.mono, fontSize: size * 0.22,
          fontWeight: 600, opacity: 0.7,
        }}>{points}</span>
      )}
    </div>
  );
}

function TileWord({ word, size = 28, gap = 3, points }) {
  const PTS = { A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5, L:1, M:3, N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:1, V:4, W:4, X:8, Y:4, Z:10 };
  return (
    <div style={{ display: 'inline-flex', gap }}>
      {word.toUpperCase().split('').map((L, i) => (
        <Tile key={i} letter={L} points={points ? PTS[L] || 1 : null} size={size}/>
      ))}
    </div>
  );
}

// "Press-set" stamp — used for kickers / vol numbers
function Kicker({ children, color, size = 10, gap = 2.2, style }) {
  return (
    <div style={{
      fontFamily: WP.mono, fontSize: size, letterSpacing: gap,
      color: color || WP.gold, textTransform: 'uppercase',
      ...style,
    }}>{children}</div>
  );
}

// Hairline rule with optional center label
function Rule({ label, color = WP.rule, labelColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0',
      color: labelColor || WP.parchmentFaint,
    }}>
      <div style={{ flex: 1, height: 1, background: color }}/>
      {label && (
        <div style={{ fontFamily: WP.mono, fontSize: 9, letterSpacing: 2 }}>{label}</div>
      )}
      <div style={{ flex: 1, height: 1, background: color }}/>
    </div>
  );
}

// Form input — newsprint feel
function Field({ label, type = 'text', placeholder, value, hint, icon, optional }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 6,
      }}>
        <span style={{ fontFamily: WP.mono, fontSize: 9, letterSpacing: 2, color: WP.parchmentDim }}>{label}</span>
        {optional && <span style={{ fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.4, color: WP.parchmentFaint }}>OPTIONAL</span>}
        {hint && <span style={{ fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.4, color: WP.gold }}>{hint}</span>}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={type} defaultValue={value} placeholder={placeholder}
          style={{
            width: '100%', padding: icon ? '12px 14px 12px 38px' : '12px 14px',
            background: 'rgba(0,0,0,0.35)', color: WP.goldBright,
            border: `1px solid ${WP.rule}`, borderRadius: 6, outline: 'none',
            fontFamily: WP.sans, fontSize: 14, letterSpacing: 0.2,
          }}
        />
        {icon && (
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontFamily: WP.mono, fontSize: 13, color: WP.parchmentFaint,
          }}>{icon}</span>
        )}
      </div>
    </label>
  );
}

// Primary CTA
function PrimaryButton({ children, onClick, kicker, full = true, dark = false, style }) {
  return (
    <button onClick={onClick} style={{
      width: full ? '100%' : 'auto',
      padding: kicker ? '11px 22px 13px' : '14px 22px',
      background: dark ? WP.ink : WP.gold,
      color: dark ? WP.gold : '#1a1208',
      border: dark ? `1px solid ${WP.gold}` : 'none', borderRadius: 6, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
      lineHeight: 1, ...style,
    }}>
      {kicker && (
        <span style={{ fontFamily: WP.mono, fontSize: 8, letterSpacing: 2, opacity: 0.6 }}>{kicker}</span>
      )}
      <span style={{ fontFamily: WP.sans, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>{children}</span>
    </button>
  );
}

// Ghost CTA
function GhostButton({ children, icon, full = true, style }) {
  return (
    <button style={{
      width: full ? '100%' : 'auto',
      padding: '11px 18px',
      background: 'rgba(0,0,0,0.25)', color: WP.parchment,
      border: `1px solid ${WP.rule}`, borderRadius: 6, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: WP.sans, fontSize: 13, fontWeight: 500,
      ...style,
    }}>
      {icon && <span style={{ width: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
}

// Tiny avatar — does NOT collide with Avo from data.jsx
function MiniAv({ name, color = WP.gold, size = 22, ring }) {
  const init = name.split(/\s+/).map(s => s[0]).slice(0,2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#0c1410',
      fontFamily: WP.sans, fontWeight: 700,
      fontSize: size * 0.38, letterSpacing: -0.5,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: ring ? `0 0 0 1.5px ${WP.ink}, 0 0 0 3px ${WP.gold}` : `0 0 0 1.5px ${WP.ink}`,
    }}>{init}</div>
  );
}

// Pulsing live dot
function LiveDot({ color = WP.red, size = 7 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: color, animation: 'pulse 1.6s ease-in-out infinite',
      boxShadow: `0 0 8px ${color}`,
    }}/>
  );
}

// Brand mark — small "WP" monogram
function Mark({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 30% 30%, rgba(212,175,55,0.95) 0%, rgba(180,140,40,0.95) 60%, rgba(120,90,20,0.95) 100%)',
      color: '#1a1208', fontFamily: WP.serif, fontWeight: 700, fontStyle: 'italic',
      fontSize: size * 0.42, letterSpacing: -1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 0 1px ${WP.gold}55, 0 0 0 4px ${WP.ink}, 0 0 0 5px ${WP.gold}33`,
      flexShrink: 0,
    }}>WP</div>
  );
}

// ───── mock data ─────────────────────────────────────────────

const AUTH_LIVE_PLAYS = [
  { t: '00:04', who: 'Mira Q.',     room: 'The Monastery',  msg: 'played TINCTURES', pts: 64, kind: 'big',  color: '#e6b450' },
  { t: '00:18', who: 'Wynn',        room: 'High Roller',    msg: 'raised to $400',                kind: 'raise',color: '#a78bfa' },
  { t: '00:31', who: 'Zack',        room: 'Full Rack',      msg: 'played RUSTICS',   pts: 29, kind: 'play', color: '#9ec27a' },
  { t: '00:47', who: 'Ollo',        room: 'High Roller',    msg: 'played ZEPHYR',    pts: 51, kind: 'big',  color: '#e07a5f' },
  { t: '01:02', who: 'Dani',        room: 'Cursive',        msg: 'played QUARRY',    pts: 38, kind: 'play', color: '#f0a8c0' },
  { t: '01:19', who: 'Petra',       room: 'High Roller',    msg: 'folded',                       kind: 'fold', color: '#81b29a' },
  { t: '01:30', who: 'Ellis March', room: 'The Monastery',  msg: 'shoved all-in',                kind: 'raise',color: '#b8a6f0' },
];

const LEADERS = [
  { rank: 1,  name: 'Mira Quill',     color: '#e6b450', wins: 184, losses: 42, streak: 7,
    bestWord: 'TINCTURES', bestPts: 64, biggest: '$4,820', title: 'Queen of the Long Word', online: true,  room: 'The Monastery' },
  { rank: 2,  name: 'Ollo',           color: '#e07a5f', wins: 162, losses: 88, streak: 3,
    bestWord: 'ZEPHYR',    bestPts: 51, biggest: '$3,180', title: 'High Roller',           online: true,  room: 'High Roller Deck' },
  { rank: 3,  name: 'Zack',           color: '#9ec27a', wins: 148, losses: 71, streak: 8,
    bestWord: 'BUZZARDS',  bestPts: 92, biggest: '$2,940', title: 'Streak Holder',         online: true,  room: 'Full Rack' },
  { rank: 4,  name: 'Dylan Marx',     color: '#7ec4cf', wins: 121, losses: 60, streak: 2,
    bestWord: 'SQUINTED',  bestPts: 78, biggest: '$2,210', title: 'Daily Challenge Champ', online: false, room: null },
  { rank: 5,  name: 'Ellis March',    color: '#b8a6f0', wins: 118, losses: 80, streak: 1,
    bestWord: 'WIZENED',   bestPts: 56, biggest: '$1,940', title: 'Iron Bluffer',          online: true,  room: 'The Monastery' },
  { rank: 6,  name: 'Petra',          color: '#81b29a', wins: 106, losses: 70, streak: 0,
    bestWord: 'EQUINOX',   bestPts: 49, biggest: '$1,640', title: 'River Specialist',     online: false, room: null },
  { rank: 7,  name: 'Magnus Nilsen',  color: '#a78bfa', wins: 98,  losses: 65, streak: 2,
    bestWord: 'WOAH',      bestPts: 27, biggest: '$1,200', title: 'Rising',                online: true,  room: 'Cursive Classic',
    you: true },
  { rank: 8,  name: 'Dani',           color: '#f0a8c0', wins: 89,  losses: 102,streak: 0,
    bestWord: 'QUARRY',    bestPts: 38, biggest: '$1,080', title: 'Crowd Favourite',       online: true,  room: 'Cursive Classic' },
  { rank: 9,  name: 'Jamie',          color: '#7ec4cf', wins: 77,  losses: 94, streak: 0,
    bestWord: 'CINDER',    bestPts: 31, biggest: '$960',   title: '—',                     online: true,  room: 'The Monastery' },
  { rank: 10, name: 'Theo',           color: '#a8d0f0', wins: 64,  losses: 80, streak: 1,
    bestWord: 'STRAIN',    bestPts: 28, biggest: '$820',   title: '—',                     online: false, room: null },
  { rank: 11, name: 'Wynn',           color: '#a78bfa', wins: 58,  losses: 70, streak: 4,
    bestWord: 'AVENUE',    bestPts: 24, biggest: '$760',   title: '—',                     online: true,  room: 'High Roller Deck' },
  { rank: 12, name: 'Yumi',           color: '#e6c25c', wins: 51,  losses: 60, streak: 0,
    bestWord: 'LATCH',     bestPts: 22, biggest: '$620',   title: '—',                     online: false, room: null },
];

const TOP_WORDS = [
  { word: 'BUZZARDS',  pts: 92, by: 'Zack',         room: 'Full Rack',      when: 'Mon · 11pm' },
  { word: 'SQUINTED',  pts: 78, by: 'Dylan Marx',   room: 'River Run',      when: 'Sun · 9pm' },
  { word: 'TINCTURES', pts: 64, by: 'Mira Quill',   room: 'The Monastery',  when: 'Tue · 14s' },
  { word: 'WIZENED',   pts: 56, by: 'Ellis March',  room: 'The Monastery',  when: 'Tue · 8m' },
  { word: 'ZEPHYR',    pts: 51, by: 'Ollo',         room: 'High Roller',    when: 'Tue · 4m' },
  { word: 'EQUINOX',   pts: 49, by: 'Petra',        room: 'High Roller',    when: 'Mon · late' },
  { word: 'QUARRY',    pts: 38, by: 'Dani',         room: 'Cursive Classic',when: 'Tue · 12m' },
  { word: 'CINDER',    pts: 31, by: 'Jamie',        room: 'The Monastery',  when: 'Tue · 20m' },
];

const AI_LEADERS = [
  { rank: 1, name: 'Margaux the Maven', color: '#d4af37', diff: 'IMPOSSIBLE', wins: 4218, beats: 'Beats 94% of humans', bestWord: 'ANTONYMS', bestPts: 88 },
  { rank: 2, name: 'Old Sully',         color: '#c8a878', diff: 'HARD',        wins: 3104, beats: 'Beats 81%',           bestWord: 'WHISPER',  bestPts: 62 },
  { rank: 3, name: 'Cardinal Quill',    color: '#b06860', diff: 'HARD',        wins: 2840, beats: 'Beats 74%',           bestWord: 'GAMBIT',   bestPts: 51 },
  { rank: 4, name: 'The Apprentice',    color: '#7ec4cf', diff: 'MEDIUM',      wins: 1820, beats: 'Beats 52%',           bestWord: 'PARADOX',  bestPts: 44 },
  { rank: 5, name: 'Tabby',             color: '#9ec27a', diff: 'EASY',        wins: 940,  beats: 'Beats 28%',           bestWord: 'SLATE',    bestPts: 21 },
];

const AWARDS = [
  { kind: 'longest',  label: 'Longest word',     value: 'TINCTURES', by: 'Mira Quill',  meta: '9 letters · 64 pts',   color: '#e6b450' },
  { kind: 'biggest',  label: 'Biggest pot won',  value: '$4,820',    by: 'Mira Quill',  meta: 'Monastery · all-in',   color: '#d4af37' },
  { kind: 'streak',   label: 'Hot streak',       value: '8 wins',    by: 'Zack',        meta: 'Full Rack · ongoing',  color: '#9ec27a' },
  { kind: 'rarest',   label: 'Rarest letters',   value: 'JINX',      by: 'Ollo',        meta: 'J+X · 1 in 4,200',     color: '#a78bfa' },
];

const MOVEMENT = [
  { dir: 'up',   amt: 4, name: 'Zack',         from: 7,  to: 3, why: '+8 win streak' },
  { dir: 'up',   amt: 2, name: 'Dylan Marx',   from: 6,  to: 4, why: 'Daily challenge · 312 pts' },
  { dir: 'up',   amt: 1, name: 'Magnus Nilsen',from: 8,  to: 7, why: 'WOAH · 27 pts'},
  { dir: 'down', amt: 3, name: 'Theo',         from: 7,  to: 10, why: '3 losses' },
  { dir: 'down', amt: 1, name: 'Petra',        from: 5,  to: 6,  why: 'Quiet night' },
];

// Helper to format leaderboard 'best word' tile rendering inline
function ScoreTiles({ word, size = 18 }) {
  return <TileWord word={word} size={size} gap={2}/>;
}
