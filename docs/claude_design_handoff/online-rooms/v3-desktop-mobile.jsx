// v3-desktop-mobile.jsx — Ticker desktop + mobile

// ─── DESKTOP: The Ticker ───────────────────────────────────────
function TickerDesktop() {
  return (
    <TickerChrome>
      {/* top bar — newspaper masthead */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 36px', borderBottom: '1px solid rgba(212,175,55,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="9" height="13" viewBox="0 0 9 13"><path d="M7 1L2 6.5L7 12" stroke="#d4af37" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2, color: 'rgba(212,175,55,0.65)' }}>
            HOME · <span style={{ color: '#d4af37' }}>THE WIRE</span>
          </div>
        </div>
        {/* live tape ticker */}
        <div style={{
          flex: 1, margin: '0 32px', overflow: 'hidden', position: 'relative',
          background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '6px 14px',
          fontFamily: 'JetBrains Mono', fontSize: 11, color: 'rgba(232,220,192,0.7)',
          border: '1px solid rgba(212,175,55,0.1)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#ff5d4e' }}>● LIVE</span>
          <span style={{ margin: '0 14px', opacity: 0.4 }}>|</span>
          <span style={{ color: '#d4af37' }}>MIRA</span> · TINCTURES · <span style={{ color: '#d4af37' }}>+64</span>
          <span style={{ margin: '0 14px', opacity: 0.4 }}>|</span>
          <span style={{ color: '#d4af37' }}>OLLO</span> · ZEPHYR · <span style={{ color: '#d4af37' }}>+51</span>
          <span style={{ margin: '0 14px', opacity: 0.4 }}>|</span>
          <span style={{ color: '#d4af37' }}>ZACK</span> · RUSTICS · <span style={{ color: '#d4af37' }}>+29</span>
          <span style={{ margin: '0 14px', opacity: 0.4 }}>|</span>
          POT @ MONASTERY · <span style={{ color: '#d4af37' }}>$4,280</span>
        </div>
        <Avo a={{ name: 'Dylan M', color: '#d4af37' }} size={28}/>
      </div>

      {/* main split */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.5fr 1fr', minHeight: 0 }}>
        {/* left — rooms */}
        <div style={{ padding: '24px 28px 24px 36px', borderRight: '1px solid rgba(212,175,55,0.12)', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 3, color: '#d4af37' }}>VOL. XII · NIGHTLY</div>
              <h1 style={{ margin: '4px 0 0', fontFamily: '"Noto Serif", serif', fontSize: 42, fontWeight: 600, color: '#f4e4c1', letterSpacing: -1, lineHeight: 1 }}>The Wire</h1>
            </div>
            <button style={{
              padding: '11px 18px', borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase', cursor: 'pointer',
              background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
              color: '#1a1208', border: '1px solid #806316',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="11" height="11" viewBox="0 0 11 11"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              New room
            </button>
          </div>

          {/* compact stats */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {STATS.map((s, i) => (
              <div key={i} style={{
                flex: 1, padding: '10px 14px', borderRadius: 8,
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.1)',
                borderLeft: s.accent ? '2px solid #d4af37' : '1px solid rgba(212,175,55,0.1)',
              }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.4, color: 'rgba(232,220,192,0.5)', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 18, color: s.accent ? '#d4af37' : '#f4e4c1', fontWeight: 600, marginTop: 2, lineHeight: 1.1 }}>{s.val}</div>
                {s.sub && <div style={{ fontSize: 10, color: 'rgba(232,220,192,0.4)', fontFamily: 'JetBrains Mono' }}>{s.sub}</div>}
              </div>
            ))}
          </div>

          {/* column header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.9fr 0.8fr 60px', gap: 14,
            padding: '0 18px 10px', fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, color: 'rgba(232,220,192,0.45)',
          }}>
            <div>ROOM</div>
            <div>SEATS</div>
            <div>POT</div>
            <div>TREND ↗</div>
            <div></div>
          </div>

          {ROOMS.slice(0, 6).map(r => <TickerRoomCard key={r.id} room={r}/>)}
        </div>

        {/* right — live activity feed */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{
            padding: '24px 28px 16px', borderBottom: '1px solid rgba(212,175,55,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5d4e', animation: 'pulse 1.6s ease-in-out infinite' }}/>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2, color: 'rgba(232,220,192,0.6)' }}>LIVE FEED · LAST 90s</div>
            </div>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 24, color: '#f4e4c1', fontWeight: 600, fontStyle: 'italic' }}>What's happening</div>
          </div>

          {/* big play */}
          <div style={{ padding: '18px 28px', background: 'rgba(212,175,55,0.06)', borderBottom: '1px solid rgba(212,175,55,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, color: '#d4af37', marginBottom: 6 }}>HEADLINE PLAY · 8s AGO</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Avo a={{ name: 'Mira Quill', color: '#e6b450' }} size={26}/>
                  <span style={{ fontSize: 14, color: '#f4e4c1', fontWeight: 600 }}>Mira Quill</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.5)' }}>@ THE MONASTERY</span>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {'TINCTURES'.split('').map((L, i) => (
                    <div key={i} style={{
                      width: 22, height: 26, borderRadius: 3,
                      background: 'linear-gradient(165deg, #fff3d1 0%, #f4e4c1 50%, #d9c392 100%)',
                      color: '#2b1810', fontFamily: 'Inter', fontWeight: 800, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 2px 3px rgba(0,0,0,0.4)',
                    }}>{L}</div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 36, color: '#d4af37', fontWeight: 600, lineHeight: 1 }}>+64</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.5)', letterSpacing: 1.2, marginTop: 2 }}>POINTS</div>
              </div>
            </div>
          </div>

          {/* live ticker */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 28px 24px' }}>
            {TICKER.map((ev, i) => <TickerRow key={i} ev={ev}/>)}
          </div>
        </div>
      </div>
    </TickerChrome>
  );
}

// ─── MOBILE: The Ticker ───────────────────────────────────────
function TickerMobile() {
  return (
    <TickerChrome>
      <div style={{ height: 54 }}/>
      {/* nav + scrolling tape */}
      <div style={{ padding: '0 14px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="9" height="13" viewBox="0 0 9 13"><path d="M7 1L2 6.5L7 12" stroke="#d4af37" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
        </div>
        <div style={{
          flex: 1, overflow: 'hidden', borderRadius: 6,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.12)',
          padding: '5px 10px', fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.6)',
          whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#ff5d4e' }}>●</span>
          <span style={{ color: '#d4af37' }}>MIRA</span>·TINCTURES·<span style={{ color: '#d4af37' }}>+64</span>
        </div>
        <Avo a={{ name: 'Dylan', color: '#d4af37' }} size={28}/>
      </div>

      <div style={{ padding: '12px 18px 8px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2.5, color: '#d4af37' }}>VOL. XII · NIGHTLY</div>
        <h1 style={{ margin: '4px 0 0', fontFamily: '"Noto Serif", serif', fontSize: 30, fontWeight: 600, color: '#f4e4c1', letterSpacing: -0.6, lineHeight: 0.95 }}>The Wire</h1>
      </div>

      {/* stats */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 18px 14px', overflowX: 'auto' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            minWidth: 116, padding: '10px 12px', borderRadius: 8, flexShrink: 0,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.1)',
            borderLeft: s.accent ? '2px solid #d4af37' : '1px solid rgba(212,175,55,0.1)',
          }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.2, color: 'rgba(232,220,192,0.5)' }}>{s.label}</div>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 16, color: s.accent ? '#d4af37' : '#f4e4c1', fontWeight: 600, marginTop: 2 }}>{s.val}</div>
            {s.sub && <div style={{ fontSize: 9, color: 'rgba(232,220,192,0.4)', fontFamily: 'JetBrains Mono' }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* big play */}
      <div style={{ margin: '0 18px 12px', padding: '12px 14px', borderRadius: 10, background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.4, color: '#d4af37', marginBottom: 4 }}>HEADLINE · 8s AGO</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Avo a={{ name: 'Mira Q', color: '#e6b450' }} size={20}/>
              <span style={{ fontSize: 12, color: '#f4e4c1', fontWeight: 600 }}>Mira</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.5)' }}>@ MONASTERY</span>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {'TINCTURES'.split('').map((L, i) => (
                <div key={i} style={{
                  width: 16, height: 19, borderRadius: 2,
                  background: 'linear-gradient(165deg, #fff3d1 0%, #f4e4c1 50%, #d9c392 100%)',
                  color: '#2b1810', fontFamily: 'Inter', fontWeight: 800, fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{L}</div>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 28, color: '#d4af37', fontWeight: 600, lineHeight: 1 }}>+64</div>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 14, padding: '0 18px 10px', borderBottom: '1px solid rgba(212,175,55,0.12)', fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.4 }}>
        <div style={{ color: '#d4af37', padding: '6px 0', borderBottom: '2px solid #d4af37' }}>ROOMS · 6</div>
        <div style={{ color: 'rgba(232,220,192,0.5)', padding: '6px 0' }}>FEED</div>
        <div style={{ color: 'rgba(232,220,192,0.5)', padding: '6px 0' }}>FRIENDS · 4</div>
      </div>

      {/* rooms compact */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px 100px' }}>
        {ROOMS.slice(0, 5).map(r => <TickerRoomCard key={r.id} room={r} compact/>)}
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
          Open a new room
        </button>
      </div>
    </TickerChrome>
  );
}
