// v4-createroom-screens.jsx — Desktop modal + mobile sheet

// ─── DESKTOP: modal over the Wire ─────────────────────────────
function CreateRoomDesktop() {
  const s = CRState();
  const blind = pickBlind(s.blindIdx);
  const blindLabel = blind.sb === 0 ? 'Free table' : `$${blind.sb}/$${blind.bb}`;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* dim the Wire underneath */}
      <div style={{ width: '100%', height: '100%', filter: 'blur(2px) brightness(0.4)' }}>
        <TickerDesktop/>
      </div>
      {/* backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,16,12,0.55)' }}/>

      {/* dialog */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 920,
        background: 'linear-gradient(180deg, #0e2820 0%, #081a14 100%)',
        border: '1px solid rgba(212,175,55,0.35)',
        borderRadius: 14,
        boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(212,175,55,0.06)',
        color: '#e8dcc0', fontFamily: 'Inter',
        overflow: 'hidden',
      }}>
        {/* perforated header strip — "deal slip" */}
        <div style={{
          padding: '18px 28px', borderBottom: '1px dashed rgba(212,175,55,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2.2, color: '#d4af37' }}>NEW TABLE · DEAL SLIP No. 1247</div>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 28, fontWeight: 600, color: '#f4e4c1', letterSpacing: -0.5, marginTop: 4, fontStyle: 'italic' }}>Deal a new table</div>
          </div>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            color: '#e8dcc0', fontSize: 14,
          }}>×</div>
        </div>

        {/* two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr' }}>
          {/* LEFT: form */}
          <div style={{ padding: '24px 28px 16px', borderRight: '1px solid rgba(212,175,55,0.12)' }}>
            <div style={{ fontSize: 12, color: 'rgba(232,220,192,0.55)', marginBottom: 22, lineHeight: 1.5 }}>
              Set the table rules. Once dealt, blinds and tempo are locked for the night.
            </div>

            {/* Name */}
            <div style={{ marginBottom: 18 }}>
              <FieldHeader icon="A" label="Room name" hint="VISIBLE ON THE WIRE"/>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={s.name} onChange={(e) => s.setName(e.target.value)} style={{
                  flex: 1, padding: '11px 14px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.2)',
                  color: '#f4e4c1', fontFamily: 'Inter', fontSize: 14, outline: 'none',
                }}/>
                <button onClick={() => s.setPrivate(!s.isPrivate)} title={s.isPrivate ? 'Private — invite only' : 'Public — listed on The Wire'} style={{
                  width: 42, height: 42, borderRadius: 8,
                  background: s.isPrivate ? 'rgba(212,175,55,0.18)' : 'rgba(0,0,0,0.3)',
                  border: `1px solid ${s.isPrivate ? 'rgba(212,175,55,0.5)' : 'rgba(212,175,55,0.2)'}`,
                  color: s.isPrivate ? '#d4af37' : '#e8dcc0', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {s.isPrivate ? (
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none"><path d="M3 7V4a4 4 0 118 0v3M2 7h10v8H2V7z" stroke="currentColor" strokeWidth="1.5"/></svg>
                  ) : (
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none"><path d="M3 7V4a4 4 0 014-4 4 4 0 014 4M2 7h10v8H2V7z" stroke="currentColor" strokeWidth="1.5"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Turn timer */}
            <div style={{ marginBottom: 18 }}>
              <FieldHeader icon="⏱" label="Turn timer" hint="PER PLAYER"/>
              <div style={{ display: 'flex', gap: 6 }}>
                {[30, 60, 90, 120].map(t => (
                  <CRTile key={t} active={s.timer === t} onClick={() => s.setTimer(t)}>{t}s</CRTile>
                ))}
                <div style={{
                  flex: 1.4, display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 12px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.15)',
                  minHeight: 40,
                }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.5)', letterSpacing: 1.2 }}>CUSTOM</span>
                  <input type="number" value={![30,60,90,120].includes(s.timer) ? s.timer : ''} placeholder="—"
                    onChange={(e) => s.setTimer(Number(e.target.value) || 60)}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: '#f4e4c1', fontFamily: 'JetBrains Mono', fontSize: 13, textAlign: 'right',
                    }}/>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'rgba(232,220,192,0.5)' }}>s</span>
                </div>
              </div>
            </div>

            {/* Betting */}
            <div style={{ marginBottom: 18 }}>
              <FieldHeader icon="◈" label="Betting structure"/>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { id: 'no-limit',  label: 'No limit',  sub: 'SHOVE ANY TIME' },
                  { id: 'pot-limit', label: 'Pot limit', sub: 'CAP AT POT' },
                  { id: 'fixed',     label: 'Fixed',     sub: 'BB INCREMENTS' },
                ].map(b => (
                  <button key={b.id} onClick={() => s.setBetting(b.id)} style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    background: s.betting === b.id ? 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)' : 'rgba(0,0,0,0.3)',
                    color: s.betting === b.id ? '#1a1208' : '#e8dcc0',
                    border: s.betting === b.id ? '1px solid #806316' : '1px solid rgba(212,175,55,0.15)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    fontFamily: 'Inter',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.label}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.2, opacity: 0.65 }}>{b.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stakes slider — picks blind preset */}
            <div style={{ marginBottom: 18 }}>
              <FieldHeader icon="$" label="Stakes" hint={`SB $${blind.sb} · BB $${blind.bb}`}/>
              <div style={{ display: 'flex', gap: 6 }}>
                {BLIND_PRESETS.map((b, i) => (
                  <button key={i} onClick={() => s.setBlindIdx(i)} style={{
                    flex: 1, padding: '11px 8px', borderRadius: 8, cursor: 'pointer',
                    background: s.blindIdx === i ? 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)' : 'rgba(0,0,0,0.3)',
                    color: s.blindIdx === i ? '#1a1208' : '#e8dcc0',
                    border: s.blindIdx === i ? '1px solid #806316' : '1px solid rgba(212,175,55,0.15)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    fontFamily: 'Inter',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{b.label}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, opacity: 0.7, letterSpacing: 0.6 }}>
                      {b.sb === 0 ? '—' : `$${b.sb}/${b.bb}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Seats + 2-letter tiles row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              <div>
                <FieldHeader icon="◉" label="Seats"/>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[2, 4, 6].map(n => (
                    <CRTile key={n} active={s.seats === n} onClick={() => s.setSeats(n)}>{n}</CRTile>
                  ))}
                </div>
              </div>
              <div>
                <FieldHeader icon="T" label="Two-letter tiles"/>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['0-1', '2-3'].map(t => (
                    <CRTile key={t} active={s.twoLetter === t} onClick={() => s.setTwoLetter(t)}>{t}</CRTile>
                  ))}
                </div>
              </div>
            </div>

            {/* Bonuses */}
            <div style={{ marginBottom: 4 }}>
              <FieldHeader icon="★" label="Bonus rules"/>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { id: 'classic',  label: 'Classic',  sub: '7-LETTER +50' },
                  { id: 'no-rack',  label: 'No rack',  sub: 'NO BONUS' },
                  { id: 'big-rack', label: 'Big rack', sub: 'FULL RACK +100' },
                ].map(b => (
                  <button key={b.id} onClick={() => s.setBonuses(b.id)} style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    background: s.bonuses === b.id ? 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)' : 'rgba(0,0,0,0.3)',
                    color: s.bonuses === b.id ? '#1a1208' : '#e8dcc0',
                    border: s.bonuses === b.id ? '1px solid #806316' : '1px solid rgba(212,175,55,0.15)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    fontFamily: 'Inter',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.label}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.2, opacity: 0.65 }}>{b.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: live preview */}
          <div style={{
            padding: '24px 28px', background: 'rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <PreviewWireRow s={s}/>

            {/* Stake math */}
            <div style={{
              marginTop: 22, padding: '14px 16px', borderRadius: 10,
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.15)',
            }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, color: 'rgba(232,220,192,0.5)', marginBottom: 8 }}>
                YOUR BUY-IN
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 32, color: '#d4af37', fontWeight: 600, lineHeight: 1 }}>
                  ${(blind.bb * 100).toLocaleString()}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.5)', letterSpacing: 1 }}>
                  = 100 × BB
                </div>
              </div>
              <div style={{
                marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(212,175,55,0.12)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.55)', letterSpacing: 0.6,
              }}>
                <div>YOUR CHIPS: <span style={{ color: '#f4e4c1' }}>$1,500</span></div>
                <div style={{ textAlign: 'right' }}>AFTER: <span style={{ color: '#f4e4c1' }}>${(1500 - blind.bb * 100).toLocaleString()}</span></div>
              </div>
            </div>

            <div style={{ flex: 1 }}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '18px 28px', borderTop: '1px dashed rgba(212,175,55,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.5)', letterSpacing: 1.4 }}>
            <span style={{ color: '#d4af37' }}>↵</span> RETURN TO DEAL · <span style={{ opacity: 0.6 }}>ESC TO CANCEL</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={{
              padding: '12px 18px', borderRadius: 8,
              background: 'transparent', color: 'rgba(232,220,192,0.7)',
              border: '1px solid rgba(212,175,55,0.2)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}>Cancel</button>
            <button style={{
              padding: '13px 22px', borderRadius: 8,
              background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
              color: '#1a1208', border: '1px solid #806316', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 14px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              Deal the table
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, opacity: 0.7 }}>·</span>
              <span style={{ fontFamily: '"Noto Serif", serif', fontSize: 16, fontStyle: 'italic' }}>{blindLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
