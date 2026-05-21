// v2-floor.jsx — Variation 2: The Floor Plan (cards-as-tables, bird's eye)

const FLOOR_BG = 'linear-gradient(180deg, #0a1f18 0%, #061812 100%)';

function FloorChrome({ children }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: FLOOR_BG, color: '#e8dcc0',
      fontFamily: 'Inter, system-ui', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* parquet floor pattern, very subtle */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        backgroundImage: `
          linear-gradient(135deg, rgba(212,175,55,0.018) 25%, transparent 25%),
          linear-gradient(225deg, rgba(212,175,55,0.018) 25%, transparent 25%)
        `,
        backgroundSize: '60px 60px',
      }}/>
      {children}
    </div>
  );
}

function StatPill({ s }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      padding: '12px 16px', borderRadius: 10,
      background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.15)',
      minWidth: 150,
    }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, color: 'rgba(232,220,192,0.5)', textTransform: 'uppercase' }}>{s.label}</div>
      <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 20, color: s.accent ? '#d4af37' : '#f4e4c1', fontWeight: 600, lineHeight: 1 }}>{s.val}</div>
      {s.sub && <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'rgba(232,220,192,0.4)' }}>{s.sub}</div>}
    </div>
  );
}

// Single room card — the floor plan tile
function FloorCard({ room, size = 'lg' }) {
  const isFull = room.status === 'full';
  const isOpen = room.status === 'open';
  return (
    <div style={{
      borderRadius: 14, padding: 18,
      background: room.hot ? 'linear-gradient(180deg, rgba(212,175,55,0.06) 0%, rgba(0,0,0,0.4) 100%)' : 'rgba(0,0,0,0.3)',
      border: `1px solid ${room.hot ? 'rgba(212,175,55,0.35)' : 'rgba(212,175,55,0.12)'}`,
      boxShadow: room.hot ? '0 0 50px rgba(212,175,55,0.06)' : 'none',
      cursor: isFull ? 'not-allowed' : 'pointer',
      opacity: isFull ? 0.6 : 1,
      display: 'flex', flexDirection: 'column', gap: 14,
      position: 'relative',
    }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 19, fontWeight: 600, color: '#f4e4c1', letterSpacing: -0.3 }}>{room.name}</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.2, color: 'rgba(232,220,192,0.45)', marginTop: 3 }}>{room.sub}</div>
        </div>
        <StatusDot status={room.status}/>
      </div>

      {/* mini-felt */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <MiniFelt room={room} size={size === 'lg' ? 230 : 200}/>
      </div>

      {/* meta row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0,
        padding: '10px 0', borderTop: '1px solid rgba(212,175,55,0.12)',
      }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.2, color: 'rgba(232,220,192,0.45)' }}>BUY-IN</div>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 15, color: '#d4af37', fontWeight: 600 }}>{room.buyIn}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.2, color: 'rgba(232,220,192,0.45)' }}>SEATS</div>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 15, color: '#f4e4c1', fontWeight: 600 }}>{room.taken}/{room.seats}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.2, color: 'rgba(232,220,192,0.45)' }}>NEXT</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: room.status === 'live' ? '#d4af37' : '#f4e4c1', fontWeight: 600 }}>{room.nextHand}</div>
        </div>
      </div>

      {/* last word — if any */}
      {room.lastWord && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: 8,
          background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.5)', letterSpacing: 1.2 }}>LAST</span>
            <span style={{ fontFamily: '"Noto Serif", serif', fontSize: 13, color: '#f4e4c1', fontWeight: 600, letterSpacing: 1 }}>{room.lastWord}</span>
          </div>
          <span style={{ fontFamily: '"Noto Serif", serif', fontSize: 14, color: '#d4af37', fontWeight: 600 }}>+{room.lastWordPts}</span>
        </div>
      )}

      {/* CTA */}
      <button disabled={isFull} style={{
        padding: '11px', borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: 1,
        textTransform: 'uppercase', cursor: isFull ? 'not-allowed' : 'pointer',
        background: room.hot
          ? 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)'
          : 'transparent',
        color: room.hot ? '#1a1208' : '#e8dcc0',
        border: room.hot ? '1px solid #806316' : '1px solid rgba(212,175,55,0.3)',
      }}>
        {isFull ? 'Table full · spectate' : isOpen && room.taken === 1 ? 'Open the table' : 'Take a seat'}
      </button>
    </div>
  );
}

// ─── DESKTOP: The Floor Plan ───────────────────────────────────────
function FloorDesktop() {
  return (
    <FloorChrome>
      {/* top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid rgba(212,175,55,0.1)', position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="10" height="14" viewBox="0 0 10 14"><path d="M8 2L2 7l6 5" stroke="#d4af37" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, letterSpacing: 2, color: 'rgba(212,175,55,0.65)' }}>
            HOME <span style={{ opacity: 0.4, margin: '0 8px' }}>·</span> <span style={{ color: '#d4af37' }}>THE FLOOR</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* segmented control */}
          <div style={{
            display: 'flex', padding: 3, borderRadius: 999,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.12)',
            fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.2,
          }}>
            {['All', 'Live', 'Open', 'Free', 'Stakes ↓'].map((t, i) => (
              <div key={i} style={{
                padding: '6px 14px', borderRadius: 999,
                background: i === 0 ? 'rgba(212,175,55,0.18)' : 'transparent',
                color: i === 0 ? '#d4af37' : 'rgba(232,220,192,0.6)',
                cursor: 'pointer',
              }}>{t}</div>
            ))}
          </div>
          <Avo a={{ name: 'Dylan M', color: '#d4af37' }} size={30}/>
        </div>
      </div>

      {/* Heading + stats row */}
      <div style={{
        padding: '28px 40px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        position: 'relative', zIndex: 2,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontFamily: '"Noto Serif", serif', fontWeight: 600,
            fontSize: 44, lineHeight: 0.95, color: '#f4e4c1', letterSpacing: -1,
          }}>The floor</h1>
          <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(232,220,192,0.55)' }}>
            {ROOMS.filter(r => r.status === 'live').length} live · {ROOMS.filter(r => r.status === 'open').length} open · pots totaling ${ROOMS.reduce((s, r) => s + r.pot, 0).toLocaleString()} in play.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {STATS.map((s, i) => <StatPill key={i} s={s}/>)}
        </div>
      </div>

      {/* Grid of room cards */}
      <div style={{
        flex: 1, overflow: 'auto', padding: '0 40px 28px',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18,
        }}>
          {/* Create new — gold dashed tile */}
          <div style={{
            borderRadius: 14, padding: 18,
            border: '1.5px dashed rgba(212,175,55,0.45)',
            background: 'rgba(212,175,55,0.02)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', minHeight: 460,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 1v20M1 11h20" stroke="#d4af37" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 22, color: '#d4af37', fontWeight: 600, fontStyle: 'italic' }}>Open a table</div>
            <div style={{ fontSize: 12, color: 'rgba(232,220,192,0.5)', marginTop: 8, textAlign: 'center', maxWidth: 240, lineHeight: 1.4 }}>
              Set your blinds, choose a tempo, and invite a few sharp tongues.
            </div>
          </div>

          {ROOMS.slice(0, 5).map(r => (
            <FloorCard key={r.id} room={r}/>
          ))}
        </div>
      </div>
    </FloorChrome>
  );
}

// ─── MOBILE: The Floor Plan ───────────────────────────────────────
function FloorMobile() {
  return (
    <FloorChrome>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '0 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="9" height="13" viewBox="0 0 9 13"><path d="M7 1L2 6.5L7 12" stroke="#d4af37" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: '#d4af37' }}>THE FLOOR</div>
        <Avo a={{ name: 'Dylan', color: '#d4af37' }} size={28}/>
      </div>

      <div style={{ padding: '14px 18px 6px' }}>
        <h1 style={{ margin: 0, fontFamily: '"Noto Serif", serif', fontSize: 28, fontWeight: 600, color: '#f4e4c1', letterSpacing: -0.6, lineHeight: 0.95 }}>The floor</h1>
        <div style={{ fontSize: 11, color: 'rgba(232,220,192,0.5)', marginTop: 6, fontFamily: 'JetBrains Mono', letterSpacing: 0.6 }}>
          {ROOMS.filter(r => r.status === 'live').length} LIVE · {ROOMS.filter(r => r.status === 'open').length} OPEN · ${ROOMS.reduce((s, r) => s + r.pot, 0).toLocaleString()} IN PLAY
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '10px 18px 12px', overflowX: 'auto' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ flexShrink: 0 }}><StatPill s={s}/></div>
        ))}
      </div>

      {/* segmented filters */}
      <div style={{ padding: '0 18px 12px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {['All', 'Live', 'Open', 'Free'].map((t, i) => (
          <div key={i} style={{
            padding: '6px 14px', borderRadius: 999, flexShrink: 0,
            background: i === 0 ? 'rgba(212,175,55,0.18)' : 'rgba(0,0,0,0.25)',
            color: i === 0 ? '#d4af37' : 'rgba(232,220,192,0.65)',
            fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.2,
            border: i === 0 ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(212,175,55,0.1)',
          }}>{t}</div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 18px 100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ROOMS.slice(0, 4).map(r => <FloorCard key={r.id} room={r} size="md"/>)}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 28, left: 18, right: 18 }}>
        <button style={{
          width: '100%', padding: '14px', borderRadius: 999, fontSize: 13, fontWeight: 700, letterSpacing: 1,
          textTransform: 'uppercase', cursor: 'pointer',
          background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
          color: '#1a1208', border: '1px solid #806316',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          Open a new table
        </button>
      </div>
    </FloorChrome>
  );
}
