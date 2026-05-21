// app.jsx — Word Poker main app + game state machine

const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM } = React;

// ─── State reducer-ish (single object) ──────────────────────
function newGame({ numPlayers = 4, startChips = 1500, smallBlind = 10, bigBlind = 20, dealer = 0 } = {}) {
  const names = ['You', 'Jamie', 'Raja', 'Ellis', 'Mina', 'Ivo'];
  const players = Array.from({ length: numPlayers }, (_, i) => ({
    id: i,
    seed: i,
    name: i === 0 ? 'You' : names[i],
    chips: startChips,
    hole: [],
    bet: 0,
    totalBet: 0,
    folded: false,
    allIn: false,
    lastAction: null,
  }));
  return {
    players,
    community: [],
    pot: 0,
    phase: 0,  // 0 deal/blinds, 1 preflop, 3 flop, 4 turn, 5 river, 6 reveal, 7 showdown
    dealer,
    smallBlind,
    bigBlind,
    currentBet: 0,
    currentPlayer: 0,
    lastRaiser: null,
    bettingDone: false,
    handOver: false,
    winner: null,
    results: [],
    handNumber: 1,
  };
}

function startHand(g) {
  // rotate dealer
  const dealer = (g.dealer + 1) % g.players.length;
  const sbIdx = (dealer + 1) % g.players.length;
  const bbIdx = (dealer + 2) % g.players.length;

  // reset players
  const players = g.players.map(p => ({
    ...p, hole: [], bet: 0, totalBet: 0, folded: false, allIn: false, lastAction: null,
  }));

  // deal 2 hole tiles
  players.forEach(p => { p.hole = drawTiles(2, { choiceCount: 0 }); });
  // optional: 1 choice tile in someone's hole at random
  if (Math.random() < 0.5) {
    const target = players[Math.floor(Math.random() * players.length)];
    target.hole[0] = drawTiles(1, { choiceCount: 1 })[0];
  }

  // community — pre-draw 5 (reveal progressively)
  const community = drawTiles(5, { choiceCount: Math.random() < 0.7 ? 2 : 1 });

  // blinds
  const postBet = (p, amount) => {
    const actual = Math.min(amount, p.chips);
    p.chips -= actual; p.bet += actual; p.totalBet += actual;
    if (p.chips === 0) p.allIn = true;
    return actual;
  };
  let pot = 0;
  pot += postBet(players[sbIdx], g.smallBlind);
  pot += postBet(players[bbIdx], g.bigBlind);
  players[sbIdx].lastAction = 'sb';
  players[bbIdx].lastAction = 'bb';

  return {
    ...g,
    players, community, pot,
    phase: 1, // pre-flop betting
    dealer,
    currentBet: g.bigBlind,
    currentPlayer: (bbIdx + 1) % players.length,
    lastRaiser: bbIdx,
    bettingDone: false,
    handOver: false,
    winner: null,
    results: [],
    submissions: {},
  };
}

function applyAction(g, playerIdx, action, amount = 0) {
  const players = g.players.map(p => ({ ...p }));
  const p = players[playerIdx];
  let pot = g.pot;
  let currentBet = g.currentBet;
  let lastRaiser = g.lastRaiser;

  if (action === 'fold') {
    p.folded = true; p.lastAction = 'fold';
  } else if (action === 'check') {
    p.lastAction = 'check';
  } else if (action === 'call') {
    const toCall = Math.min(currentBet - p.bet, p.chips);
    p.chips -= toCall; p.bet += toCall; p.totalBet += toCall; pot += toCall;
    if (p.chips === 0) p.allIn = true;
    p.lastAction = toCall === 0 ? 'check' : 'call';
  } else if (action === 'raise') {
    const target = Math.max(amount, currentBet + g.bigBlind);
    const diff = Math.min(target - p.bet, p.chips);
    p.chips -= diff; p.bet += diff; p.totalBet += diff; pot += diff;
    if (p.chips === 0) p.allIn = true;
    currentBet = Math.max(currentBet, p.bet);
    lastRaiser = playerIdx;
    p.lastAction = 'raise';
  }

  return { ...g, players, pot, currentBet, lastRaiser };
}

function advanceTurn(g) {
  // find next non-folded, non-all-in player
  let n = g.players.length;
  let next = (g.currentPlayer + 1) % n;
  for (let i = 0; i < n; i++) {
    const p = g.players[next];
    if (!p.folded && !p.allIn) break;
    next = (next + 1) % n;
  }
  // betting round complete?
  const active = g.players.filter(p => !p.folded);
  if (active.length === 1) {
    // hand over: last one standing wins pot without showdown
    return finishHandEarly(g);
  }
  // all active players have matched currentBet OR are all-in, and next player is the lastRaiser (or after BB check in preflop)
  const allMatched = g.players.every(p => p.folded || p.allIn || p.bet === g.currentBet);
  const raiserReached = next === g.lastRaiser || (g.lastRaiser === null);

  if (allMatched && (next === (g.lastRaiser ?? -1) || g.players.every(p => p.lastAction))) {
    // check everyone has acted (lastAction set) since last raise
    const everyoneActed = g.players.every(p => p.folded || p.allIn || p.lastAction);
    if (everyoneActed) return nextPhase(g);
  }
  return { ...g, currentPlayer: next };
}

function nextPhase(g) {
  // reset bets to 0 for the round, keep pot
  const players = g.players.map(p => ({ ...p, bet: 0, lastAction: p.folded ? 'fold' : null }));
  let newPhase = g.phase;
  if (g.phase === 1) newPhase = 3;        // pre-flop → flop
  else if (g.phase === 3) newPhase = 4;   // flop → turn
  else if (g.phase === 4) newPhase = 5;   // turn → river
  else if (g.phase === 5) newPhase = 6;   // river → reveal

  // first to act after flop: first non-folded player clockwise from dealer
  let first = (g.dealer + 1) % players.length;
  for (let i = 0; i < players.length; i++) {
    if (!players[first].folded && !players[first].allIn) break;
    first = (first + 1) % players.length;
  }
  return { ...g, players, phase: newPhase, currentBet: 0, currentPlayer: first, lastRaiser: null };
}

function finishHandEarly(g) {
  const winner = g.players.find(p => !p.folded);
  const players = g.players.map(p => ({
    ...p,
    chips: p.id === winner.id ? p.chips + g.pot : p.chips,
  }));
  const results = g.players.map(p => ({
    name: p.name, seed: p.seed, isYou: p.id === 0,
    folded: p.folded, word: null, score: 0, breakdown: [], bonus: 0,
    isWinner: p.id === winner.id,
  }));
  return { ...g, players, phase: 7, handOver: true, winner: { name: winner.name, id: winner.id }, results, pot: g.pot };
}

// AI decision
function aiDecide(g, playerIdx) {
  const p = g.players[playerIdx];
  const toCall = g.currentBet - p.bet;
  const tiles = [...p.hole, ...g.community.slice(0, g.phase === 1 ? 0 : g.phase === 3 ? 3 : g.phase === 4 ? 4 : 5)];
  // estimate hand strength by best possible word score (cap trial words)
  let potential = 0;
  const letters = tiles.flatMap(t => t.choiceAlt ? [t.letter, t.choiceAlt] : [t.letter]);
  potential = letters.reduce((s, L) => s + valueOf(L), 0) / letters.length;
  // add multiplier potential
  potential += tiles.reduce((s, t) => s + (t.mult - 1) * 3, 0);

  const aggression = 0.5 + Math.random() * 0.6;
  const canAfford = p.chips >= toCall;

  if (toCall === 0) {
    if (potential > 3 && Math.random() < 0.25 * aggression) {
      return { action: 'raise', amount: g.currentBet + g.bigBlind * (Math.random() < 0.5 ? 1 : 2) };
    }
    return { action: 'check' };
  }
  const potOdds = toCall / (g.pot + toCall);
  if (potential < 2.5 && Math.random() < 0.55) return { action: 'fold' };
  if (!canAfford) return { action: 'fold' };
  if (potential > 4 && Math.random() < 0.3 * aggression) {
    return { action: 'raise', amount: g.currentBet + g.bigBlind * 2 };
  }
  if (potOdds > 0.4 && potential < 3.2) return { action: 'fold' };
  return { action: 'call' };
}

function aiSubmitWord(tiles) {
  const best = findBestWord(tiles);
  if (best) return { word: best.word, score: best.score, breakdown: best.breakdown, bonus: best.bonus || 0 };
  return { word: '', score: 0, breakdown: [], bonus: 0 };
}

function resolveShowdown(g, yourSubmission) {
  const submissions = {};
  g.players.forEach((p, i) => {
    if (p.folded) {
      submissions[i] = { word: null, score: 0, breakdown: [], bonus: 0, folded: true };
    } else if (i === 0) {
      submissions[i] = yourSubmission || { word: '', score: 0, breakdown: [], bonus: 0 };
    } else {
      const tiles = [...p.hole, ...g.community];
      submissions[i] = aiSubmitWord(tiles);
    }
  });
  // find highest score
  let bestScore = -1, bestIdx = -1;
  Object.entries(submissions).forEach(([i, s]) => {
    if (!s.folded && s.score > bestScore) { bestScore = s.score; bestIdx = +i; }
  });
  const players = g.players.map((p, i) => ({
    ...p,
    chips: i === bestIdx ? p.chips + g.pot : p.chips,
  }));
  const results = g.players.map((p, i) => ({
    name: p.name, seed: p.seed, isYou: i === 0,
    folded: p.folded,
    word: submissions[i].word,
    score: submissions[i].score,
    breakdown: submissions[i].breakdown,
    bonus: submissions[i].bonus,
    isWinner: i === bestIdx,
  })).sort((a, b) => (b.isWinner - a.isWinner) || (b.score - a.score));
  return {
    ...g, players, phase: 7, handOver: true,
    winner: bestIdx >= 0 ? { name: g.players[bestIdx].name, id: bestIdx } : null,
    results,
  };
}

// ─── App ────────────────────────────────────────────────
const DEFAULTS = /*EDITMODE-BEGIN*/{
  "tileTheme": "scrabble",
  "tableFelt": "green",
  "aiSpeed": "normal",
  "startPhase": "lobby"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweaks] = useS(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('wp_tweaks') || '{}') }; }
    catch { return DEFAULTS; }
  });
  const [tweakOpen, setTweakOpen] = useS(false);
  const [screen, setScreen] = useS(() => localStorage.getItem('wp_screen') || 'lobby');
  const [game, setGame] = useS(null);
  const [room, setRoom] = useS(null);
  const [riverRunActive, setRiverRunActive] = useS(() => localStorage.getItem('wp_screen') === 'riverrun');

  useE(() => {
    localStorage.setItem('wp_screen', riverRunActive ? 'riverrun' : screen);
  }, [screen, riverRunActive]);
  useE(() => { localStorage.setItem('wp_tweaks', JSON.stringify(tweaks)); }, [tweaks]);

  // Tweaks protocol
  useE(() => {
    function onMsg(e) {
      if (e.data?.type === '__activate_edit_mode') setTweakOpen(true);
      else if (e.data?.type === '__deactivate_edit_mode') setTweakOpen(false);
    }
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function updateTweak(key, val) {
    const next = { ...tweaks, [key]: val };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
  }

  // AI turn driver
  const speedMs = tweaks.aiSpeed === 'fast' ? 350 : tweaks.aiSpeed === 'slow' ? 1800 : 900;
  useE(() => {
    if (!game || screen !== 'table') return;
    if (game.handOver) return;
    if (game.currentPlayer === 0) return;
    if (game.phase === 6) return;
    const id = setTimeout(() => {
      const { action, amount } = aiDecide(game, game.currentPlayer);
      const afterAction = applyAction(game, game.currentPlayer, action, amount || 0);
      const after = advanceTurn(afterAction);
      if (after.phase === 6) {
        setScreen('reveal');
      }
      setGame(after);
    }, speedMs);
    return () => clearTimeout(id);
  }, [game, screen, speedMs]);

  // When phase advances to 6 via player action, switch screens
  useE(() => {
    if (game?.phase === 6 && screen === 'table') setScreen('reveal');
    if (game?.phase === 7 && screen !== 'showdown') setScreen('showdown');
  }, [game?.phase]);

  function handleJoinRoom(r) {
    setRoom(r);
    setScreen('join');
  }
  function confirmJoin() {
    const g = startHand(newGame({ numPlayers: 4 }));
    setGame(g);
    setScreen('table');
  }
  function handleAction(action, amount) {
    const after = advanceTurn(applyAction(game, 0, action, amount || 0));
    setGame(after);
  }
  function handleSubmitWord(submission) {
    const after = resolveShowdown(game, submission);
    setGame(after);
    setScreen('showdown');
  }
  function nextHand() {
    const g = startHand(game);
    setGame(g);
    setScreen('table');
  }
  function backToLobby() {
    setScreen('lobby');
    setGame(null);
  }

  // Skip-to-phase via tweaks
  function skipTo(phase) {
    if (!game) {
      const g = startHand(newGame({ numPlayers: 4 }));
      let next = g;
      while (next.phase < phase && next.phase < 6) next = nextPhase(next);
      setGame(next);
      setScreen(phase === 6 ? 'reveal' : phase === 7 ? 'showdown' : 'table');
      return;
    }
    let next = game;
    while (next.phase < phase && next.phase < 6) next = nextPhase(next);
    setGame(next);
    setScreen(phase >= 6 ? 'reveal' : 'table');
  }

  const content = (() => {
    if (riverRunActive) return (
      <RiverRunApp
        tileTheme={tweaks.tileTheme}
        onExit={() => { setRiverRunActive(false); setScreen('lobby'); }}
      />
    );
    if (screen === 'lobby') return <LobbyScreen onJoin={handleJoinRoom} onOpenTweaks={() => setTweakOpen(true)} onRiverRun={() => setRiverRunActive(true)} />;
    if (screen === 'join') return <JoinScreen room={room} onConfirm={confirmJoin} onBack={backToLobby} />;
    if (screen === 'table' && game) return <TableScreen game={game} onAction={handleAction} tileTheme={tweaks.tileTheme} onOpenTweaks={() => setTweakOpen(true)} />;
    if (screen === 'reveal' && game) return <RevealScreen game={game} onSubmit={handleSubmitWord} tileTheme={tweaks.tileTheme} />;
    if (screen === 'showdown' && game) return <ShowdownScreen game={game} onNext={nextHand} tileTheme={tweaks.tileTheme} />;
    return <LobbyScreen onJoin={handleJoinRoom} onOpenTweaks={() => setTweakOpen(true)} onRiverRun={() => setRiverRunActive(true)} />;
  })();

  return (
    <div style={{
      minHeight: '100vh', background: '#111', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <IOSDevice width={393} height={852} dark={true}>
        {content}
      </IOSDevice>
      {tweakOpen && <TweakPanel tweaks={tweaks} update={updateTweak} onClose={() => setTweakOpen(false)} onSkipTo={skipTo} onReset={backToLobby} />}
    </div>
  );
}

// ─── Tweak Panel ────────────────────────────────────────────────
function TweakPanel({ tweaks, update, onClose, onSkipTo, onReset }) {
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, width: 280,
      background: 'rgba(20,20,22,0.95)', color: '#fff',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
      padding: 16, fontFamily: 'Inter, system-ui', fontSize: 13,
      backdropFilter: 'blur(8px)', zIndex: 1000,
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Tweaks</div>
        <div onClick={onClose} style={{ cursor: 'pointer', fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>×</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>TILE STYLE</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['scrabble', 'chip', 'neon'].map(t => (
            <button key={t} onClick={() => update('tileTheme', t)} style={{
              flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 11,
              background: tweaks.tileTheme === t ? '#d4af37' : 'rgba(255,255,255,0.06)',
              color: tweaks.tileTheme === t ? '#000' : '#fff',
              border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
              fontWeight: 600, textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>AI SPEED</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['slow', 'normal', 'fast'].map(s => (
            <button key={s} onClick={() => update('aiSpeed', s)} style={{
              flex: 1, padding: '6px 8px', borderRadius: 6, fontSize: 11,
              background: tweaks.aiSpeed === s ? '#d4af37' : 'rgba(255,255,255,0.06)',
              color: tweaks.aiSpeed === s ? '#000' : '#fff',
              border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
              fontWeight: 600, textTransform: 'capitalize',
            }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>JUMP TO PHASE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {[
            { label: 'Pre-flop', p: 1 }, { label: 'Flop', p: 3 }, { label: 'Turn', p: 4 },
            { label: 'River', p: 5 }, { label: 'Reveal', p: 6 },
          ].map(x => (
            <button key={x.p} onClick={() => onSkipTo(x.p)} style={{
              padding: '6px 4px', borderRadius: 6, fontSize: 11,
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontWeight: 600,
            }}>{x.label}</button>
          ))}
        </div>
      </div>

      <button onClick={onReset} style={{
        width: '100%', padding: '8px', borderRadius: 6, fontSize: 12,
        background: 'rgba(204,39,39,0.15)', color: '#ff6b6b',
        border: '1px solid rgba(204,39,39,0.4)', cursor: 'pointer', fontWeight: 600,
      }}>Back to lobby</button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
