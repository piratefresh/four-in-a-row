// v1-parlor.jsx — Variation 1: The Parlor (editorial casino, hero featured room)
// Desktop + mobile

const PARLOR_BG = 'radial-gradient(ellipse at top left, #143829 0%, #0c2620 45%, #08201a 100%)';

function ParlorChrome({ children, mobile = false }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: PARLOR_BG, color: '#e8dcc0',
      fontFamily: 'Inter, system-ui', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* subtle felt noise */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(rgba(255,255,255,0.012) 1px, transparent 1px)`,
        backgroundSize: '3px 3px', opacity: 0.6,
      }}/>
      {children}
    </div>
  );
}

// ─── DESKTOP: The Parlor ───────────────────────────────────────
function ParlorDesktop() {
  const featured = ROOMS[0]; // Monastery
  const others = ROOMS.slice(1, 5);
  return (
    <ParlorChrome>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid rgba(212,175,55,0.12)',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#0c2620', border: '1px solid rgba(212,175,55,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#d4af37', cursor: 'pointer',
          }}>
            <svg width="10" height="14" viewBox="0 0 10 14"><path d="M8 2L2 7l6 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 2, color: 'rgba(212,175,55,0.65)' }}>
            <span>HOME</span>
            <span style={{ opacity: 0.4 }}>/</span>
            <span style={{ color: '#d4af37' }}>THE PARLOR</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.5)', letterSpacing: 1.4 }}>
            <span style={{ color: '#9ec27a' }}>●</span> 142 ONLINE
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '4px 4px 4px 14px', borderRadius: 999,
            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(212,175,55,0.18)',
          }}>
            <div style={{ fontSize: 12 }}>Dylan</div>
            <Avo a={{ name: 'Dylan M', color: '#d4af37' }} size={26} />
          </div>
        </div>
      </div>

      {/* Editorial header */}
      <div style={{ padding: '36px 40px 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, letterSpacing: 3, color: '#d4af37', marginBottom: 14 }}>
            VOL. XII · NIGHTLY · TUE
          </div>
          <h1 style={{
            margin: 0, fontFamily: '"Noto Serif", serif', fontWeight: 600,
            fontSize: 56, lineHeight: 0.95, color: '#f4e4c1', letterSpacing: -1.5,
          }}>
            Tonight at <em style={{ fontStyle: 'italic', color: '#d4af37' }}>the parlor</em>
          </h1>
          <div style={{ marginTop: 10, fontSize: 14, color: 'rgba(232,220,192,0.55)', maxWidth: 520 }}>
            Six tables open. The Monastery is on fire — Mira just rinsed the room for sixty-four points.
          </div>
        </div>
        <button style={{
          padding: '14px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700, letterSpacing: 1,
          textTransform: 'uppercase', cursor: 'pointer',
          background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
          color: '#1a1208', border: '1px solid #806316',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Deal a new table
        </button>
      </div>

      {/* Stat strip — integrated into a horizontal ledger row */}
      <div style={{
        margin: '4px 40px 28px', padding: '14px 24px',
        background: 'rgba(0,0,0,0.22)',
        border: '1px solid rgba(212,175,55,0.15)',
        borderRadius: 8,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', position: 'relative', zIndex: 2,
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            paddingLeft: i === 0 ? 0 : 24, paddingRight: i === 3 ? 0 : 24,
            borderLeft: i === 0 ? 'none' : '1px solid rgba(212,175,55,0.12)',
          }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.6, color: 'rgba(232,220,192,0.5)', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{
              fontFamily: '"Noto Serif", serif', fontWeight: 600,
              fontSize: 26, color: s.accent ? '#d4af37' : '#f4e4c1', marginTop: 4, lineHeight: 1,
            }}>{s.val}</div>
            {s.sub && <div style={{ fontSize: 11, color: 'rgba(232,220,192,0.45)', marginTop: 4, fontFamily: 'JetBrains Mono' }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Hero featured + room list */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 24,
        padding: '0 40px 40px', position: 'relative', zIndex: 2, minHeight: 0,
      }}>
        {/* HERO */}
        <div style={{
          position: 'relative', borderRadius: 14, overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0.3) 100%)',
          border: '1px solid rgba(212,175,55,0.3)',
          padding: 28,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 0 60px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <StatusDot status="live"/>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.6, color: 'rgba(232,220,192,0.55)' }}>HAND #{featured.handsPlayed} · {featured.sub}</span>
              </div>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 36, fontWeight: 600, color: '#f4e4c1', letterSpacing: -0.5 }}>{featured.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.4, color: 'rgba(232,220,192,0.5)' }}>BLINDS</div>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 22, color: '#d4af37', fontWeight: 600 }}>{featured.buyIn}</div>
            </div>
          </div>

          {/* Mini felt with pot + live word */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0', minHeight: 0 }}>
            <MiniFelt room={featured} size={360}/>
          </div>

          {/* Last word card */}
          <div style={{
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.18)',
            borderRadius: 10, padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
          }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.4, color: 'rgba(232,220,192,0.5)', marginBottom: 4 }}>LAST PLAY · {featured.lastWordBy}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {featured.lastWord.split('').map((L, i) => (
                  <div key={i} style={{
                    width: 22, height: 26, borderRadius: 3,
                    background: 'linear-gradient(165deg, #fff3d1 0%, #f4e4c1 50%, #d9c392 100%)',
                    color: '#2b1810', fontFamily: 'Inter', fontWeight: 800, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 2px 3px rgba(0,0,0,0.4)',
                  }}>{L}</div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 28, fontWeight: 600, color: '#d4af37', lineHeight: 1 }}>+{featured.lastWordPts}</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.2, color: 'rgba(232,220,192,0.5)', marginTop: 2 }}>POINTS</div>
            </div>
          </div>

          {/* CTA row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button style={{
              flex: 1, padding: '14px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase', cursor: 'pointer',
              background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
              color: '#1a1208', border: '1px solid #806316',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}>Take the last seat · ${featured.buyIn.split('/')[1]}</button>
            <button style={{
              padding: '14px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'transparent', color: '#e8dcc0', cursor: 'pointer',
              border: '1px solid rgba(212,175,55,0.3)',
            }}>Spectate</button>
          </div>
        </div>

        {/* Right column — other rooms */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 20, color: '#f4e4c1', fontWeight: 600, fontStyle: 'italic' }}>Other tables</div>
            <div style={{ display: 'flex', gap: 14, fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.4, color: 'rgba(232,220,192,0.5)' }}>
              <span style={{ color: '#d4af37' }}>ALL</span>
              <span>OPEN</span>
              <span>LIVE</span>
              <span>FREE</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', minHeight: 0 }}>
            {others.map((r, i) => (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.9fr 0.7fr',
                gap: 12, alignItems: 'center',
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(0,0,0,0.22)',
                border: '1px solid rgba(212,175,55,0.1)',
                cursor: r.status === 'full' ? 'not-allowed' : 'pointer',
                opacity: r.status === 'full' ? 0.55 : 1,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f4e4c1' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(232,220,192,0.45)', marginTop: 3, fontFamily: 'JetBrains Mono' }}>{r.sub}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AvatarStack list={r.avatars} size={22} max={4}/>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'rgba(232,220,192,0.55)' }}>{r.taken}/{r.seats}</span>
                </div>
                <div>
                  <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 16, color: '#d4af37', fontWeight: 600 }}>{r.buyIn}</div>
                  <Sparkline values={r.potTrend} w={88} h={18} color="#d4af37" fill={false}/>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <StatusDot status={r.status}/>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: r.status === 'live' ? '#d4af37' : 'rgba(232,220,192,0.5)' }}>{r.nextHand}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ParlorChrome>
  );
}

// ─── MOBILE: The Parlor ───────────────────────────────────────
function ParlorMobile() {
  const featured = ROOMS[0];
  const others = ROOMS.slice(1, 4);
  return (
    <ParlorChrome mobile>
      {/* Status bar spacing */}
      <div style={{ height: 54 }}/>
      {/* nav */}
      <div style={{ padding: '0 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="9" height="13" viewBox="0 0 9 13"><path d="M7 1L2 6.5L7 12" stroke="#d4af37" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: '#d4af37' }}>THE PARLOR</div>
        <Avo a={{ name: 'Dylan', color: '#d4af37' }} size={28}/>
      </div>

      <div style={{ padding: '18px 18px 12px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: 'rgba(212,175,55,0.7)', marginBottom: 6 }}>VOL. XII · NIGHTLY</div>
        <h1 style={{ margin: 0, fontFamily: '"Noto Serif", serif', fontWeight: 600, fontSize: 30, lineHeight: 0.95, color: '#f4e4c1', letterSpacing: -0.8 }}>
          Tonight at <em style={{ color: '#d4af37' }}>the parlor</em>
        </h1>
      </div>

      {/* Stats — horizontal chips */}
      <div style={{ display: 'flex', gap: 8, padding: '4px 18px 16px', overflowX: 'auto' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            minWidth: 116, padding: '10px 12px', borderRadius: 8,
            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(212,175,55,0.14)',
            flexShrink: 0,
          }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.4, color: 'rgba(232,220,192,0.5)', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 18, color: s.accent ? '#d4af37' : '#f4e4c1', fontWeight: 600, marginTop: 4 }}>{s.val}</div>
            {s.sub && <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: 'rgba(232,220,192,0.4)', marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Hero featured */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{
          borderRadius: 14, padding: 16, position: 'relative',
          background: 'linear-gradient(180deg, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0.3) 100%)',
          border: '1px solid rgba(212,175,55,0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <StatusDot status="live"/>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 22, fontWeight: 600, color: '#f4e4c1', marginTop: 6 }}>{featured.name}</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.5)', marginTop: 3, letterSpacing: 1.2 }}>{featured.sub}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(232,220,192,0.5)', letterSpacing: 1.2 }}>BLINDS</div>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 16, color: '#d4af37', fontWeight: 600 }}>{featured.buyIn}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <MiniFelt room={featured} size={240}/>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.18)',
            borderRadius: 8, padding: '10px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
          }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'rgba(232,220,192,0.5)', letterSpacing: 1.2, marginBottom: 4 }}>LAST · {featured.lastWordBy}</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {featured.lastWord.split('').map((L, i) => (
                  <div key={i} style={{
                    width: 16, height: 19, borderRadius: 2,
                    background: 'linear-gradient(165deg, #fff3d1 0%, #f4e4c1 50%, #d9c392 100%)',
                    color: '#2b1810', fontFamily: 'Inter', fontWeight: 800, fontSize: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{L}</div>
                ))}
              </div>
            </div>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 22, color: '#d4af37', fontWeight: 600 }}>+{featured.lastWordPts}</div>
          </div>
          <button style={{
            width: '100%', padding: '13px', borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: 1,
            textTransform: 'uppercase', cursor: 'pointer',
            background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
            color: '#1a1208', border: '1px solid #806316',
          }}>Take the last seat</button>
        </div>
      </div>

      {/* Other tables */}
      <div style={{ padding: '6px 18px 18px', flex: 1, overflow: 'auto' }}>
        <div style={{ fontFamily: '"Noto Serif", serif', fontStyle: 'italic', fontSize: 16, color: '#f4e4c1', marginBottom: 10 }}>Other tables</div>
        {others.map(r => (
          <div key={r.id} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '12px 12px', marginBottom: 6, borderRadius: 10,
            background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(212,175,55,0.1)',
            opacity: r.status === 'full' ? 0.5 : 1,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f4e4c1' }}>{r.name}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <StatusDot status={r.status}/>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.5)' }}>{r.buyIn}</span>
              </div>
            </div>
            <AvatarStack list={r.avatars} size={20} max={3}/>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'rgba(232,220,192,0.6)' }}>{r.taken}/{r.seats}</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: r.status === 'live' ? '#d4af37' : 'rgba(232,220,192,0.4)', marginTop: 2 }}>{r.nextHand}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating CTA */}
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
          Deal a new table
        </button>
      </div>
    </ParlorChrome>
  );
}
