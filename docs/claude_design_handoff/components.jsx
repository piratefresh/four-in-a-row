// components.jsx — Word Poker UI primitives

// ─── Letter Tile ────────────────────────────────────────────────
function Tile({ tile, size = 44, hidden = false, style = {}, theme = 'scrabble', selected = false, onClick, chosenLetter, dimmed = false, dealDelay = 0 }) {
  if (!tile) return null;
  const showL = chosenLetter || tile.letter;
  const isChoice = !!tile.choiceAlt;

  // Casino-palette themes — richer golds, ruby reds, emerald green
  const themes = {
    scrabble: {
      bg: 'linear-gradient(165deg, #fff3d1 0%, #f4e4c1 50%, #d9c392 100%)',
      fg: '#2b1810', border: 'rgba(120,80,20,0.25)',
      shadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 2px 3px rgba(0,0,0,0.4)',
      sheen: 'linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 60%)',
    },
    chip: {
      bg: 'linear-gradient(165deg, #cc2727 0%, #8b1818 60%, #5a0e0e 100%)',
      fg: '#fff8dc', border: 'rgba(212,175,55,0.5)',
      shadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 -1px 0 rgba(0,0,0,0.45) inset, 0 2px 4px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.35)',
      sheen: 'linear-gradient(115deg, rgba(255,220,140,0) 40%, rgba(255,220,140,0.35) 50%, rgba(255,220,140,0) 60%)',
    },
    neon: {
      bg: 'linear-gradient(165deg, #114d28 0%, #0c3a1d 50%, #062410 100%)',
      fg: '#ffd45b', border: 'rgba(212,175,55,0.55)',
      shadow: '0 0 0 1px rgba(212,175,55,0.4), 0 0 14px rgba(212,175,55,0.3), 0 2px 4px rgba(0,0,0,0.7)',
      sheen: 'linear-gradient(115deg, rgba(212,175,55,0) 40%, rgba(212,175,55,0.4) 50%, rgba(212,175,55,0) 60%)',
    },
  };
  const T = themes[theme] || themes.scrabble;

  const multGlow =
    tile.mult === 2 ? '0 0 0 2px #ffd45b, 0 0 18px rgba(255,212,91,0.7)' :
    tile.mult === 3 ? '0 0 0 2px #ff6b8e, 0 0 20px rgba(255,107,142,0.7)' :
    null;

  const sel = selected ? '0 0 0 2px #7ee7ff, 0 8px 22px rgba(126,231,255,0.45)' : null;

  const shadow = [T.shadow, multGlow, sel].filter(Boolean).join(', ');

  const fontSize = Math.round(size * 0.46);
  const pointSize = Math.round(size * 0.22);
  const radius = Math.round(size * 0.18);

  return (
    <div onClick={onClick} className={`wp-tile ${tile.mult > 1 ? 'wp-tile-mult' : ''}`} style={{
      width: size, height: size, borderRadius: radius,
      background: hidden ? '#1a1a1a' : T.bg,
      position: 'relative', boxShadow: shadow,
      border: `0.5px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: onClick ? 'pointer' : 'default',
      opacity: dimmed ? 0.35 : 1,
      transform: selected ? 'translateY(-3px)' : 'translateY(0)',
      transition: 'transform 180ms ease, opacity 180ms ease, box-shadow 220ms ease',
      userSelect: 'none', overflow: 'hidden',
      animation: `wp-deal 420ms cubic-bezier(.3,1.4,.5,1) ${dealDelay}ms both`,
      ...style,
    }}>
      {/* animated sheen */}
      {!hidden && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: radius,
          background: T.sheen, backgroundSize: '250% 250%',
          animation: `wp-sheen ${4 + (tile.id?.charCodeAt?.(0) || 0) % 3}s linear infinite`,
          pointerEvents: 'none', mixBlendMode: theme === 'scrabble' ? 'normal' : 'screen',
          opacity: 0.85,
        }} />
      )}
      {hidden ? (
        <div style={{
          width: '70%', height: '70%', borderRadius: 4,
          background: 'repeating-linear-gradient(45deg, #cc2727 0 4px, #8b1818 4px 8px)',
          border: '1px solid rgba(212,175,55,0.4)',
        }} />
      ) : (
        <>
          {isChoice ? (
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 1,
              fontFamily: 'Inter, system-ui', fontWeight: 800, color: T.fg,
              zIndex: 1,
            }}>
              <span style={{ fontSize: Math.round(fontSize * 0.75) }}>{tile.letter}</span>
              <span style={{ fontSize: Math.round(fontSize * 0.5), opacity: 0.55 }}>/</span>
              <span style={{ fontSize: Math.round(fontSize * 0.75) }}>{tile.choiceAlt}</span>
            </div>
          ) : (
            <span style={{
              fontFamily: theme === 'neon' ? '"JetBrains Mono", ui-monospace, monospace' : 'Inter, system-ui',
              fontSize, fontWeight: 800, color: T.fg, lineHeight: 1,
              letterSpacing: -0.5, zIndex: 1,
              textShadow: theme === 'chip' ? '0 1px 1px rgba(0,0,0,0.4)' : theme === 'neon' ? '0 0 6px rgba(255,212,91,0.5)' : 'none',
            }}>{showL}</span>
          )}
          <span style={{
            position: 'absolute', right: 3, bottom: 2, zIndex: 1,
            fontFamily: 'Inter, system-ui', fontSize: Math.max(pointSize, 10), fontWeight: 800,
            color: theme === 'chip' ? '#ffd45b' : theme === 'neon' ? '#ffd45b' : '#7a4a10',
            lineHeight: 1,
            textShadow: theme === 'scrabble' ? 'none' : '0 0 4px rgba(0,0,0,0.6)',
          }}>{valueOf(showL)}</span>
          {tile.mult > 1 && (
            <span style={{
              position: 'absolute', left: 3, top: 2, zIndex: 1,
              fontFamily: 'Inter, system-ui', fontSize: Math.round(size * 0.22), fontWeight: 800,
              color: tile.mult === 2 ? '#ffd45b' : '#ff6b8e', lineHeight: 1,
              textShadow: '0 0 6px currentColor',
            }}>{tile.mult}×</span>
          )}
          {isChoice && (
            <span style={{
              position: 'absolute', left: 0, right: 0, top: -6, zIndex: 2,
              fontSize: 8, fontWeight: 800, color: '#d47eff',
              textAlign: 'center', letterSpacing: 0.8,
              textShadow: '0 0 6px rgba(212,126,255,0.7)',
            }}>CHOICE</span>
          )}
        </>
      )}
    </div>
  );
}

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('wp-tile-anim')) {
  const s = document.createElement('style'); s.id = 'wp-tile-anim';
  s.textContent = `
    @keyframes wp-deal {
      0% { opacity: 0; transform: translateY(-18px) rotate(-8deg) scale(0.8); }
      70% { opacity: 1; transform: translateY(2px) rotate(2deg) scale(1.02); }
      100% { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
    }
    @keyframes wp-sheen {
      0% { background-position: 200% 0; }
      100% { background-position: -100% 0; }
    }
    @keyframes wp-mult-pulse {
      0%,100% { filter: brightness(1); }
      50% { filter: brightness(1.15); }
    }
    .wp-tile-mult { animation: wp-mult-pulse 1.8s ease-in-out infinite, wp-deal 420ms cubic-bezier(.3,1.4,.5,1) both; }
    .wp-tile:hover { filter: brightness(1.08); }
  `;
  document.head.appendChild(s);
}

// ─── Avatar ────────────────────────────────────────────────
const AVATAR_PALETTES = [
  ['#ff8a5b','#c5422c'],
  ['#7ee7ff','#2c6b8e'],
  ['#b46bff','#4c2c6b'],
  ['#5bff8a','#2c6b4c'],
  ['#ffd45b','#8e6b2c'],
  ['#ff5b8a','#6b2c4c'],
];
function Avatar({ seed = 0, size = 56, name = 'Player', active = false, folded = false }) {
  const pal = AVATAR_PALETTES[seed % AVATAR_PALETTES.length];
  const initials = name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${pal[0]}, ${pal[1]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'Inter, system-ui', fontWeight: 700, fontSize: size * 0.34,
      boxShadow: active
        ? '0 0 0 2px #d4af37, 0 0 14px rgba(212,175,55,0.5)'
        : '0 0 0 1px rgba(255,255,255,0.1)',
      filter: folded ? 'grayscale(1) opacity(0.45)' : 'none',
      position: 'relative',
      transition: 'box-shadow 240ms ease, filter 240ms ease',
      animation: active ? 'wp-avatar-pulse 1.6s ease-in-out infinite' : 'none',
    }}>
      {initials}
    </div>
  );
}

if (typeof document !== 'undefined' && !document.getElementById('wp-avatar-anim')) {
  const s = document.createElement('style'); s.id = 'wp-avatar-anim';
  s.textContent = `@keyframes wp-avatar-pulse {
    0%,100% { box-shadow: 0 0 0 2px #d4af37, 0 0 14px rgba(212,175,55,0.5); }
    50% { box-shadow: 0 0 0 2px #d4af37, 0 0 22px rgba(212,175,55,0.85); }
  }`;
  document.head.appendChild(s);
}

// ─── Chip ────────────────────────────────────────────────
function Chip({ size = 28, color = '#d4af37', label = '' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 50% 40%, ${color}, color-mix(in srgb, ${color} 60%, #000))`,
      border: `2px dashed rgba(255,255,255,0.35)`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui', fontSize: size * 0.3, fontWeight: 700,
      color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,0.6)',
    }}>{label}</div>
  );
}

// ─── BetChip (stacked with amount)
function BetChip({ amount, size = 42 }) {
  if (!amount) return null;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 40% 35%, #cc2727, #5a0e0e)',
      border: '2px dashed rgba(212,175,55,0.6)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#ffd45b', fontFamily: 'Inter, system-ui', fontWeight: 700,
      boxShadow: '0 3px 8px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.2)',
      lineHeight: 1,
      animation: 'wp-chip-in 320ms cubic-bezier(.3,1.5,.5,1) both',
    }}>
      <span style={{ fontSize: 11 }}>${amount}</span>
      <span style={{ fontSize: 8, opacity: 0.75, marginTop: 1 }}>BET</span>
    </div>
  );
}

if (typeof document !== 'undefined' && !document.getElementById('wp-chip-anim')) {
  const s = document.createElement('style'); s.id = 'wp-chip-anim';
  s.textContent = `@keyframes wp-chip-in {
    0% { opacity: 0; transform: scale(0.3) translateY(-20px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }`;
  document.head.appendChild(s);
}

// ─── Primary Button ────────────────────────────────────────────────
function Button({ children, variant = 'primary', onClick, style = {}, disabled = false, size = 'md' }) {
  const sizes = {
    sm: { h: 32, px: 14, fs: 13 },
    md: { h: 44, px: 18, fs: 15 },
    lg: { h: 54, px: 22, fs: 17 },
  };
  const S = sizes[size];
  const variants = {
    primary: { bg: 'linear-gradient(180deg, #ffd45b, #d4af37 60%, #a88020)', fg: '#1a0f00', border: 'rgba(255,220,140,0.4)', shadow: '0 2px 10px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.3)' },
    secondary: { bg: 'rgba(255,255,255,0.08)', fg: '#fff', border: 'rgba(255,255,255,0.18)', shadow: 'none' },
    danger: { bg: 'rgba(204,39,39,0.15)', fg: '#ff6b6b', border: 'rgba(204,39,39,0.45)', shadow: 'none' },
    ghost: { bg: 'transparent', fg: 'rgba(255,255,255,0.8)', border: 'rgba(255,255,255,0.15)', shadow: 'none' },
  };
  const V = variants[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      height: S.h, padding: `0 ${S.px}px`, borderRadius: 10,
      background: V.bg, color: V.fg, border: `1px solid ${V.border}`,
      fontFamily: 'Inter, system-ui', fontSize: S.fs, fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
      boxShadow: V.shadow, letterSpacing: 0.2,
      transition: 'transform 120ms ease, opacity 120ms ease, filter 120ms ease',
      ...style,
    }}
    onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'scale(0.97)')}
    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >{children}</button>
  );
}

// ─── Panel ────────────────────────────────────────────────
function Panel({ children, style = {}, pad = 16 }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: pad, ...style,
    }}>{children}</div>
  );
}

Object.assign(window, { Tile, Avatar, Chip, BetChip, Button, Panel, AVATAR_PALETTES });
