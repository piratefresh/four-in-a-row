// v7-showdown.jsx — Showdown / results screens (desktop + mobile)

const SHOWDOWN_RESULTS = [
  { name: 'Ellis March', initials: 'E', color: '#a78bfa', word: 'ENVIRO',  base: 12, mult: 5, rack: 0, total: 17, isWinner: true,
    tiles: [
      { letter: 'E', points: 1, mult: 2 },
      { letter: 'N', points: 2 },
      { letter: 'V', points: 5, mult: 2 },
      { letter: 'I', points: 1 },
      { letter: 'R', points: 2 },
      { letter: 'O', points: 1 },
    ]},
  { name: 'Mira Quill', initials: 'M', color: '#7ec4cf', word: 'ORGONE', base: 10, mult: 0, rack: 0, total: 10,
    tiles: [
      { letter: 'O', points: 1 },
      { letter: 'R', points: 2 },
      { letter: 'G', points: 3 },
      { letter: 'O', points: 1 },
      { letter: 'N', points: 2 },
      { letter: 'E', points: 1 },
    ]},
  { name: 'Magnus Nilsen', isYou: true, initials: 'MN', color: '#a78bfa', word: 'ROW', base: 8, mult: 0, rack: 0, total: 8,
    tiles: [
      { letter: 'R', points: 2 },
      { letter: 'O', points: 1 },
      { letter: 'W', points: 5 },
    ]},
  { name: 'Jax Rook', initials: 'J', color: '#e07a5f', word: 'RAINE', base: 7, mult: 0, rack: 0, total: 7,
    tiles: [
      { letter: 'R', points: 2 },
      { letter: 'A', points: 1 },
      { letter: 'I', points: 1 },
      { letter: 'N', points: 2 },
      { letter: 'E', points: 1 },
    ]},
];

function ResultCard({ r, large = false }) {
  const winner = r.isWinner;
  return (
    <div style={{
      borderRadius: 12,
      background: winner ? 'linear-gradient(180deg, #f4d35e 0%, #d4af37 80%, #b8902c 100%)' : 'rgba(0,0,0,0.28)',
      border: winner ? '1px solid #806316' : '1px solid rgba(212,175,55,0.15)',
      color: winner ? '#1a1208' : '#e8dcc0',
      padding: large ? 22 : 18,
      boxShadow: winner ? '0 8px 24px rgba(212,175,55,0.18), inset 0 1px 0 rgba(255,255,255,0.35)' : 'none',
      position: 'relative',
    }}>
      {winner && (
        <div style={{
          position: 'absolute', top: 14, right: 16,
          fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, fontWeight: 700,
          color: '#1a1208', background: 'rgba(26,18,8,0.15)',
          padding: '3px 8px', borderRadius: 3,
        }}>★ TAKES THE POT</div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: large ? 50 : 44, height: large ? 50 : 44, borderRadius: '50%',
          background: winner ? 'rgba(26,18,8,0.18)' : r.color,
          color: winner ? '#1a1208' : '#0c1410',
          fontFamily: 'Inter', fontWeight: 800, fontSize: large ? 18 : 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{r.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: large ? 22 : 18, fontWeight: 600, lineHeight: 1.1 }}>
              {r.name}{r.isYou && <span style={{ opacity: 0.65, fontStyle: 'italic' }}> (you)</span>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontFamily: '"Noto Serif", serif', fontSize: large ? 38 : 28, fontWeight: 700, lineHeight: 1 }}>{r.total}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, marginLeft: 4, opacity: 0.7 }}>PTS</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, letterSpacing: 2.4, fontWeight: 600 }}>{r.word.toUpperCase()}</div>
            {r.isYou && !winner && <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.4, color: '#d4af37', padding: '2px 6px', borderRadius: 3, border: '1px solid rgba(212,175,55,0.4)' }}>YOU</div>}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 0.8, opacity: 0.65, marginTop: 4 }}>
            Base {r.base} · Mult +{r.mult} · Rack +{r.rack}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap' }}>
        {r.tiles.map((t, i) => <GameTile key={i} {...t} size={large ? 36 : 32}/>)}
      </div>
    </div>
  );
}

// ─── DESKTOP SHOWDOWN ─────────────────────────────────────────
function ShowdownDesktop() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(180deg, #0a1d17 0%, #051410 100%)',
      color: '#e8dcc0', fontFamily: 'Inter', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '14px 28px', borderBottom: '1px solid rgba(212,175,55,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="9" height="13" viewBox="0 0 9 13"><path d="M7 1L2 6.5L7 12" stroke="#d4af37" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2, color: 'rgba(212,175,55,0.65)' }}>
            HOME · THE WIRE · <span style={{ color: '#d4af37' }}>THE MONASTERY</span>
          </div>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2, color: '#d4af37' }}>HAND #18 · SHOWDOWN · 02:14</div>
      </div>

      {/* main */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.2fr', minHeight: 0 }}>
        {/* LEFT — winner spotlight */}
        <div style={{
          padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          borderRight: '1px solid rgba(212,175,55,0.12)',
          background: 'radial-gradient(ellipse at 30% 50%, rgba(212,175,55,0.08) 0%, transparent 60%)',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 3, color: '#d4af37', marginBottom: 14 }}>
            HEADLINE · SHOWDOWN
          </div>
          <h1 style={{ margin: 0, fontFamily: '"Noto Serif", serif', fontWeight: 600, fontSize: 56, lineHeight: 0.95, color: '#f4e4c1', letterSpacing: -1.5 }}>
            Ellis takes <em style={{ color: '#d4af37', fontStyle: 'italic' }}>the pot</em>
          </h1>
          <div style={{ marginTop: 14, fontSize: 14, color: 'rgba(232,220,192,0.6)', maxWidth: 420, lineHeight: 1.5 }}>
            ENVIRO clears the field at seventeen — a doubled V on a doubled E, three above Mira's ORGONE.
          </div>

          {/* Pot */}
          <div style={{
            marginTop: 28, padding: '22px 26px', borderRadius: 14,
            background: 'linear-gradient(180deg, rgba(212,175,55,0.12) 0%, rgba(0,0,0,0.3) 100%)',
            border: '1px solid rgba(212,175,55,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.8, color: 'rgba(232,220,192,0.6)' }}>POT AWARDED</div>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 56, color: '#d4af37', fontWeight: 600, lineHeight: 1, marginTop: 2 }}>$80</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, color: 'rgba(232,220,192,0.5)' }}>ELLIS NOW HOLDS</div>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 22, color: '#f4e4c1', fontWeight: 600 }}>$1,060</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#9ec27a', letterSpacing: 1, marginTop: 2 }}>+$60 ON THE NIGHT</div>
            </div>
          </div>

          {/* CTA row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button style={{
              flex: 1, padding: '14px 18px', borderRadius: 8, cursor: 'pointer',
              background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
              color: '#1a1208', border: '1px solid #806316',
              fontFamily: 'Inter', fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              Deal another hand
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, opacity: 0.7 }}>·</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>00:08</span>
            </button>
            <button style={{
              padding: '14px 22px', borderRadius: 8, cursor: 'pointer',
              background: 'transparent', color: '#e8dcc0',
              border: '1px solid rgba(212,175,55,0.3)',
              fontFamily: 'Inter', fontWeight: 600, fontSize: 13,
            }}>Leave table</button>
          </div>

          {/* Add to feed */}
          <div style={{
            marginTop: 18, padding: '12px 16px', borderRadius: 8,
            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(212,175,55,0.1)',
            display: 'flex', alignItems: 'baseline', gap: 12,
            fontFamily: 'JetBrains Mono', fontSize: 11,
          }}>
            <span style={{ color: 'rgba(232,220,192,0.35)' }}>NOW</span>
            <span style={{ color: '#d4af37' }}>●</span>
            <span style={{ color: 'rgba(232,220,192,0.55)' }}>THE MONASTERY</span>
            <span style={{ color: '#f4e4c1', flex: 1, fontFamily: 'Inter' }}>Ellis played ENVIRO · won $80 pot</span>
            <span style={{ fontFamily: '"Noto Serif", serif', fontSize: 14, color: '#d4af37', fontWeight: 600 }}>+17</span>
          </div>
        </div>

        {/* RIGHT — scoreboard */}
        <div style={{ padding: '40px 48px', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2, color: 'rgba(232,220,192,0.5)' }}>SCOREBOARD</div>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 22, color: '#f4e4c1', fontStyle: 'italic', fontWeight: 600, marginTop: 2 }}>How it played</div>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.4, color: 'rgba(232,220,192,0.5)' }}>
              4 PLAYERS · 1 FOLD · 3 WORDS PLAYED
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SHOWDOWN_RESULTS.map((r, i) => <ResultCard key={i} r={r} large={r.isWinner}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MOBILE SHOWDOWN ─────────────────────────────────────────
function ShowdownMobile() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(180deg, #0a1d17 0%, #051410 100%)',
      color: '#e8dcc0', fontFamily: 'Inter', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      <div style={{ height: 54 }}/>

      <div style={{
        padding: '6px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(212,175,55,0.18)',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="9" height="13" viewBox="0 0 9 13"><path d="M7 1L2 6.5L7 12" stroke="#d4af37" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: '#d4af37' }}>HAND #18 · SHOWDOWN</div>
        <div style={{ width: 30 }}/>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 16px 12px' }}>
        {/* Headline */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2.4, color: '#d4af37' }}>HEADLINE · SHOWDOWN</div>
          <h1 style={{ margin: '6px 0 0', fontFamily: '"Noto Serif", serif', fontWeight: 600, fontSize: 28, lineHeight: 1, color: '#f4e4c1', letterSpacing: -0.6 }}>
            Ellis takes <em style={{ color: '#d4af37' }}>the pot</em>
          </h1>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 40, color: '#d4af37', fontWeight: 600, marginTop: 14 }}>$80</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.4, color: 'rgba(232,220,192,0.55)', marginTop: 2 }}>ELLIS MARCH · ENVIRO · 17 PTS</div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          <button style={{
            flex: 1, padding: '13px', borderRadius: 8, cursor: 'pointer',
            background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
            color: '#1a1208', border: '1px solid #806316',
            fontFamily: 'Inter', fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase',
          }}>Deal another</button>
          <button style={{
            flex: 1, padding: '13px', borderRadius: 8, cursor: 'pointer',
            background: 'rgba(0,0,0,0.3)', color: '#e8dcc0',
            border: '1px solid rgba(212,175,55,0.25)',
            fontFamily: 'Inter', fontWeight: 600, fontSize: 12,
          }}>Main menu</button>
        </div>

        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: 'rgba(232,220,192,0.5)', marginBottom: 8 }}>SCOREBOARD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SHOWDOWN_RESULTS.map((r, i) => <ResultCard key={i} r={r}/>)}
        </div>
      </div>
    </div>
  );
}
