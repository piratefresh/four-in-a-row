// river-run-screens.jsx — River Run solo mode screens

const { useState: rrUseState, useEffect: rrUseEffect, useMemo: rrUseMemo, useRef: rrUseRef } = React;

// ─── River Run wrapper (owns all RR state) ──────────────────────────
function RiverRunApp({ onExit, tileTheme = 'scrabble' }) {
  const [run, setRun] = rrUseState(() => {
    try {
      const saved = localStorage.getItem('rr_run');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  // Tracks whether we've shown the hand-result screen after river phase
  const [resultAcked, setResultAcked] = rrUseState(false);

  rrUseEffect(() => {
    if (run) localStorage.setItem('rr_run', JSON.stringify(run));
    else localStorage.removeItem('rr_run');
  }, [run]);

  // Reset ack whenever a new hand starts
  rrUseEffect(() => {
    if (run?.hand?.phase !== 'done') setResultAcked(false);
  }, [run?.hand?.phase]);

  function startRun() { setRun(rrStartHand(newRiverRun())); }
  function resetRun() { setRun(null); setResultAcked(false); }

  function handlePhaseSubmit(word, score, breakdown, bonus) {
    setRun(r => rrSubmitPhase(r, word, score, breakdown, bonus));
  }
  function handleSkip() {
    setRun(r => rrSkipPhase(r));
  }
  function handleFlip(idx) {
    setRun(r => rrFlipTile(r, idx));
  }
  function handleBuy(id) {
    setRun(r => rrBuyUpgrade(r, id));
  }
  function handleRefreshShop() {
    setRun(r => rrRefreshShop(r));
  }
  function handleNextHand() {
    setRun(r => rrStartHand(r));
  }

  if (!run) {
    return <RRStartScreen onStart={startRun} onBack={onExit} />;
  }

  const { state, hand } = run;

  // After river resolves (hand.phase === 'done'), always show result screen first
  if (hand?.phase === 'done' && !resultAcked) {
    return (
      <RRHandResultScreen
        run={run}
        onContinue={() => setResultAcked(true)}
      />
    );
  }

  if (state === 'failed') {
    return <RRFailedScreen run={run} onRestart={() => { resetRun(); startRun(); }} onExit={() => { resetRun(); onExit(); }} />;
  }
  if (state === 'completed') {
    return <RRCompletedScreen run={run} onRestart={() => { resetRun(); startRun(); }} onExit={() => { resetRun(); onExit(); }} />;
  }
  if (state === 'shop') {
    return (
      <RRShopScreen
        run={run}
        onBuy={handleBuy}
        onRefresh={handleRefreshShop}
        onNext={handleNextHand}
      />
    );
  }

  // state === 'active' — show phase screen
  return (
    <RRPhaseScreen
      run={run}
      tileTheme={tileTheme}
      onSubmit={handlePhaseSubmit}
      onSkip={handleSkip}
      onFlip={handleFlip}
      onExit={() => { resetRun(); onExit(); }}
    />
  );
}

// ─── Start screen ────────────────────────────────────────────────────
function RRStartScreen({ onStart, onBack }) {
  return (
    <div style={{
      height: '100%', background: '#060d06', color: '#fff',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      position: 'relative',
    }}>
      {/* felt texture bg */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 30%, #0d2210 0%, #060d06 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', padding: '64px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={onBack} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="10" height="16" viewBox="0 0 10 16"><path d="M8 2L2 8l6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>SOLO PLAY</div>
      </div>

      {/* hero */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', gap: 0 }}>
        {/* wave icon */}
        <div style={{ marginBottom: 20 }}>
          <svg width="64" height="48" viewBox="0 0 64 48" fill="none">
            <path d="M4 30 Q12 14 20 30 Q28 46 36 30 Q44 14 52 30 Q58 42 60 30" stroke="#4caf88" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            <path d="M4 38 Q12 22 20 38 Q28 54 36 38 Q44 22 52 38 Q58 50 60 38" stroke="#4caf88" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35"/>
          </svg>
        </div>
        <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 38, fontWeight: 700, letterSpacing: -1, textAlign: 'center', lineHeight: 1.05 }}>
          River Run
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 10, textAlign: 'center', lineHeight: 1.6 }}>
          Solo challenge. 8 hands.<br/>Rising targets. One run.
        </div>

        {/* target curve preview */}
        <div style={{ marginTop: 32, width: '100%' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textAlign: 'center', marginBottom: 12 }}>TARGET CURVE</div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'flex-end', height: 44 }}>
            {TARGET_CURVE.map((t, i) => {
              const h = Math.round((t / 195) * 40) + 4;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: 26, height: h,
                    background: `rgba(76,175,136,${0.3 + i * 0.09})`,
                    borderRadius: '3px 3px 0 0',
                    border: '1px solid rgba(76,175,136,0.4)',
                  }} />
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: 'ui-monospace,monospace' }}>{t}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* how-to pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 28, width: '100%' }}>
          {[
            ['Deal', '4 tiles → make a word'],
            ['Turn', '+2 tiles → make a word'],
            ['River', '+1 tile → make a word'],
          ].map(([label, desc]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 44, fontSize: 11, fontWeight: 700, color: '#4caf88', letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', padding: '0 24px 44px' }}>
        <button onClick={onStart} style={{
          width: '100%', height: 54, borderRadius: 12,
          background: 'linear-gradient(180deg, #5dd4a0, #3a9970 60%, #267a52)',
          color: '#fff', fontFamily: 'Inter, system-ui', fontSize: 17, fontWeight: 700,
          border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(76,175,136,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          letterSpacing: 0.3,
        }}>
          Start Run
        </button>
      </div>
    </div>
  );
}

// ─── Phase screen (Deal / Turn / River) ─────────────────────────────
function RRPhaseScreen({ run, tileTheme, onSubmit, onSkip, onFlip, onExit }) {
  const { hand, handIndex, credits, upgrades } = run;
  const revealedTiles = hand.tiles.slice(0, hand.revealed);
  const target = TARGET_CURVE[handIndex];
  const phaseLabel = hand.phase === 'deal' ? 'Deal' : hand.phase === 'turn' ? 'Turn' : 'River';
  const phaseNum = hand.phase === 'deal' ? 1 : hand.phase === 'turn' ? 2 : 3;
  const handScore = hand.phaseWords.reduce((s, p) => s + p.score, 0);

  const [slots, setSlots] = rrUseState([]);
  const [wildInput, setWildInput] = rrUseState('');
  const [showFlipPicker, setShowFlipPicker] = rrUseState(false);

  // reset slots when phase changes
  rrUseEffect(() => { setSlots([]); setShowFlipPicker(false); }, [hand.phase]);

  const usedIds = new Set(slots.map(s => s.tileId));

  function pickTile(tile) {
    if (usedIds.has(tile.id)) { removeLast(tile); return; }
    if (slots.length >= 7) return;
    setSlots(prev => [...prev, { tileId: tile.id, chosen: tile.letter }]);
  }
  function removeLast(tile) {
    const idx = [...slots].reverse().findIndex(s => s.tileId === tile.id);
    if (idx === -1) return;
    const realIdx = slots.length - 1 - idx;
    setSlots(prev => prev.filter((_, i) => i !== realIdx));
  }
  function removeAt(i) { setSlots(prev => prev.filter((_, j) => j !== i)); }
  function flipSlot(i) {
    const s = slots[i];
    const t = revealedTiles.find(x => x.id === s.tileId);
    if (!t?.choiceAlt) return;
    const next = s.chosen === t.letter ? t.choiceAlt : t.letter;
    setSlots(prev => prev.map((p, j) => j === i ? { ...p, chosen: next } : p));
  }
  function clearAll() { setSlots([]); }

  const word = slots.map(s => s.chosen).join('');
  const scoreTiles = slots.map(s => {
    const t = revealedTiles.find(x => x.id === s.tileId);
    return { ...t, letter: s.chosen, choiceAlt: null };
  });
  const preview = word.length >= 2 ? rrScoreWord(word, scoreTiles, upgrades) : null;
  const isValid = preview?.valid;

  function handleSubmit() {
    if (!isValid) return;
    onSubmit(word, preview.score, preview.breakdown, preview.bonus || 0);
  }

  // phase progress dots
  const phaseDots = ['deal', 'turn', 'river'].map((p, i) => {
    const done = hand.phaseWords.some(w => w.phase === p);
    const active = hand.phase === p;
    return { p, done, active };
  });

  return (
    <div style={{ height: '100%', background: '#060d06', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* bg glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% -10%, #0d2a18 0%, #060d06 60%)', pointerEvents: 'none' }} />

      {/* header */}
      <div style={{ position: 'relative', padding: '56px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div onClick={onExit} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="10" height="16" viewBox="0 0 10 16"><path d="M8 2L2 8l6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>RIVER RUN · HAND {handIndex + 1}/8</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{phaseLabel} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: 13 }}>Phase {phaseNum}/3</span></div>
          </div>
        </div>
        {/* credits */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(76,175,136,0.12)', border: '1px solid rgba(76,175,136,0.3)', borderRadius: 20 }}>
          <span style={{ fontSize: 15 }}>◈</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#4caf88' }}>{credits}</span>
        </div>
      </div>

      {/* progress + target bar */}
      <div style={{ position: 'relative', padding: '0 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {phaseDots.map(({ p, done, active }) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: active ? 28 : 8, height: 8, borderRadius: 4, transition: 'width 300ms ease',
                  background: done ? '#4caf88' : active ? '#4caf88' : 'rgba(255,255,255,0.12)',
                }} />
                {active && <div style={{ fontSize: 9, color: '#4caf88', fontWeight: 700, letterSpacing: 0.5 }}>{p.toUpperCase()}</div>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Target <span style={{ color: '#fff', fontWeight: 700 }}>{target}</span>
          </div>
        </div>
        {/* score progress bar */}
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, transition: 'width 400ms ease',
            background: handScore >= target ? '#4caf88' : 'linear-gradient(90deg, #4caf88, #7ee7c0)',
            width: `${Math.min(100, (handScore / target) * 100)}%`,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ fontSize: 10, color: '#4caf88', fontWeight: 700 }}>{handScore} pts</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>need {Math.max(0, target - handScore)} more</div>
        </div>
      </div>

      {/* previous phase scores */}
      {hand.phaseWords.length > 0 && (
        <div style={{ position: 'relative', padding: '0 18px 8px', display: 'flex', gap: 6 }}>
          {hand.phaseWords.map((pw, i) => (
            <div key={i} style={{ padding: '4px 10px', background: 'rgba(76,175,136,0.08)', border: '1px solid rgba(76,175,136,0.2)', borderRadius: 6, fontSize: 11 }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', marginRight: 4 }}>{pw.phase}</span>
              <span style={{ fontWeight: 700 }}>{pw.word || '—'}</span>
              <span style={{ color: '#4caf88', marginLeft: 4 }}>{pw.score}</span>
            </div>
          ))}
        </div>
      )}

      {/* word builder area */}
      <div style={{ position: 'relative', padding: '0 18px 10px' }}>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 5, minHeight: 60,
          padding: '10px 10px', background: 'rgba(255,255,255,0.03)',
          border: `1px dashed ${isValid ? 'rgba(76,175,136,0.5)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 12, transition: 'border-color 200ms',
        }}>
          {slots.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, display: 'flex', alignItems: 'center' }}>Tap tiles below to build your word</div>
          ) : slots.map((s, i) => {
            const t = revealedTiles.find(x => x.id === s.tileId);
            return (
              <div key={i} onClick={() => t?.choiceAlt ? flipSlot(i) : removeAt(i)} style={{ cursor: 'pointer' }}>
                <Tile tile={{ ...t, letter: s.chosen }} size={44} theme={tileTheme} />
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: 6, minHeight: 18 }}>
          {word.length >= 2 ? (
            isValid ? (
              <span style={{ fontSize: 12, color: '#7ee7c0' }}>
                <b>{word}</b> · {preview.score} pts
                {preview.bonus > 0 && <span style={{ color: '#d4af37' }}> +{preview.bonus}</span>}
              </span>
            ) : (
              <span style={{ fontSize: 12, color: '#ff8a5b' }}>{word} · not valid</span>
            )
          ) : (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>min. 2 letters</span>
          )}
        </div>
      </div>

      {/* tiles */}
      <div style={{ position: 'relative', flex: 1, padding: '4px 18px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 8, textAlign: 'center' }}>
          {hand.phase === 'deal' ? `${hand.revealed} TILES REVEALED` : hand.phase === 'turn' ? '6 TILES REVEALED' : 'ALL 7 TILES'}
        </div>

        {/* revealed tiles */}
        <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          {hand.tiles.map((t, i) => {
            const revealed = i < hand.revealed;
            const used = usedIds.has(t.id);
            return (
              <div key={t.id} style={{ position: 'relative' }}>
                <div onClick={() => revealed && pickTile(t)} style={{ cursor: revealed ? 'pointer' : 'default' }}>
                  {revealed ? (
                    <Tile tile={t} size={48} theme={tileTheme} dimmed={used} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: 9,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px dashed rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                  )}
                </div>
                {used && (
                  <div style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: '#4caf88', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 4L3.5 6L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* flip tile button */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          {!hand.flippedThisPhase && credits >= 2 && (
            <button onClick={() => setShowFlipPicker(v => !v)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: showFlipPicker ? 'rgba(76,175,136,0.2)' : 'rgba(255,255,255,0.05)',
              color: '#4caf88', border: '1px solid rgba(76,175,136,0.3)', cursor: 'pointer',
            }}>
              ↻ Flip tile (2◈)
            </button>
          )}
          {hand.flippedThisPhase && (
            <div style={{ fontSize: 11, color: 'rgba(76,175,136,0.6)' }}>Flip used this phase</div>
          )}
          {slots.length > 0 && (
            <button onClick={clearAll} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
            }}>Clear</button>
          )}
        </div>

        {/* flip picker */}
        {showFlipPicker && (
          <div style={{ marginTop: 10, padding: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 10, border: '1px solid rgba(76,175,136,0.3)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Choose a revealed tile to flip:</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {hand.tiles.slice(0, hand.revealed).map((t, i) => (
                <div key={t.id} onClick={() => { onFlip(i); setShowFlipPicker(false); }} style={{ cursor: 'pointer' }}>
                  <Tile tile={t} size={40} theme={tileTheme} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* actions */}
      <div style={{ position: 'relative', padding: '10px 18px 32px', display: 'flex', gap: 8 }}>
        <button onClick={onSkip} style={{
          flex: 1, height: 48, borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
        }}>Skip (0 pts)</button>
        <button onClick={handleSubmit} disabled={!isValid} style={{
          flex: 2.5, height: 48, borderRadius: 10, fontSize: 15, fontWeight: 700,
          background: isValid
            ? 'linear-gradient(180deg, #5dd4a0, #3a9970 60%, #267a52)'
            : 'rgba(255,255,255,0.06)',
          color: isValid ? '#fff' : 'rgba(255,255,255,0.3)',
          border: `1px solid ${isValid ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
          cursor: isValid ? 'pointer' : 'not-allowed',
          boxShadow: isValid ? '0 2px 14px rgba(76,175,136,0.35)' : 'none',
          transition: 'all 200ms',
        }}>
          {isValid ? `Submit · ${preview.score} pts` : `Submit ${phaseLabel}`}
        </button>
      </div>
    </div>
  );
}

// ─── Hand Result (after River) ───────────────────────────────────────
function RRHandResultScreen({ run, onContinue }) {
  const { hand, handIndex, credits } = run;
  // handIndex already advanced if passed — look back for the target that was just attempted
  const attemptedIndex = hand.passed ? handIndex - 1 : handIndex;
  const target = TARGET_CURVE[Math.max(0, attemptedIndex)];
  const isLast = hand.passed && handIndex >= TARGET_CURVE.length;

  return (
    <div style={{ height: '100%', background: '#060d06', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: hand.passed ? 'radial-gradient(ellipse at 50% 0%, rgba(76,175,136,0.12) 0%, transparent 60%)' : 'radial-gradient(ellipse at 50% 0%, rgba(204,39,39,0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', gap: 20 }}>
        {/* result badge */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{hand.passed ? '✓' : '✗'}</div>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 32, fontWeight: 700, color: hand.passed ? '#4caf88' : '#ff6b6b' }}>
            {hand.passed ? 'Hand Clear!' : 'Hand Failed'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
            Score <b style={{ color: '#fff' }}>{hand.handTotal}</b> vs target <b style={{ color: '#fff' }}>{target}</b>
          </div>
          {hand.creditsEarned > 0 && (
            <div style={{ marginTop: 10, padding: '6px 16px', background: 'rgba(76,175,136,0.12)', border: '1px solid rgba(76,175,136,0.3)', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ color: '#4caf88', fontWeight: 700 }}>+{hand.creditsEarned} ◈</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>earned</span>
            </div>
          )}
        </div>

        {/* phase breakdown */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {hand.phaseWords.map((pw, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 2 }}>{pw.phase.toUpperCase()}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{pw.word || <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: pw.score > 0 ? '#7ee7c0' : 'rgba(255,255,255,0.3)' }}>{pw.score}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>pts</div>
              </div>
            </div>
          ))}
          {hand.comboBonus > 0 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#d4af37' }}>⚡ Combo Bonus +{hand.comboBonus}</div>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', padding: '0 24px 44px' }}>
        <button onClick={onContinue} style={{
          width: '100%', height: 52, borderRadius: 12, fontSize: 16, fontWeight: 700,
          background: hand.passed ? 'linear-gradient(180deg, #5dd4a0, #267a52)' : 'rgba(255,255,255,0.08)',
          color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
          cursor: 'pointer', boxShadow: hand.passed ? '0 4px 20px rgba(76,175,136,0.3)' : 'none',
        }}>
          {hand.passed ? (isLast ? 'See Results →' : 'Visit Shop →') : 'See Results →'}
        </button>
      </div>
    </div>
  );
}

// ─── Shop screen ─────────────────────────────────────────────────────
function RRShopScreen({ run, onBuy, onRefresh, onNext }) {
  const { credits, handIndex, shopSeed, pendingUpgrades, hand } = run;
  const items = rrUseMemo(() => {
    const all = [...SHOP_ITEMS];
    // deterministic shuffle by seed
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.seededRandom(shopSeed * 31 + i) * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, 3);
  }, [shopSeed]);

  return (
    <div style={{ height: '100%', background: '#060d06', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% -20%, rgba(212,175,55,0.08) 0%, transparent 50%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', padding: '60px 20px 8px' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 }}>RIVER RUN · HAND {handIndex}/8 CLEARED</div>
        <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 28, fontWeight: 700, marginTop: 4 }}>Shop</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
          Next target: <b style={{ color: '#fff' }}>{TARGET_CURVE[handIndex]}</b>
        </div>
      </div>

      {/* credits */}
      <div style={{ position: 'relative', padding: '8px 20px 16px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(76,175,136,0.1)', border: '1px solid rgba(76,175,136,0.3)', borderRadius: 20 }}>
          <span style={{ fontSize: 18 }}>◈</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#4caf88' }}>{credits}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>credits</span>
        </div>
      </div>

      {/* pending upgrades */}
      {pendingUpgrades.length > 0 && (
        <div style={{ position: 'relative', padding: '0 20px 12px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginBottom: 6 }}>BOUGHT (activates next hand)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pendingUpgrades.map((id, i) => {
              const item = SHOP_ITEMS.find(x => x.id === id);
              return (
                <div key={i} style={{ padding: '4px 10px', background: 'rgba(76,175,136,0.12)', border: '1px solid rgba(76,175,136,0.3)', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#4caf88' }}>
                  {item?.icon} {item?.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* shop items */}
      <div style={{ position: 'relative', flex: 1, overflowY: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => {
          const canAfford = credits >= item.cost;
          const alreadyBought = pendingUpgrades.includes(item.id) || item.id === 'credit_burst';
          return (
            <div key={item.id} style={{
              padding: '14px 16px', background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${canAfford ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 12, opacity: canAfford ? 1 : 0.5,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: '#d4af37' }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, lineHeight: 1.4 }}>{item.desc}</div>
              </div>
              <button onClick={() => canAfford && onBuy(item.id)} disabled={!canAfford} style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, flexShrink: 0,
                background: canAfford ? 'rgba(76,175,136,0.15)' : 'rgba(255,255,255,0.04)',
                color: canAfford ? '#4caf88' : 'rgba(255,255,255,0.25)',
                border: `1px solid ${canAfford ? 'rgba(76,175,136,0.4)' : 'rgba(255,255,255,0.08)'}`,
                cursor: canAfford ? 'pointer' : 'not-allowed',
              }}>
                {item.cost === 0 ? 'Free' : `${item.cost} ◈`}
              </button>
            </div>
          );
        })}

        {/* refresh */}
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <button onClick={onRefresh} disabled={credits < 2} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'rgba(255,255,255,0.04)', color: credits >= 2 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.1)', cursor: credits >= 2 ? 'pointer' : 'not-allowed',
          }}>↻ Refresh shop (2 ◈)</button>
        </div>
      </div>

      {/* next hand */}
      <div style={{ position: 'relative', padding: '16px 20px 44px' }}>
        <button onClick={onNext} style={{
          width: '100%', height: 52, borderRadius: 12, fontSize: 16, fontWeight: 700,
          background: 'linear-gradient(180deg, #5dd4a0, #267a52)',
          color: '#fff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(76,175,136,0.3)',
        }}>
          {pendingUpgrades.length > 0 ? 'Next hand with upgrades →' : 'Skip shop →'}
        </button>
      </div>
    </div>
  );
}

// ─── Failed screen ────────────────────────────────────────────────────
function RRFailedScreen({ run, onRestart, onExit }) {
  const { handIndex, hand } = run;
  const target = TARGET_CURVE[handIndex];
  return (
    <div style={{ height: '100%', background: '#060d06', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 20%, rgba(204,39,39,0.14) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', gap: 20, textAlign: 'center' }}>
        {/* wave broken */}
        <svg width="72" height="48" viewBox="0 0 72 48" fill="none" style={{ opacity: 0.5 }}>
          <path d="M4 30 Q12 14 20 30 Q28 46 36 30" stroke="#ff6b6b" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
          <path d="M40 28 L48 36M48 28L40 36" stroke="#ff6b6b" strokeWidth="3" strokeLinecap="round"/>
          <path d="M56 30 Q64 14 68 30" stroke="#ff6b6b" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.4"/>
        </svg>

        <div>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 34, fontWeight: 700, color: '#ff6b6b' }}>Run Failed</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
            Hand {handIndex + 1} · scored <b style={{ color: '#fff' }}>{hand?.handTotal ?? 0}</b> vs target <b style={{ color: '#fff' }}>{target}</b>
          </div>
        </div>

        {/* stats */}
        <div style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, display: 'flex', gap: 0 }}>
          {[
            { label: 'Hands cleared', val: handIndex },
            { label: 'Max target', val: handIndex > 0 ? TARGET_CURVE[handIndex - 1] : '—' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 28, fontWeight: 700 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {hand?.phaseWords && (
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 8 }}>FINAL HAND</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {hand.phaseWords.map((pw, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{pw.phase}</span>
                  <span style={{ fontWeight: 600 }}>{pw.word || '—'}</span>
                  <span style={{ color: pw.score > 0 ? '#7ee7c0' : 'rgba(255,255,255,0.25)', fontWeight: 700 }}>{pw.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', padding: '0 24px 44px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onRestart} style={{
          width: '100%', height: 52, borderRadius: 12, fontSize: 16, fontWeight: 700,
          background: 'linear-gradient(180deg, #5dd4a0, #267a52)',
          color: '#fff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(76,175,136,0.3)',
        }}>Try Again</button>
        <button onClick={onExit} style={{
          width: '100%', height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: 'transparent', color: 'rgba(255,255,255,0.4)',
          border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
        }}>Back to lobby</button>
      </div>
    </div>
  );
}

// ─── Completed screen ─────────────────────────────────────────────────
function RRCompletedScreen({ run, onRestart, onExit }) {
  return (
    <div style={{ height: '100%', background: '#060d06', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 10%, rgba(212,175,55,0.16) 0%, transparent 55%)', pointerEvents: 'none' }} />
      <style>{`
        @keyframes rr-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', gap: 18, textAlign: 'center' }}>
        <div style={{ animation: 'rr-float 2.8s ease-in-out infinite' }}>
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke="#d4af37" strokeWidth="2" opacity="0.3"/>
            <circle cx="40" cy="40" r="28" stroke="#d4af37" strokeWidth="1.5" opacity="0.2"/>
            <path d="M40 16 L44.7 30.6H60L48 39.4L52.7 54L40 45.2L27.3 54L32 39.4L20 30.6H35.3Z" fill="#d4af37" stroke="#d4af37" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
        </div>

        <div>
          <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 38, fontWeight: 700, color: '#d4af37', lineHeight: 1.1 }}>Run<br/>Complete!</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 10, lineHeight: 1.6 }}>
            You cleared all 8 hands.<br/>Final target was <b style={{ color: '#fff' }}>195</b>.
          </div>
        </div>

        <div style={{ width: '100%', padding: '16px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 14 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 10 }}>FINAL STATS</div>
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { label: 'Hands cleared', val: '8/8' },
              { label: 'Credits left', val: run.credits },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i === 0 ? '1px solid rgba(212,175,55,0.15)' : 'none' }}>
                <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 28, fontWeight: 700, color: '#d4af37' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* target curve with all filled */}
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'flex-end', height: 44 }}>
            {TARGET_CURVE.map((t, i) => {
              const h = Math.round((t / 195) * 40) + 4;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: 26, height: h, background: '#4caf88', borderRadius: '3px 3px 0 0', border: '1px solid rgba(76,175,136,0.6)' }} />
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace,monospace' }}>{t}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', padding: '0 24px 44px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onRestart} style={{
          width: '100%', height: 52, borderRadius: 12, fontSize: 16, fontWeight: 700,
          background: 'linear-gradient(180deg, #ffd45b, #d4af37 60%, #a88020)',
          color: '#1a0f00', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
        }}>Play Again</button>
        <button onClick={onExit} style={{
          width: '100%', height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: 'transparent', color: 'rgba(255,255,255,0.4)',
          border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
        }}>Back to lobby</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  RiverRunApp, RRStartScreen, RRPhaseScreen, RRHandResultScreen,
  RRShopScreen, RRFailedScreen, RRCompletedScreen,
});
