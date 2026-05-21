// v6-game-mobile.jsx — mobile animated game flow

function GameMobile() {
  const { phase, idx, phaseKey } = useGameFlow();
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(180deg, #0a1d17 0%, #051410 100%)',
      color: '#e8dcc0', fontFamily: 'Inter', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: 54 }}/>

      {/* Top bar */}
      <div style={{
        padding: '4px 14px 10px', borderBottom: '1px solid rgba(212,175,55,0.18)',
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="9" height="13" viewBox="0 0 9 13"><path d="M7 1L2 6.5L7 12" stroke="#d4af37" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
        </div>
        <div key={`m-phase-${phaseKey}`} style={{
          textAlign: 'center',
          animation: 'phase-slide 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.8, color: '#d4af37' }}>
            PHASE {phase.phaseNo} · {phase.name.toUpperCase()}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono', fontSize: 18, color: '#9ec27a',
            fontWeight: 600, lineHeight: 1, marginTop: 2, letterSpacing: 1,
            animation: 'timer-pulse 1s ease-in-out infinite',
          }}>00:{(51 - Math.min(50, idx * 7)).toString().padStart(2, '0')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#d4af37', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600,
          }}>?</div>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 4Q1 1 4 1H9Q12 1 12 4V8Q12 11 9 11H6L3 12V11H4Q1 11 1 8V4Z" stroke="#d4af37" strokeWidth="1.3"/></svg>
          </div>
        </div>
      </div>

      {/* Community letters */}
      <div style={{
        padding: '12px 14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        borderBottom: '1px dashed rgba(212,175,55,0.15)',
      }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.6, color: '#d4af37' }}>
          COMMUNITY · {phase.communityCount}/5
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            i < phase.communityCount ? (
              <div key={`mc-${phaseKey}-${i}`} className="gf-tile" style={{ animationDelay: `${i * 0.13}s` }}>
                <GameTile {...COMMUNITY_TILES[i]} size={42}/>
              </div>
            ) : (
              <EmptyTile key={`me-${i}`} size={42}/>
            )
          ))}
        </div>
      </div>

      {/* Felt */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 14 }}>
        <div style={{ position: 'relative', width: 320, height: 220 }}>
          <div style={{
            width: '100%', height: '100%',
            background: 'radial-gradient(ellipse at center, #1a4a35 0%, #0e3422 60%, #08291b 100%)',
            borderRadius: '50%',
            border: '3px solid #3a2815',
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), 0 6px 20px rgba(0,0,0,0.4)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.22)' }}/>
            {/* sweep */}
            <div style={{
              position: 'absolute', inset: 4, borderRadius: '50%',
              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.25) 30deg, transparent 60deg, transparent 360deg)',
              animation: 'felt-sweep 8s linear infinite',
              mask: 'radial-gradient(circle, transparent 64%, #000 66%, #000 72%, transparent 74%)',
              WebkitMask: 'radial-gradient(circle, transparent 64%, #000 66%, #000 72%, transparent 74%)',
              pointerEvents: 'none',
            }}/>
            <div key={`m-pot-${phaseKey}`} style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.6, color: 'rgba(232,220,192,0.55)' }}>POT</div>
              <div style={{
                fontFamily: '"Noto Serif", serif', fontSize: 26, color: '#d4af37',
                fontWeight: 600, lineHeight: 1, marginTop: 2,
                animation: 'pot-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both',
              }}>${phase.pot}</div>
            </div>
          </div>

          {/* flying chips (smaller offsets for mobile felt) */}
          <MobileChipFlight key={`m-chips-${phaseKey}`} phase={phase}/>

          {/* seats */}
          <div style={{ position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)' }}>
            <MiniSeat p={GAME_PLAYERS[2]} bb turn={phase.activeSeat === 2 && !phase.payout}/>
          </div>
          <div style={{ position: 'absolute', left: -34, top: '38%' }}>
            <MiniSeat p={GAME_PLAYERS[1]} sb turn={phase.activeSeat === 1 && !phase.payout}/>
          </div>
          <div style={{ position: 'absolute', right: -34, top: '38%' }}>
            <MiniSeat p={GAME_PLAYERS[3]} turn={phase.activeSeat === 3 && !phase.payout}/>
          </div>
          <div style={{ position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)' }}>
            <MiniSeat p={GAME_PLAYERS[0]} dealer you
              turn={phase.activeSeat === 0 && !phase.payout}
              winner={phase.winnerSeat === 0}/>
          </div>
        </div>
      </div>

      {/* Word so far */}
      <div style={{ textAlign: 'center', padding: '14px 0 4px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.6, color: 'rgba(232,220,192,0.5)' }}>
          {phase.payout ? 'WINNING WORD' : 'BEST WORD SO FAR'}
        </div>
        <div key={`m-word-${phaseKey}`} style={{
          fontFamily: '"Noto Serif", serif', fontSize: 22,
          color: phase.payout ? '#f7df7a' : '#f4e4c1',
          fontWeight: 600, fontStyle: 'italic', marginTop: 2,
          animation: 'word-morph 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) both',
          textShadow: phase.payout ? '0 0 18px rgba(244,211,94,0.5)' : 'none',
        }}>
          {phase.bestWord}
          {phase.bestPts > 0 && <span style={{ color: '#d4af37', fontSize: 14, fontStyle: 'normal' }}> · {phase.bestPts}pts</span>}
        </div>
      </div>

      {/* Your rack */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '6px 14px 10px' }}>
        {HOLE_TILES.map((t, i) => (
          <div key={'mh'+i} style={{
            animation: `hole-slide-in 0.55s ${i * 0.12}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
          }}>
            <GameTile {...t} size={36}/>
          </div>
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          i < phase.communityCount ? (
            <div key={`mrc-${phaseKey}-${i}`} className="gf-tile" style={{ animationDelay: `${i * 0.1}s` }}>
              <GameTile {...COMMUNITY_TILES[i]} size={36} dim/>
            </div>
          ) : (
            <EmptyTile key={`mre-${i}`} size={36}/>
          )
        ))}
      </div>

      {/* Raise slider */}
      <div style={{ padding: '6px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.2, color: 'rgba(232,220,192,0.55)' }}>
          <span>RAISE</span>
          <div style={{ flex: 1, position: 'relative', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: 3, background: '#d4af37', width: '12%', borderRadius: 2 }}/>
            <div style={{ position: 'absolute', left: '12%', top: -5, width: 13, height: 13, borderRadius: '50%', background: '#d4af37', border: '2px solid #1a1208' }}/>
          </div>
          <span style={{ color: '#d4af37', fontWeight: 600, fontSize: 12 }}>$40</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '8px 18px 24px', display: 'flex', gap: 6,
        opacity: (phase.activeSeat === 0 && !phase.payout) ? 1 : 0.6,
        transition: 'opacity 300ms ease',
      }}>
        <button style={{
          flex: 1, padding: '13px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(0,0,0,0.3)', color: '#e8dcc0',
          border: '1px solid rgba(255,93,78,0.4)',
          fontFamily: 'Inter', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
        }}>Fold</button>
        <button style={{
          flex: 1, padding: '13px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(212,175,55,0.12)', color: '#d4af37',
          border: '1px solid rgba(212,175,55,0.4)',
          fontFamily: 'Inter', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
        }}>Check</button>
        <button style={{
          flex: 1.4, padding: '13px', borderRadius: 8, cursor: 'pointer',
          background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
          color: '#1a1208', border: '1px solid #806316',
          fontFamily: 'Inter', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
        }}>{phase.payout ? 'Next hand' : 'Raise $40'}</button>
      </div>

      {/* Chat tab — floating */}
      <div style={{
        position: 'absolute', bottom: 80, right: 14,
        width: 46, height: 46, borderRadius: '50%',
        background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
        border: '1px solid #806316', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 5Q2 2 5 2H13Q16 2 16 5V11Q16 14 13 14H8L4 16V14H5Q2 14 2 11V5Z" stroke="#1a1208" strokeWidth="1.6"/></svg>
        <div style={{
          position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: '50%',
          background: '#ff5d4e', color: '#1a1208', border: '2px solid #0a1d17',
          fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>1</div>
      </div>
    </div>
  );
}

// Smaller offsets for the mobile felt
const M_SEAT_OFFSETS = [
  { x:    0, y:  130 },   // bottom (you)
  { x: -180, y:  -10 },
  { x:    0, y: -130 },
  { x:  180, y:  -10 },
];

function MobileChipFlight({ phase }) {
  const inflight = phase.flying || [];
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      width: 0, height: 0, pointerEvents: 'none', zIndex: 4,
    }}>
      {!phase.payout && M_SEAT_OFFSETS.map((off, seatIdx) => {
        const amount = inflight[seatIdx];
        if (!amount) return null;
        return (
          <div key={`mb-${seatIdx}`} style={{
            position: 'absolute', top: 0, left: 0,
            transform: 'translate(-50%, -50%)',
            '--from-x': `${off.x}px`,
            '--from-y': `${off.y}px`,
            animation: `chip-to-pot 1.3s ${0.15 + seatIdx * 0.06}s cubic-bezier(0.4, 0.0, 0.2, 1) both`,
          }}>
            <Chip amount={amount >= 50 ? 50 : amount} size={22}/>
          </div>
        );
      })}
      {phase.payout && (() => {
        const off = M_SEAT_OFFSETS[phase.winnerSeat];
        return [20, 20, 50, 50, 100].map((d, i) => (
          <div key={`mw-${i}`} style={{
            position: 'absolute', top: 0, left: 0,
            transform: 'translate(-50%, -50%)',
            '--to-x': `${off.x}px`,
            '--to-y': `${off.y}px`,
            animation: `chip-to-winner 1.5s ${0.5 + i * 0.12}s cubic-bezier(0.4, 0.0, 0.2, 1) both`,
          }}>
            <Chip amount={d} size={22}/>
          </div>
        ));
      })()}
    </div>
  );
}

function MiniSeat({ p, dealer, sb, bb, turn, winner, you }) {
  const shadow = winner
    ? '0 0 0 2px #0c2620, 0 0 0 4px #f7df7a, 0 0 28px rgba(244,211,94,0.85)'
    : turn
      ? '0 0 0 2px #0c2620, 0 0 0 3px #d4af37, 0 0 16px rgba(212,175,55,0.45)'
      : '0 0 0 2px #0c2620, 0 2px 6px rgba(0,0,0,0.5)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        {(dealer || sb || bb) && (
          <div style={{
            position: 'absolute', top: -4, right: -6, zIndex: 2,
            width: 16, height: 16, borderRadius: '50%',
            background: dealer ? '#f4e4c1' : sb ? '#d4af37' : '#e07a5f',
            color: '#1a1208', border: '1px solid #3a2815',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 8,
          }}>{dealer ? 'D' : sb ? 'SB' : 'BB'}</div>
        )}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: p.color, color: '#0c1410',
          fontFamily: 'Inter', fontWeight: 800, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: shadow,
          animation: winner ? 'winner-burst 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) both'
                    : turn ? 'seat-breathe 1.6s ease-in-out infinite'
                    : 'none',
          transition: 'box-shadow 250ms ease',
        }}>{p.initials}</div>
      </div>
      <div style={{ marginTop: 4, fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1, color: '#f4e4c1', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {p.name.split(' ')[0]}{you ? ' · YOU' : ''}
      </div>
      <div style={{
        marginTop: 3, padding: '2px 6px', borderRadius: 3,
        background: winner ? '#f7df7a' : turn ? '#d4af37' : 'rgba(0,0,0,0.4)',
        fontFamily: 'JetBrains Mono', fontSize: 7, letterSpacing: 1, fontWeight: 600,
        color: (turn || winner) ? '#1a1208' : '#9ec27a',
        border: (turn || winner) ? 'none' : '1px solid rgba(158,194,122,0.3)',
        transition: 'background 200ms ease, color 200ms ease',
      }}>{winner ? 'WINNER' : turn ? 'YOUR TURN' : 'WAITING'}</div>
      <div style={{ marginTop: 3, fontFamily: '"Noto Serif", serif', fontSize: 10, color: '#d4af37', fontWeight: 600 }}>
        ${p.chips}
      </div>
    </div>
  );
}
