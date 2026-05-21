// v4-createroom-mobile.jsx — Mobile bottom sheet

function CreateRoomMobile() {
  const s = CRState();
  const blind = pickBlind(s.blindIdx);
  const blindLabel = blind.sb === 0 ? 'Free' : `$${blind.sb}/$${blind.bb}`;
  const betShort = s.betting === 'no-limit' ? 'No-limit' : s.betting === 'pot-limit' ? 'Pot-limit' : 'Limit';

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: 'linear-gradient(180deg, #0a1d17 0%, #051410 100%)',
      color: '#e8dcc0', fontFamily: 'Inter', overflow: 'hidden',
    }}>
      {/* dimmed Wire preview behind */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.18, filter: 'blur(1.5px)' }}>
        <TickerMobile/>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,16,12,0.55)' }}/>

      {/* sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(180deg, #0e2820 0%, #081a14 100%)',
        borderTop: '1px solid rgba(212,175,55,0.4)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        maxHeight: '92%', display: 'flex', flexDirection: 'column',
      }}>
        {/* drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(232,220,192,0.25)' }}/>
        </div>

        {/* header */}
        <div style={{ padding: '12px 22px 14px', borderBottom: '1px dashed rgba(212,175,55,0.22)' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2.2, color: '#d4af37' }}>NEW TABLE · SLIP No. 1247</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 24, fontWeight: 600, color: '#f4e4c1', letterSpacing: -0.5, marginTop: 3, fontStyle: 'italic' }}>Deal a new table</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, color: 'rgba(232,220,192,0.6)' }}>×</div>
          </div>
        </div>

        {/* live preview chip */}
        <div style={{
          margin: '14px 18px 4px', padding: '10px 12px', borderRadius: 10,
          background: 'rgba(212,175,55,0.05)', border: '1px dashed rgba(212,175,55,0.35)',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.6, color: 'rgba(232,220,192,0.55)', marginBottom: 6 }}>PREVIEW ON THE WIRE</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f4e4c1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || 'Untitled Table'}</div>
                {s.isPrivate && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: '#d4af37', letterSpacing: 1, padding: '1px 4px', borderRadius: 2, border: '1px solid rgba(212,175,55,0.4)' }}>PRIV</span>}
                <StatusDot status="open"/>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.5)', marginTop: 2, letterSpacing: 0.8 }}>
                {s.timer}s · {betShort} · {s.twoLetter}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 16, color: '#d4af37', fontWeight: 600, lineHeight: 1 }}>{blindLabel}</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.45)', marginTop: 2 }}>1/{s.seats} SEATS</div>
            </div>
          </div>
        </div>

        {/* scrollable form */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 18px' }}>
          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <FieldHeader icon="A" label="Room name"/>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={s.name} onChange={(e) => s.setName(e.target.value)} style={{
                flex: 1, padding: '11px 12px', borderRadius: 8,
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.2)',
                color: '#f4e4c1', fontFamily: 'Inter', fontSize: 14, outline: 'none',
              }}/>
              <button onClick={() => s.setPrivate(!s.isPrivate)} style={{
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
          <div style={{ marginBottom: 16 }}>
            <FieldHeader icon="⏱" label="Turn timer"/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[30, 60, 90, 120].map(t => (
                <CRTile key={t} active={s.timer === t} onClick={() => s.setTimer(t)}>{t}s</CRTile>
              ))}
            </div>
          </div>

          {/* Betting */}
          <div style={{ marginBottom: 16 }}>
            <FieldHeader icon="◈" label="Betting"/>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'no-limit',  label: 'No limit' },
                { id: 'pot-limit', label: 'Pot limit' },
                { id: 'fixed',     label: 'Fixed' },
              ].map(b => (
                <button key={b.id} onClick={() => s.setBetting(b.id)} style={{
                  flex: 1, padding: '11px 8px', borderRadius: 8, cursor: 'pointer',
                  background: s.betting === b.id ? 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)' : 'rgba(0,0,0,0.3)',
                  color: s.betting === b.id ? '#1a1208' : '#e8dcc0',
                  border: s.betting === b.id ? '1px solid #806316' : '1px solid rgba(212,175,55,0.15)',
                  fontFamily: 'Inter', fontSize: 12, fontWeight: 600,
                }}>{b.label}</button>
              ))}
            </div>
          </div>

          {/* Stakes */}
          <div style={{ marginBottom: 16 }}>
            <FieldHeader icon="$" label="Stakes" hint={`SB $${blind.sb} · BB $${blind.bb}`}/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
              {BLIND_PRESETS.map((b, i) => (
                <button key={i} onClick={() => s.setBlindIdx(i)} style={{
                  padding: '10px 4px', borderRadius: 8, cursor: 'pointer',
                  background: s.blindIdx === i ? 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)' : 'rgba(0,0,0,0.3)',
                  color: s.blindIdx === i ? '#1a1208' : '#e8dcc0',
                  border: s.blindIdx === i ? '1px solid #806316' : '1px solid rgba(212,175,55,0.15)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  fontFamily: 'Inter',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{b.label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, opacity: 0.7 }}>
                    {b.sb === 0 ? '—' : `${b.sb}/${b.bb}`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Seats + tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <FieldHeader icon="◉" label="Seats"/>
              <div style={{ display: 'flex', gap: 4 }}>
                {[2, 4, 6].map(n => (
                  <CRTile key={n} active={s.seats === n} onClick={() => s.setSeats(n)}>{n}</CRTile>
                ))}
              </div>
            </div>
            <div>
              <FieldHeader icon="T" label="2-letter tiles"/>
              <div style={{ display: 'flex', gap: 4 }}>
                {['0-1', '2-3'].map(t => (
                  <CRTile key={t} active={s.twoLetter === t} onClick={() => s.setTwoLetter(t)}>{t}</CRTile>
                ))}
              </div>
            </div>
          </div>

          {/* Bonuses */}
          <div style={{ marginBottom: 16 }}>
            <FieldHeader icon="★" label="Bonuses"/>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'classic',  label: 'Classic' },
                { id: 'no-rack',  label: 'No rack' },
                { id: 'big-rack', label: 'Big rack' },
              ].map(b => (
                <button key={b.id} onClick={() => s.setBonuses(b.id)} style={{
                  flex: 1, padding: '11px 6px', borderRadius: 8, cursor: 'pointer',
                  background: s.bonuses === b.id ? 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)' : 'rgba(0,0,0,0.3)',
                  color: s.bonuses === b.id ? '#1a1208' : '#e8dcc0',
                  border: s.bonuses === b.id ? '1px solid #806316' : '1px solid rgba(212,175,55,0.15)',
                  fontFamily: 'Inter', fontSize: 12, fontWeight: 600,
                }}>{b.label}</button>
              ))}
            </div>
          </div>

          {/* Buy-in math */}
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.4, color: 'rgba(232,220,192,0.5)' }}>YOUR BUY-IN</div>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 24, color: '#d4af37', fontWeight: 600, lineHeight: 1, marginTop: 2 }}>
                ${(blind.bb * 100).toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.55)', letterSpacing: 0.6 }}>
              <div>CHIPS: <span style={{ color: '#f4e4c1' }}>$1,500</span></div>
              <div style={{ marginTop: 2 }}>AFTER: <span style={{ color: '#f4e4c1' }}>${(1500 - blind.bb * 100).toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        {/* sticky CTA */}
        <div style={{
          padding: '12px 18px 28px', borderTop: '1px dashed rgba(212,175,55,0.22)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <button style={{
            width: '100%', padding: '15px', borderRadius: 999, cursor: 'pointer',
            background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
            color: '#1a1208', border: '1px solid #806316',
            fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 14px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            Deal the table
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, opacity: 0.7 }}>·</span>
            <span style={{ fontFamily: '"Noto Serif", serif', fontSize: 14, fontStyle: 'italic' }}>{blindLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
