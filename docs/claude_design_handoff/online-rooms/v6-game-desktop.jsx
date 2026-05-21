// v6-game-desktop.jsx — animated game flow (auto-cycles through phases)

const GAME_PLAYERS = [
  { name: 'Magnus Nilsen', initials: 'MN', color: '#a78bfa', chips: 980 },  // 0 — you, bottom, dealer
  { name: 'Ellis March',   initials: 'EM', color: '#e07a5f', chips: 980 },  // 1 — left, SB
  { name: 'Jax Rook',      initials: 'JR', color: '#e6448a', chips: 980 },  // 2 — top, BB
  { name: 'Mira Quill',    initials: 'MQ', color: '#a78bfa', chips: 980 },  // 3 — right
];

// Chip-flight offsets from pot center (felt is ~760×400)
const SEAT_OFFSETS = [
  { x:    0, y:  220, side: 'bottom' },   // you
  { x: -390, y:  -10, side: 'left' },
  { x:    0, y: -220, side: 'top' },
  { x:  390, y:  -10, side: 'right' },
];

// All 5 community tiles in the order they'll be dealt
const COMMUNITY_TILES = [
  { letter: 'A', points: 1, choice: 'E' },
  { letter: 'N', points: 2 },
  { letter: 'O', points: 1 },
  { letter: 'T', points: 1 },
  { letter: 'R', points: 2 },
];

const HOLE_TILES = [
  { letter: 'R', points: 2 },
  { letter: 'W', points: 5 },
];

const CHAT = [
  { who: 'Jax Rook', color: '#e6448a', t: '01:45 AM', msg: 'Someone do something!' },
];

// ─── Phase script ─────────────────────────────────────────────
const PHASES = [
  {
    id: 'preflop',
    phaseNo: 1, name: 'Pre-flop', desc: 'Hole letters dealt',
    duration: 3000, communityCount: 0,
    pot: 30, activeSeat: 1,
    bestWord: '—', bestPts: 0,
    bets:  [0, 10, 20, 0],          // SB, BB
    flying:[0, 10, 20, 0],
    log: [
      { t: '00:00', msg: 'Hand #18 dealt · 4 seats', kind: 'play' },
      { t: '00:02', msg: 'Ellis posted small blind $10', kind: 'call' },
      { t: '00:03', msg: 'Jax posted big blind $20', kind: 'call' },
    ],
  },
  {
    id: 'flop',
    phaseNo: 3, name: 'The Flop', desc: '3 community letters revealed',
    duration: 4200, communityCount: 3,
    pot: 80, activeSeat: 0,
    bestWord: 'ROW', bestPts: 8,
    bets:  [20, 20, 20, 20],
    flying:[20, 20, 20, 20],
    log: [
      { t: '00:08', msg: 'Mira called $20', kind: 'call' },
      { t: '00:14', msg: 'Magnus called $20', kind: 'call' },
      { t: '00:24', msg: 'Flop dealt · A/E · N · O', kind: 'pot' },
    ],
  },
  {
    id: 'turn',
    phaseNo: 4, name: 'The Turn', desc: '4th letter revealed',
    duration: 3800, communityCount: 4,
    pot: 160, activeSeat: 2,
    bestWord: 'WORN', bestPts: 10,
    bets:  [20, 20, 20, 20],
    flying:[20, 20, 20, 20],
    log: [
      { t: '00:38', msg: 'Turn dealt · T', kind: 'pot' },
      { t: '00:42', msg: 'Ellis bet $20', kind: 'raise' },
      { t: '00:48', msg: 'Magnus called $20', kind: 'call' },
    ],
  },
  {
    id: 'river',
    phaseNo: 5, name: 'The River', desc: '5th and final letter',
    duration: 3800, communityCount: 5,
    pot: 280, activeSeat: 0,
    bestWord: 'TOWER', bestPts: 13,
    bets:  [30, 30, 30, 30],
    flying:[30, 30, 30, 30],
    log: [
      { t: '01:02', msg: 'River dealt · R', kind: 'pot' },
      { t: '01:08', msg: 'Mira bet $30', kind: 'raise' },
      { t: '01:14', msg: 'Magnus called $30', kind: 'call' },
    ],
  },
  {
    id: 'showdown',
    phaseNo: 6, name: 'Showdown', desc: 'Magnus wins with TOWER · +$280',
    duration: 4200, communityCount: 5,
    pot: 0, activeSeat: 0, winnerSeat: 0,
    bestWord: 'TOWER', bestPts: 13,
    bets: [0, 0, 0, 0], flying: [0, 0, 0, 0],
    payout: true,
    log: [
      { t: '01:20', msg: 'Showdown · 4 hands shown', kind: 'pot' },
      { t: '01:22', msg: 'Magnus reveals TOWER', kind: 'big', pts: 13 },
      { t: '01:23', msg: 'Magnus wins pot $280', kind: 'big' },
    ],
  },
];

function useGameFlow() {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setIdx(i => (i + 1) % PHASES.length), PHASES[idx].duration);
    return () => clearTimeout(t);
  }, [idx]);
  const phase = PHASES[idx];
  return { phase, idx, phaseKey: `${phase.id}-${idx}` };
}

// Aggregate log up to current phase (capped at 8 most recent)
function logUpTo(idx) {
  const all = [];
  for (let i = 0; i <= idx; i++) all.push(...PHASES[i].log);
  return all.slice(-8);
}

// Chip count for "flying" amount — split into ≤3 chips with denominations
function chipsFor(amount) {
  if (amount <= 0) return [];
  if (amount <= 10) return [10];
  if (amount <= 20) return [20];
  if (amount <= 30) return [10, 20];
  return [20, 20];
}

// ─── DESKTOP GAME ─────────────────────────────────────────────
function GameDesktop() {
  const { phase, idx, phaseKey } = useGameFlow();
  const recentLog = logUpTo(idx);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(180deg, #0a1d17 0%, #051410 100%)',
      color: '#e8dcc0', fontFamily: 'Inter', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '14px 28px', borderBottom: '1px solid rgba(212,175,55,0.18)',
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
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

        {/* center — phase + timer — phase label slides in on change */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div key={phaseKey} style={{ textAlign: 'center', animation: 'phase-slide 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: '#d4af37' }}>PHASE {phase.phaseNo}</div>
            <div style={{ fontFamily: '"Noto Serif", serif', fontStyle: 'italic', fontSize: 16, color: '#f4e4c1', lineHeight: 1, marginTop: 2 }}>{phase.name}</div>
          </div>
          <div style={{ width: 1, height: 28, background: 'rgba(212,175,55,0.25)' }}/>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: 'rgba(232,220,192,0.5)' }}>TURN TIMER</div>
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: 22, color: '#9ec27a',
              fontWeight: 600, lineHeight: 1, letterSpacing: 1,
              animation: 'timer-pulse 1s ease-in-out infinite',
            }}>00:{(51 - Math.min(50, idx * 7)).toString().padStart(2, '0')}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.55)', letterSpacing: 1.4 }}>
            HAND #18 · BLINDS $10/$20
          </div>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            color: '#d4af37', fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600,
          }}>?</div>
        </div>
      </div>

      {/* main 2 columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', minHeight: 0 }}>
        {/* TABLE area */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Community letters — top strip */}
          <div style={{
            padding: '20px 36px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px dashed rgba(212,175,55,0.18)',
            background: 'rgba(0,0,0,0.18)',
          }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: '#d4af37' }}>
                COMMUNITY LETTERS · {phase.communityCount} OF 5 DEALT
              </div>
              <div style={{ fontFamily: '"Noto Serif", serif', fontStyle: 'italic', fontSize: 18, color: '#f4e4c1', marginTop: 2 }}>
                The shared rack
              </div>
            </div>
            <CommunityRow phase={phase} size={52}/>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, color: 'rgba(232,220,192,0.5)' }}>NEXT REVEAL</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#f4e4c1', marginTop: 2 }}>
                {nextReveal(phase)}
              </div>
            </div>
          </div>

          {/* Felt */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 30, minHeight: 0 }}>
            <FeltTable width={760} height={400} label="Word Poker">
              {/* slow gold sweep around the brass rail */}
              <div style={{
                position: 'absolute', inset: 8, borderRadius: '50%',
                background: 'conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.25) 30deg, transparent 60deg, transparent 360deg)',
                animation: 'felt-sweep 9s linear infinite',
                mask: 'radial-gradient(circle, transparent 65%, #000 67%, #000 71%, transparent 73%)',
                WebkitMask: 'radial-gradient(circle, transparent 65%, #000 67%, #000 71%, transparent 73%)',
                pointerEvents: 'none',
              }}/>

              <PotPositioned>
                <PotDisplay key={`pot-${phaseKey}`} amount={phase.pot} sub={phase.payout ? 'PAID OUT' : potSub(phase)} pop/>
              </PotPositioned>

              {/* Flying chip layer — each phase remounts and replays */}
              <ChipFlightLayer key={`chips-${phaseKey}`} phase={phase}/>

              {/* Seats */}
              <div style={{ position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)' }}>
                <Seat seat={GAME_PLAYERS[0]} isYou dealer
                  turn={phase.activeSeat === 0 && !phase.payout}
                  winner={phase.winnerSeat === 0}/>
              </div>
              <div style={{ position: 'absolute', left: -42, top: '38%' }}>
                <Seat seat={GAME_PLAYERS[1]} sb
                  turn={phase.activeSeat === 1 && !phase.payout}/>
              </div>
              <div style={{ position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)' }}>
                <Seat seat={GAME_PLAYERS[2]} bb
                  turn={phase.activeSeat === 2 && !phase.payout}/>
              </div>
              <div style={{ position: 'absolute', right: -42, top: '38%' }}>
                <Seat seat={GAME_PLAYERS[3]}
                  turn={phase.activeSeat === 3 && !phase.payout}/>
              </div>

              {/* Floating "+pts" callout above winner on showdown */}
              {phase.payout && (
                <div key={`payout-${phaseKey}`} style={{
                  position: 'absolute',
                  bottom: -88, left: '50%',
                  fontFamily: '"Noto Serif", serif', fontSize: 26, fontStyle: 'italic',
                  color: '#f7df7a', fontWeight: 700,
                  textShadow: '0 0 18px rgba(244,211,94,0.6)',
                  animation: 'payout-float 3.4s ease-out both',
                  pointerEvents: 'none',
                }}>
                  +${PHASES[3].pot}
                </div>
              )}
            </FeltTable>
          </div>

          {/* Your rack + action panel — deal slip footer */}
          <div style={{
            padding: '18px 28px 24px',
            borderTop: '1px solid rgba(212,175,55,0.18)',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%)',
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 28, alignItems: 'center',
          }}>
            {/* Your rack */}
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: '#d4af37', marginBottom: 8 }}>
                YOUR RACK · 2 HOLE + {phase.communityCount} SHARED
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {HOLE_TILES.map((t, i) => (
                  <div key={'h'+i} style={{
                    animation: `hole-slide-in 0.55s ${i * 0.12}s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                  }}>
                    <GameTile {...t} size={44}/>
                  </div>
                ))}
                <div style={{ width: 8 }}/>
                {Array.from({ length: 5 }).map((_, i) => (
                  i < phase.communityCount ? (
                    <div key={`rc-${phaseKey}-${i}`} className="gf-tile" style={{ animationDelay: `${i * 0.13}s` }}>
                      <GameTile {...COMMUNITY_TILES[i]} size={44} dim/>
                    </div>
                  ) : (
                    <EmptyTile key={`re-${i}`} size={44}/>
                  )
                ))}
              </div>
            </div>

            {/* Word preview — morphs each phase */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: 'rgba(232,220,192,0.5)', marginBottom: 4 }}>
                {phase.payout ? 'WINNING WORD' : 'BEST WORD SO FAR'}
              </div>
              <div key={`word-${phaseKey}`} style={{
                fontFamily: '"Noto Serif", serif', fontSize: 26, color: phase.payout ? '#f7df7a' : '#f4e4c1',
                fontWeight: 600, fontStyle: 'italic',
                animation: 'word-morph 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) both',
                textShadow: phase.payout ? '0 0 22px rgba(244,211,94,0.5)' : 'none',
              }}>
                {phase.bestWord}
                {phase.bestPts > 0 && (
                  <span style={{ color: '#d4af37', fontSize: 16, fontStyle: 'normal', marginLeft: 6 }}>
                    · {phase.bestPts}pts
                  </span>
                )}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.4, color: 'rgba(232,220,192,0.4)', marginTop: 4 }}>
                {phase.payout ? 'POT $280 → MAGNUS' : `${5 - phase.communityCount} MORE TILES TO COME`}
              </div>
            </div>

            {/* Betting */}
            <ActionPanel phase={phase}/>
          </div>
        </div>

        {/* Right — hand log + chat */}
        <div style={{
          borderLeft: '1px solid rgba(212,175,55,0.15)',
          background: 'rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
          <HandLog entries={recentLog} chatMessages={CHAT}/>
        </div>
      </div>
    </div>
  );
}

// ─── helpers / sub-components ─────────────────────────────────

function nextReveal(phase) {
  if (phase.id === 'preflop') return 'FLOP · 3 LETTERS';
  if (phase.id === 'flop')    return 'TURN · 1 LETTER';
  if (phase.id === 'turn')    return 'RIVER · 1 LETTER';
  if (phase.id === 'river')   return 'SHOWDOWN';
  if (phase.id === 'showdown') return 'NEW HAND · 00:08';
  return '—';
}

function potSub(phase) {
  const bb = 20;
  const mult = (phase.pot / bb).toFixed(1);
  return `WORTH ${mult}× BB`;
}

function CommunityRow({ phase, size = 52 }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < phase.communityCount) {
          return (
            <div key={`${phase.id}-${i}`} className="gf-tile" style={{ animationDelay: `${i * 0.16}s` }}>
              <GameTile {...COMMUNITY_TILES[i]} size={size}/>
            </div>
          );
        }
        return <EmptyTile key={`empty-${i}`} size={size}/>;
      })}
    </div>
  );
}

// Pot value with optional pop animation on mount
function PotDisplay({ amount, sub, pop = false }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2, color: 'rgba(232,220,192,0.55)' }}>POT</div>
      <div style={{
        fontFamily: '"Noto Serif", serif', fontSize: 36, color: '#d4af37',
        fontWeight: 600, lineHeight: 1, marginTop: 4,
        animation: pop ? 'pot-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both' : 'none',
      }}>
        ${amount.toLocaleString()}
      </div>
      {sub && <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.2, color: 'rgba(232,220,192,0.5)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// In-flight chips layer — absolute positioned at pot center
function ChipFlightLayer({ phase }) {
  const inflight = phase.flying || phase.bets || [];
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      width: 0, height: 0, pointerEvents: 'none', zIndex: 4,
    }}>
      {/* Seat → pot (betting rounds) */}
      {!phase.payout && SEAT_OFFSETS.map((off, seatIdx) => {
        const amount = inflight[seatIdx];
        if (!amount) return null;
        const chips = chipsFor(amount);
        return chips.map((denom, ci) => (
          <div key={`b-${seatIdx}-${ci}`} style={{
            position: 'absolute',
            top: 0, left: 0,
            transform: 'translate(-50%, -50%)',
            '--from-x': `${off.x}px`,
            '--from-y': `${off.y}px`,
            animation: `chip-to-pot 1.4s ${0.15 + ci * 0.08 + seatIdx * 0.05}s cubic-bezier(0.4, 0.0, 0.2, 1) both`,
          }}>
            <Chip amount={denom} size={28}/>
          </div>
        ));
      })}
      {/* Pot → winner (showdown) */}
      {phase.payout && (() => {
        const winOff = SEAT_OFFSETS[phase.winnerSeat];
        const denoms = [20, 20, 20, 20, 20, 50, 50, 100];
        return denoms.map((d, i) => (
          <div key={`w-${i}`} style={{
            position: 'absolute',
            top: 0, left: 0,
            transform: 'translate(-50%, -50%)',
            '--to-x': `${winOff.x}px`,
            '--to-y': `${winOff.y}px`,
            animation: `chip-to-winner 1.6s ${0.6 + i * 0.1}s cubic-bezier(0.4, 0.0, 0.2, 1) both`,
          }}>
            <Chip amount={d} size={28}/>
          </div>
        ));
      })()}
    </div>
  );
}

// Betting controls — change per phase
function ActionPanel({ phase }) {
  const myTurn = phase.activeSeat === 0 && !phase.payout;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 380 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.4, color: 'rgba(232,220,192,0.5)' }}>
          TO CALL <span style={{ color: '#f4e4c1' }}>${phase.payout ? 0 : (myTurn ? 20 : 0)}</span> · RAISE
        </div>
        <div style={{ flex: 1, position: 'relative', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: 4, background: '#d4af37', width: '12%', borderRadius: 2 }}/>
          <div style={{ position: 'absolute', left: '12%', top: -5, width: 14, height: 14, borderRadius: '50%', background: '#d4af37', border: '2px solid #1a1208' }}/>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#d4af37', fontWeight: 600 }}>$40</div>
      </div>
      <div style={{ display: 'flex', gap: 8, opacity: myTurn ? 1 : 0.55, transition: 'opacity 300ms ease' }}>
        <button style={{
          flex: 1, padding: '12px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(0,0,0,0.3)', color: '#e8dcc0',
          border: '1px solid rgba(255,93,78,0.4)',
          fontFamily: 'Inter', fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase',
        }}>Fold</button>
        <button style={{
          flex: 1, padding: '12px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(212,175,55,0.12)', color: '#d4af37',
          border: '1px solid rgba(212,175,55,0.4)',
          fontFamily: 'Inter', fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase',
        }}>Check</button>
        <button style={{
          flex: 1.4, padding: '12px', borderRadius: 8, cursor: 'pointer',
          background: 'linear-gradient(180deg, #f4d35e 0%, #d4af37 60%, #a8801f 100%)',
          color: '#1a1208', border: '1px solid #806316',
          fontFamily: 'Inter', fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
        }}>{phase.payout ? 'Next hand' : 'Raise to $40'}</button>
      </div>
    </div>
  );
}

function PotPositioned({ children }) {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      zIndex: 1,
    }}>{children}</div>
  );
}
