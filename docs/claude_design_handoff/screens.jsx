// screens.jsx — Word Poker screens

const { useState, useEffect, useMemo, useRef } = React;

// ─── Lobby / Room list ────────────────────────────────────────────────
function LobbyScreen({ onJoin, onOpenTweaks, onRiverRun }) {
  const rooms = [
    { name: 'Vocab Hold\'em 1',  buyIn: '$1/$2',   players: '3/4', countdown: '00:42', hot: true },
    { name: 'Cursive Classic',   buyIn: '$5/$10',  players: '2/4', countdown: '01:15' },
    { name: 'Full Rack Nightly', buyIn: '$10/$20', players: '4/4', countdown: 'Live',  full: true },
    { name: 'Rookie Room',       buyIn: 'Free',    players: '1/4', countdown: '03:00' },
    { name: 'High Roller Deck',  buyIn: '$25/$50', players: '2/6', countdown: '04:22' },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>
      {/* top bar */}
      <div style={{ padding: '64px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>Word Poker</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Welcome back, Dylan</div>
        </div>
        <div onClick={onOpenTweaks} style={{
          width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer',
        }}>⚙</div>
      </div>

      {/* stat cards */}
      <div style={{ display: 'flex', gap: 10, padding: '8px 20px', overflowX: 'auto' }}>
        {[
          { label: 'Your chips', val: '$1,500', accent: '#d4af37' },
          { label: 'Biggest winner', val: 'Dylan Marx', small: true },
          { label: "Today's longest", val: 'MONSTER', small: true },
        ].map((c, i) => (
          <div key={i} style={{
            minWidth: 140, padding: '14px 16px',
            background: 'rgba(255,255,255,0.04)', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{c.label}</div>
            <div style={{
              fontSize: c.small ? 16 : 22, fontWeight: 700,
              marginTop: 6, color: c.accent || '#fff',
              fontFamily: c.small ? 'Inter' : '"Noto Serif", serif',
            }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* River Run solo banner */}
      <div style={{ padding: '10px 20px 0' }}>
        <div
          onClick={onRiverRun}
          style={{
            padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
            background: 'linear-gradient(120deg, rgba(13,42,24,0.9) 0%, rgba(6,13,6,0.9) 100%)',
            border: '1px solid rgba(76,175,136,0.35)',
            boxShadow: '0 0 20px rgba(76,175,136,0.08)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(76,175,136,0.15)', border: '1px solid rgba(76,175,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
              <path d="M1 11 Q4.5 5 8 11 Q11.5 17 15 11 Q18.5 5 22 11" stroke="#4caf88" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M1 15 Q4.5 9 8 15 Q11.5 21 15 15 Q18.5 9 22 15" stroke="#4caf88" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>River Run</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Solo · 8 hands · rising targets</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4caf88', padding: '4px 10px', background: 'rgba(76,175,136,0.12)', borderRadius: 6, border: '1px solid rgba(76,175,136,0.25)', whiteSpace: 'nowrap' }}>
            SOLO
          </div>
        </div>
      </div>

      {/* header row */}
      <div style={{ display: 'flex', padding: '18px 20px 8px', fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        <div style={{ flex: 2 }}>Room</div>
        <div style={{ flex: 1 }}>Buy-in</div>
        <div style={{ flex: 1 }}>Players</div>
        <div style={{ width: 56, textAlign: 'right' }}>Next</div>
      </div>

      {/* rooms */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {rooms.map((r, i) => (
          <div key={i}
            onClick={() => !r.full && onJoin(r)}
            style={{
              display: 'flex', alignItems: 'center', padding: '14px 14px', marginBottom: 6,
              background: i === 0 ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 10, cursor: r.full ? 'not-allowed' : 'pointer',
              opacity: r.full ? 0.5 : 1,
            }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
              {r.hot && <div style={{ fontSize: 10, color: '#d4af37', marginTop: 2, letterSpacing: 0.6 }}>● STARTING SOON</div>}
            </div>
            <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{r.buyIn}</div>
            <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{r.players}</div>
            <div style={{ width: 56, textAlign: 'right', fontSize: 13, fontFamily: 'ui-monospace, monospace', color: r.hot ? '#d4af37' : 'rgba(255,255,255,0.6)' }}>{r.countdown}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Join room preview ────────────────────────────────────────────────
function JoinScreen({ room, onConfirm, onBack }) {
  const seats = [
    { seat: 0, name: 'Dylan', chips: 1500, empty: false },
    { seat: 1, name: 'Jamie', chips: 1820 },
    { seat: 2, name: 'Raja', chips: 940 },
    { seat: 3, name: '—', empty: true },
  ];
  return (
    <div style={{ height: '100%', background: '#0a0a0a', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      {/* top nav */}
      <div style={{ padding: '64px 20px 8px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="10" height="16" viewBox="0 0 10 16"><path d="M8 2L2 8l6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Preview</div>
      </div>

      {/* room info */}
      <div style={{ padding: '12px 20px' }}>
        <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 32, fontWeight: 600 }}>{room?.name || 'Vocab Hold\'em 1'}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>
          {room?.buyIn || '$1/$2'} blinds · 4 seats · No limit · 60s reveal
        </div>
      </div>

      {/* tabletop preview */}
      <div style={{ flex: 1, padding: '24px 20px', position: 'relative' }}>
        <div style={{
          position: 'relative', width: '100%', height: 360, margin: '0 auto',
          background: 'radial-gradient(ellipse at center, #2d5016 0%, #1a3010 70%, #0f1d08 100%)',
          borderRadius: 140,
          border: '3px solid #3a2815',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6), 0 10px 30px rgba(0,0,0,0.5)',
        }}>
          {/* inner rail */}
          <div style={{ position: 'absolute', inset: 10, borderRadius: 130, border: '1px solid rgba(212,175,55,0.25)' }} />
          {/* title center */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            textAlign: 'center', opacity: 0.4,
          }}>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 14, letterSpacing: 4 }}>WORD POKER</div>
          </div>
          {/* seats */}
          {[
            { top: '75%', left: '50%' },  // you (bottom)
            { top: '45%', left: '8%' },
            { top: '10%', left: '50%' },
            { top: '45%', left: '92%' },
          ].map((pos, i) => (
            <div key={i} style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translate(-50%,-50%)' }}>
              {seats[i].empty ? (
                <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>OPEN</div>
              ) : (
                <Avatar seed={i} size={56} name={seats[i].name} />
              )}
              <div style={{ textAlign: 'center', fontSize: 11, marginTop: 6, color: 'rgba(255,255,255,0.75)' }}>
                {seats[i].name}{!seats[i].empty && <div style={{ color: '#d4af37', fontSize: 10, marginTop: 1 }}>${seats[i].chips}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 20px 40px' }}>
        <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={onConfirm}>
          Take a seat · {room?.buyIn || '$1/$2'}
        </Button>
      </div>
    </div>
  );
}

// ─── Poker Table Screen ────────────────────────────────────────────────
const PHASE_LABELS = {
  0: 'PHASE 1 · DEAL',
  1: 'PHASE 2 · PRE-FLOP',
  2: 'WAITING',
  3: 'PHASE 3 · THE FLOP',
  4: 'PHASE 4 · THE TURN',
  5: 'PHASE 5 · THE RIVER',
};

function TableScreen({ game, onAction, tileTheme = 'scrabble', onOpenTweaks }) {
  const you = game.players[0];
  const pot = game.pot;
  const current = game.currentPlayer;
  const phase = game.phase;

  // seat positions relative to table (393×420 table)
  const seatPositions = [
    { top: 278, left: 196, align: 'bottom' },  // 0 - you
    { top: 170, left: 38, align: 'left' },     // 1 - left
    { top: 58,  left: 196, align: 'top' },     // 2 - top
    { top: 170, left: 354, align: 'right' },   // 3 - right
  ];

  const communityCount = phase < 3 ? 0 : phase === 3 ? 3 : phase === 4 ? 4 : 5;

  return (
    <div style={{ height: '100%', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '58px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>←</div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>{PHASE_LABELS[phase]}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Vocab Hold'em 1</div>
          </div>
        </div>
        <div onClick={onOpenTweaks} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', padding: '6px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: 20, cursor: 'pointer' }}>
          ⚙ Tweaks
        </div>
      </div>

      {/* community tiles — ABOVE the table, bigger */}
      <div style={{ padding: '10px 20px 16px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textAlign: 'center', marginBottom: 8 }}>COMMUNITY</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', minHeight: 54 }}>
          {game.community.slice(0, 5).map((t, i) => (
            <div key={t?.id || i} style={{
              opacity: i < communityCount ? 1 : 0.2,
              transform: i < communityCount ? 'scale(1)' : 'scale(0.85)',
              transition: `opacity 400ms ease ${i * 100}ms, transform 400ms ease ${i * 100}ms`,
            }}>
              {i < communityCount
                ? <Tile tile={t} size={50} theme={tileTheme} />
                : <div style={{ width: 50, height: 50, borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }} />
              }
            </div>
          ))}
        </div>
      </div>

      {/* table area — fixed size/position regardless of phase */}
      <div style={{ flex: 1, position: 'relative', minHeight: 360 }}>
        {/* felt */}
        <div style={{
          position: 'absolute', top: 30, left: 20, right: 20, height: 340,
          background: 'radial-gradient(ellipse at center, #2d5016 0%, #1a3010 75%, #0f1d08 100%)',
          borderRadius: 160, border: '2px solid #3a2815',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55), 0 8px 30px rgba(0,0,0,0.5)',
        }}>
          {/* inner gold rail */}
          <div style={{ position: 'absolute', inset: 8, borderRadius: 152, border: '1px solid rgba(212,175,55,0.25)' }} />

          {/* pot (centered on felt now) */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.5, marginBottom: 4 }}>POT</div>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 32, fontWeight: 600, color: '#d4af37', transition: 'all 300ms' }}>
              ${pot}
            </div>
          </div>

          {/* seats */}
          {game.players.map((p, i) => {
            const pos = seatPositions[i];
            const isYou = i === 0;
            const isCurrent = current === i && !p.folded && !game.handOver;
            const labelTop = pos.align === 'bottom' ? 60 : pos.align === 'top' ? -52 : 60;
            return (
              <div key={p.id} style={{
                position: 'absolute', top: pos.top, left: pos.left, transform: 'translate(-50%,-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <Avatar seed={p.seed} size={isYou ? 58 : 48} name={p.name} active={isCurrent} folded={p.folded} />
                <div style={{
                  position: 'absolute', top: labelTop, left: '50%', transform: 'translateX(-50%)',
                  minWidth: 80, background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '5px 8px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: p.folded ? 'rgba(255,255,255,0.4)' : '#fff' }}>
                    {p.name}{isYou && ' (You)'}
                  </div>
                  <div style={{ fontSize: 10, color: '#d4af37', marginTop: 1 }}>${p.chips}</div>
                  {p.lastAction && !game.handOver && (
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 1, letterSpacing: 0.5 }}>
                      {p.lastAction.toUpperCase()}
                    </div>
                  )}
                </div>
                {/* bet chip */}
                {p.bet > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: pos.align === 'bottom' ? -28 : pos.align === 'top' ? 58 : 16,
                    left: pos.align === 'left' ? 58 : pos.align === 'right' ? -52 : 40,
                    transition: 'all 400ms ease',
                  }}>
                    <BetChip amount={p.bet} size={38} />
                  </div>
                )}
                {/* dealer button */}
                {game.dealer === i && (
                  <div style={{
                    position: 'absolute',
                    top: pos.align === 'bottom' ? -14 : pos.align === 'top' ? 44 : 34,
                    left: pos.align === 'left' ? 46 : pos.align === 'right' ? -16 : -24,
                    width: 20, height: 20, borderRadius: '50%', background: '#f4e4c1',
                    color: '#2b1810', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  }}>D</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* your hole tiles */}
      <div style={{ padding: '10px 20px 0' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textAlign: 'center', marginBottom: 6 }}>YOUR TILES</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {you.hole.map((t, i) => (
            <Tile key={t.id} tile={t} size={52} theme={tileTheme} />
          ))}
        </div>
      </div>

      {/* betting actions */}
      <div style={{ padding: '14px 18px 28px' }}>
        {current === 0 && !game.handOver && !you.folded ? (
          <BettingBar game={game} onAction={onAction} />
        ) : (
          <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '18px 0' }}>
            {game.handOver ? 'Hand complete' : you.folded ? 'You folded — watching' : `Waiting on ${game.players[current].name}…`}
          </div>
        )}
      </div>
    </div>
  );
}

function BettingBar({ game, onAction }) {
  const you = game.players[0];
  const toCall = game.currentBet - you.bet;
  const minRaise = game.currentBet + game.bigBlind;
  const [raiseAmt, setRaiseAmt] = useState(minRaise);

  useEffect(() => { setRaiseAmt(Math.max(minRaise, raiseAmt)); }, [minRaise]);

  const canCheck = toCall === 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          {toCall > 0 ? `To call: $${toCall}` : 'No bet to call'}
        </div>
        <input type="range" min={minRaise} max={you.chips + you.bet} step={game.bigBlind} value={raiseAmt}
          onChange={e => setRaiseAmt(+e.target.value)}
          style={{ flex: 1, accentColor: '#d4af37' }} />
        <div style={{ width: 52, textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#d4af37', fontWeight: 700 }}>
          ${raiseAmt}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="danger" size="md" style={{ flex: 1 }} onClick={() => onAction('fold')}>Fold</Button>
        <Button variant="secondary" size="md" style={{ flex: 1 }}
          onClick={() => onAction(canCheck ? 'check' : 'call', toCall)}>
          {canCheck ? 'Check' : `Call $${toCall}`}
        </Button>
        <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => onAction('raise', raiseAmt)}>
          Raise ${raiseAmt}
        </Button>
      </div>
    </div>
  );
}

// ─── Reveal Screen (60s word build) ──────────────────────────────────
function RevealScreen({ game, onSubmit, tileTheme = 'scrabble' }) {
  const you = game.players[0];
  const allTiles = useMemo(() => [...you.hole, ...game.community], [you.hole, game.community]);
  const [slots, setSlots] = useState([]); // [{tileId, chosen}]
  const [order, setOrder] = useState(() => allTiles.map(t => t.id));
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) handleSubmit();
  }, [timeLeft]);

  const usedIds = new Set(slots.map(s => s.tileId));

  function pickTile(tile) {
    if (usedIds.has(tile.id) || slots.length >= 7) return;
    if (tile.choiceAlt) {
      // toggle letter choice via first click = primary, second click = alt (via dialog-ish UX: just cycle)
      setSlots([...slots, { tileId: tile.id, chosen: tile.letter }]);
    } else {
      setSlots([...slots, { tileId: tile.id, chosen: tile.letter }]);
    }
  }
  function removeAt(idx) {
    setSlots(slots.filter((_, i) => i !== idx));
  }
  function flipSlot(idx) {
    const s = slots[idx];
    const t = allTiles.find(x => x.id === s.tileId);
    if (!t || !t.choiceAlt) return;
    const next = s.chosen === t.letter ? t.choiceAlt : t.letter;
    const copy = [...slots]; copy[idx] = { ...s, chosen: next };
    setSlots(copy);
  }
  function shuffle() {
    setOrder([...order].sort(() => Math.random() - 0.5));
  }
  function clearAll() { setSlots([]); }

  const word = slots.map(s => s.chosen).join('');
  const preview = word.length >= 2 ? scoreWord(word, slots.map(s => {
    const t = allTiles.find(x => x.id === s.tileId);
    // build pseudo-tile with chosen letter
    return { ...t, letter: s.chosen, choiceAlt: null };
  })) : null;
  const isValid = preview && preview.valid;

  function handleSubmit() {
    if (isValid) {
      onSubmit({ word, score: preview.score, breakdown: preview.breakdown, bonus: preview.bonus });
    } else {
      onSubmit({ word: '', score: 0, breakdown: [], bonus: 0 });
    }
  }

  return (
    <div style={{ height: '100%', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '58px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 }}>PHASE 6 · REVEAL</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Build your word</div>
        </div>
        {/* prominent timer pill */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: timeLeft <= 10 ? 'rgba(204,39,39,0.25)' : 'rgba(30,30,30,0.9)',
          border: `2px solid ${timeLeft <= 10 ? '#cc2727' : '#d4af37'}`,
          borderRadius: 10, padding: '5px 14px', minWidth: 72,
          boxShadow: timeLeft <= 10
            ? '0 0 14px rgba(204,39,39,0.5)'
            : '0 0 10px rgba(212,175,55,0.3)',
          animation: timeLeft <= 10 ? 'timerPulse 0.8s ease-in-out infinite' : 'none',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: timeLeft <= 10 ? '#ff6b6b' : '#d4af37', fontWeight: 700, marginBottom: 1 }}>TIMER</div>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 22, fontWeight: 800, lineHeight: 1,
            color: timeLeft <= 10 ? '#ff6b6b' : '#fff',
            letterSpacing: 1,
          }}>0:{String(timeLeft).padStart(2,'0')}</div>
        </div>
      </div>
      <style>{`
        @keyframes timerPulse { 0%,100% { box-shadow: 0 0 14px rgba(204,39,39,0.5); } 50% { box-shadow: 0 0 26px rgba(204,39,39,0.9); } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.55 } }
      `}</style>

      {/* pot indicator */}
      <div style={{ textAlign: 'center', padding: '4px 0 18px' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 }}>POT ·</span>{' '}
        <span style={{ color: '#d4af37', fontWeight: 700 }}>${game.pot}</span>
      </div>

      {/* word slots */}
      <div style={{ padding: '0 20px' }}>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6, minHeight: 70,
          padding: '12px 10px', background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 12,
        }}>
          {slots.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, display: 'flex', alignItems: 'center' }}>Tap tiles to build a word (2–7 letters)</div>
          ) : slots.map((s, i) => {
            const t = allTiles.find(x => x.id === s.tileId);
            return (
              <div key={i} onClick={() => t.choiceAlt ? flipSlot(i) : removeAt(i)} style={{ cursor: 'pointer' }}>
                <Tile tile={t} size={42} theme={tileTheme} chosenLetter={s.chosen} />
              </div>
            );
          })}
        </div>

        {/* score preview */}
        <div style={{ textAlign: 'center', marginTop: 8, minHeight: 20 }}>
          {word.length >= 2 ? (
            isValid ? (
              <span style={{ fontSize: 13, color: '#7ee7ff' }}>
                <b>{word}</b> · {preview.score} pts
                {preview.bonus ? <span style={{ color: '#d4af37' }}> (+{preview.bonus} full rack)</span> : null}
              </span>
            ) : (
              <span style={{ fontSize: 13, color: '#ff8a5b' }}>{word} · not a valid word</span>
            )
          ) : (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Minimum 2 letters</span>
          )}
        </div>
      </div>

      {/* available tiles */}
      <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 6 }}>COMMUNITY</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {order.map(id => {
              const t = game.community.find(x => x.id === id);
              if (!t) return null;
              return (
                <div key={id} onClick={() => pickTile(t)}>
                  <Tile tile={t} size={46} theme={tileTheme} dimmed={usedIds.has(t.id)} />
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 6 }}>YOUR HOLE</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {you.hole.map(t => (
              <div key={t.id} onClick={() => pickTile(t)}>
                <Tile tile={t} size={52} theme={tileTheme} dimmed={usedIds.has(t.id)} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
          <Button variant="ghost" size="sm" onClick={shuffle}>↻ Shuffle</Button>
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={!slots.length}>Clear</Button>
        </div>
      </div>

      {/* submit */}
      <div style={{ padding: '0 18px 28px' }}>
        <Button variant="primary" size="lg" style={{ width: '100%' }} disabled={!isValid} onClick={handleSubmit}>
          {isValid ? `Submit · ${preview.score} pts` : 'Submit word'}
        </Button>
      </div>
    </div>
  );
}

// ─── Showdown ────────────────────────────────────────────────
function ShowdownScreen({ game, onNext, tileTheme = 'scrabble' }) {
  const winner = game.winner;
  return (
    <div style={{ height: '100%', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '58px 20px 8px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 }}>PHASE 7 · SHOWDOWN</div>
      </div>

      {/* trophy */}
      <div style={{ textAlign: 'center', padding: '14px 20px 20px' }}>
        <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 38, fontWeight: 600, color: '#d4af37' }}>
          ${game.pot}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginTop: 4 }}>
          {winner ? `${winner.name.toUpperCase()} WINS THE POT` : 'POT SPLIT'}
        </div>
      </div>

      {/* results list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
        {game.results.map((r, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: '14px', marginBottom: 10,
            background: r.isWinner ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${r.isWinner ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar seed={r.seed} size={38} name={r.name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}{r.isYou && ' (You)'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  {r.folded ? 'Folded' : r.word || 'No word submitted'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: r.isWinner ? '#d4af37' : '#fff' }}>{r.score}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>pts</div>
              </div>
            </div>
            {!r.folded && r.word && (
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                {r.breakdown && r.breakdown.map((b, j) => (
                  <div key={j} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Tile tile={{ id: j, letter: b.letter, mult: b.mult }} size={30} theme={tileTheme} />
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{b.final}</div>
                  </div>
                ))}
                {r.bonus > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
                    <div style={{ padding: '2px 6px', background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 4, fontSize: 10, color: '#d4af37', fontWeight: 700 }}>+{r.bonus}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 18px 28px' }}>
        <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={onNext}>Next hand →</Button>
      </div>
    </div>
  );
}

Object.assign(window, { LobbyScreen, JoinScreen, TableScreen, RevealScreen, ShowdownScreen });
