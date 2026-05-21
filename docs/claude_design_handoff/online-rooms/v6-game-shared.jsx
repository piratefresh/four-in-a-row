// v6-game-shared.jsx — Game room shared building blocks (table, seats, tiles, chips)

// Tile rendered as a scrabble piece
function GameTile({ letter, points, mult, size = 50, dim = false, choice = null, selected = false, faceDown = false }) {
  if (faceDown) {
    return (
      <div style={{
        width: size, height: size * 1.18, borderRadius: 6,
        background: 'repeating-linear-gradient(45deg, #cc2727 0 4px, #8b1818 4px 8px)',
        border: '1px solid rgba(212,175,55,0.5)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
      }}/>
    );
  }
  return (
    <div style={{
      width: size, height: size * 1.18, borderRadius: 6,
      background: 'linear-gradient(165deg, #fff3d1 0%, #f4e4c1 50%, #d9c392 100%)',
      color: '#2b1810', position: 'relative',
      border: selected ? '2px solid #d4af37' : '0.5px solid rgba(120,80,20,0.25)',
      boxShadow: selected
        ? '0 0 0 1px #d4af37, 0 0 18px rgba(212,175,55,0.4), 0 4px 8px rgba(0,0,0,0.3)'
        : '0 1px 0 rgba(255,255,255,0.5) inset, 0 -1px 0 rgba(0,0,0,0.15) inset, 0 2px 4px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui', fontWeight: 800,
      opacity: dim ? 0.4 : 1, transform: selected ? 'translateY(-3px)' : 'none',
      transition: 'transform 180ms ease',
    }}>
      {choice ? (
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 1, fontSize: size * 0.32 }}>
          <span>{letter}</span>
          <span style={{ fontSize: size * 0.22, opacity: 0.55 }}>/</span>
          <span>{choice}</span>
        </span>
      ) : (
        <span style={{ fontSize: size * 0.46, letterSpacing: -0.5 }}>{letter}</span>
      )}
      <span style={{
        position: 'absolute', right: 4, bottom: 2,
        fontSize: Math.max(size * 0.22, 9), fontWeight: 800,
        color: '#7a4a10', lineHeight: 1,
      }}>{points}</span>
      {mult && mult > 1 && (
        <span style={{
          position: 'absolute', left: 3, top: 1,
          fontSize: Math.max(size * 0.2, 8), fontWeight: 800,
          color: mult === 2 ? '#c79a1e' : '#b54f6d',
        }}>{mult}×</span>
      )}
    </div>
  );
}

function EmptyTile({ size = 50, dashed = true }) {
  return (
    <div style={{
      width: size, height: size * 1.18, borderRadius: 6,
      border: `1.5px ${dashed ? 'dashed' : 'solid'} rgba(212,175,55,0.22)`,
      background: 'rgba(0,0,0,0.18)',
    }}/>
  );
}

// Poker chip
function Chip({ amount, size = 26 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', position: 'relative',
      background: 'radial-gradient(circle at 30% 30%, #ed4747 0%, #c41a1a 60%, #8b0e0e 100%)',
      border: '2px solid #f4e4c1',
      boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter', fontSize: size * 0.32, fontWeight: 800, color: '#fff8dc',
      textShadow: '0 1px 1px rgba(0,0,0,0.5)',
    }}>{amount}</div>
  );
}

// Seat — avatar + nameplate + chips + role badge + bet chip floating toward center
function Seat({ seat, isYou = false, dealer = false, sb = false, bb = false, turn = false, winner = false, statusOverride = null, betAmount = 0, betSide = 'top' }) {
  const status = statusOverride || seat.status || 'waiting';
  const statusColors = {
    waiting: { c: '#9ec27a', label: 'WAITING' },
    yourturn: { c: '#d4af37', label: 'YOUR TURN' },
    call: { c: '#7ec4cf', label: 'CALL' },
    raise: { c: '#e6b450', label: 'RAISE' },
    check: { c: '#9ec27a', label: 'CHECK' },
    fold: { c: 'rgba(232,220,192,0.4)', label: 'FOLD' },
    thinking: { c: '#d4af37', label: 'THINKING…' },
    winner: { c: '#f7df7a', label: 'WINNER' },
  };
  const s = statusColors[status] || statusColors.waiting;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
      opacity: status === 'fold' ? 0.5 : 1,
    }}>
      <div style={{ position: 'relative' }}>
        {/* dealer / sb / bb badge */}
        {(dealer || sb || bb) && (
          <div style={{
            position: 'absolute', top: -6, right: -6, zIndex: 2,
            width: 22, height: 22, borderRadius: '50%',
            background: dealer ? '#f4e4c1' : sb ? '#d4af37' : '#e07a5f',
            color: '#1a1208', border: '1.5px solid #3a2815',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}>{dealer ? 'D' : sb ? 'SB' : 'BB'}</div>
        )}
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: seat.color,
          color: '#0c1410', fontFamily: 'Inter', fontWeight: 800, fontSize: 17,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: winner
            ? '0 0 0 3px #0c2620, 0 0 0 6px #f7df7a, 0 0 44px rgba(244,211,94,0.7)'
            : turn
              ? '0 0 0 3px #0c2620, 0 0 0 5px #d4af37, 0 0 22px rgba(212,175,55,0.35)'
              : '0 0 0 3px #0c2620, 0 4px 10px rgba(0,0,0,0.5)',
          animation: winner ? 'winner-burst 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) both'
                    : turn ? 'seat-breathe 1.6s ease-in-out infinite'
                    : 'none',
          letterSpacing: -0.5,
          transition: 'box-shadow 300ms ease',
        }}>{seat.initials || initials(seat.name)}</div>
      </div>
      <div style={{
        marginTop: 8, fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.4,
        color: '#f4e4c1', textTransform: 'uppercase', textAlign: 'center',
      }}>{seat.name}{isYou && <span style={{ color: '#d4af37' }}> · YOU</span>}</div>
      <div style={{ marginTop: 6, padding: '3px 10px', borderRadius: 4,
        background: winner ? '#f7df7a' : turn ? '#d4af37' : 'rgba(0,0,0,0.4)',
        border: (turn || winner) ? '1px solid #806316' : `1px solid ${s.c}55`,
        fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.4, fontWeight: 600,
        color: (turn || winner) ? '#1a1208' : s.c,
        transition: 'background 200ms ease, color 200ms ease',
      }}>{winner ? 'WINNER' : turn ? 'YOUR TURN' : s.label}</div>
      <div style={{ marginTop: 5, fontFamily: '"Noto Serif", serif', fontSize: 13, color: '#d4af37', fontWeight: 600 }}>
        ${seat.chips.toLocaleString()}
      </div>

      {/* bet chip toward center */}
      {betAmount > 0 && (
        <div style={{
          position: 'absolute',
          ...(betSide === 'top' ? { top: -36, left: '50%', transform: 'translateX(-50%)' } : {}),
          ...(betSide === 'right' ? { right: -56, top: 16 } : {}),
          ...(betSide === 'left' ? { left: -56, top: 16 } : {}),
          ...(betSide === 'bottom' ? { bottom: -36, left: '50%', transform: 'translateX(-50%)' } : {}),
        }}>
          <Chip amount={betAmount} size={32}/>
        </div>
      )}
    </div>
  );
}

// Pot in the middle of the table
function PotDisplay({ amount, sub }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2, color: 'rgba(232,220,192,0.55)' }}>POT</div>
      <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 36, color: '#d4af37', fontWeight: 600, lineHeight: 1, marginTop: 4 }}>
        ${amount.toLocaleString()}
      </div>
      {sub && <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.2, color: 'rgba(232,220,192,0.5)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// The felt
function FeltTable({ width = 720, height = 380, children, label }) {
  return (
    <div style={{
      position: 'relative', width, height,
      background: 'radial-gradient(ellipse at center, #1a4a35 0%, #0e3422 60%, #08291b 100%)',
      borderRadius: '50%',
      border: '4px solid #3a2815',
      boxShadow: 'inset 0 0 60px rgba(0,0,0,0.6), 0 12px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.25)' }}/>
      {label && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          fontFamily: '"Noto Serif", serif', fontSize: 13, letterSpacing: 4, color: 'rgba(212,175,55,0.18)',
          textTransform: 'uppercase',
        }}>{label}</div>
      )}
      {children}
    </div>
  );
}

// Side log column shared by game screens — combines hand log + chat
function HandLog({ entries, chatMessages, narrow = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '18px 20px 14px', borderBottom: '1px solid rgba(212,175,55,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5d4e', animation: 'pulse 1.6s ease-in-out infinite' }}/>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.8, color: 'rgba(232,220,192,0.6)' }}>HAND LOG · LIVE</div>
        </div>
        <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 18, color: '#f4e4c1', fontWeight: 600, fontStyle: 'italic' }}>This hand</div>
      </div>
      <div style={{ flex: 1, padding: '8px 20px', overflow: 'auto', minHeight: 0 }}>
        {entries.map((ev, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'baseline', gap: 10,
            padding: '7px 0', borderBottom: '1px solid rgba(212,175,55,0.06)',
            fontFamily: 'JetBrains Mono', fontSize: 11,
          }}>
            <span style={{ color: 'rgba(232,220,192,0.35)', width: 36, flexShrink: 0 }}>{ev.t}</span>
            <span style={{ color: tickerColor(ev.kind), width: 6, flexShrink: 0 }}>●</span>
            <span style={{ color: '#f4e4c1', flex: 1, fontFamily: 'Inter', fontSize: 12 }}>{ev.msg}</span>
            {ev.pts && <span style={{ fontFamily: '"Noto Serif", serif', fontSize: 13, color: '#d4af37', fontWeight: 600 }}>+{ev.pts}</span>}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(212,175,55,0.15)', padding: '12px 20px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, color: 'rgba(232,220,192,0.5)', marginBottom: 8 }}>CHAT</div>
        {chatMessages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: m.color, fontWeight: 600 }}>{m.who}</span>
            <span style={{ color: 'rgba(232,220,192,0.4)', fontFamily: 'JetBrains Mono', fontSize: 9, marginLeft: 6 }}>{m.t}</span>
            <div style={{ color: '#e8dcc0', marginTop: 2 }}>{m.msg}</div>
          </div>
        ))}
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 6,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.12)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: 'rgba(232,220,192,0.4)', fontSize: 12 }}>Type a message…</span>
          <div style={{ flex: 1 }}/>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="11" height="11" viewBox="0 0 11 11"><path d="M1 5.5 L10 1 L7 10 L5 6 L1 5.5Z" fill="#1a1208"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
