// leaderboard.jsx — 3 leaderboard variations (desktop + mobile each)
// V1 The Standings — dense broadsheet with sortable columns
// V2 Hall of Records — magazine spread with award cards
// V3 The Wire · Live — atmospheric, live spotlight on #1

// Shared masthead specific to leaderboard
function LBMasthead({ tab = 'players', view = 'weekly' }) {
  return (
    <div style={{
      padding: '20px 40px', borderBottom: `1px solid ${WP.rule}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'relative', zIndex: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div style={{ fontFamily: WP.serif, fontWeight: 700, fontSize: 22, color: WP.goldBright, letterSpacing: -0.5 }}>Word Poker</div>
        <Kicker>VOL. XII · WEEK 47 · STANDINGS</Kicker>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Kicker color={WP.parchmentDim}><span style={{ color: WP.green }}>●</span> 142 PLAYERS</Kicker>
        <div style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 999, border: `1px solid ${WP.rule}`, background: 'rgba(0,0,0,0.3)' }}>
          {['daily', 'weekly', 'all-time'].map(v => (
            <div key={v} style={{
              padding: '5px 12px', borderRadius: 999,
              fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.4, cursor: 'pointer',
              color: v === view ? '#1a1208' : WP.parchmentDim,
              background: v === view ? WP.gold : 'transparent',
              fontWeight: v === view ? 700 : 500,
            }}>{v.toUpperCase()}</div>
          ))}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '4px 4px 4px 14px', borderRadius: 999,
          background: 'rgba(0,0,0,0.3)', border: `1px solid ${WP.rule}`,
        }}>
          <div style={{ fontSize: 12, color: WP.parchment }}>Magnus Nilsen</div>
          <MiniAv name="Magnus N" color={WP.violet} size={26}/>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// V1 · THE STANDINGS — dense broadsheet
// ═══════════════════════════════════════════════════════════════

function PodiumCard({ leader, rank, height }) {
  const isFirst = rank === 1;
  return (
    <div style={{
      padding: '18px 16px',
      borderRadius: 10, height,
      background: isFirst
        ? 'linear-gradient(180deg, rgba(212,175,55,0.18) 0%, rgba(0,0,0,0.3) 100%)'
        : 'rgba(0,0,0,0.3)',
      border: `1px solid ${isFirst ? WP.gold : WP.rule}`,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 12, right: 14,
        fontFamily: WP.serif, fontWeight: 600, fontStyle: 'italic',
        fontSize: isFirst ? 72 : 56, color: isFirst ? WP.gold : 'rgba(232,220,192,0.15)',
        lineHeight: 0.9,
      }}>{rank}</div>

      <div>
        <MiniAv name={leader.name} color={leader.color} size={isFirst ? 44 : 36}/>
        <div style={{ marginTop: 10, fontFamily: WP.serif, fontStyle: 'italic', fontWeight: 600, fontSize: isFirst ? 22 : 18, color: WP.goldBright, letterSpacing: -0.3 }}>{leader.name}</div>
        <div style={{ fontFamily: WP.mono, fontSize: 9, color: WP.gold, letterSpacing: 1.4, marginTop: 2 }}>{leader.title.toUpperCase()}</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 14 }}>
          <div>
            <Kicker size={8}>WINS</Kicker>
            <div style={{ fontFamily: WP.serif, fontSize: isFirst ? 20 : 16, color: WP.green, fontWeight: 600, marginTop: 2 }}>{leader.wins}</div>
          </div>
          <div>
            <Kicker size={8}>BEST WORD</Kicker>
            <div style={{ fontFamily: WP.serif, fontSize: isFirst ? 20 : 16, color: WP.gold, fontWeight: 600, marginTop: 2, fontStyle: 'italic' }}>{leader.bestWord}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardStandingsDesktop() {
  return (
    <ScreenBg>
      <LBMasthead view="weekly"/>

      {/* Headline strip */}
      <div style={{ padding: '20px 40px 14px', borderBottom: `1px solid ${WP.ruleFaint}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Kicker size={11} gap={3}>STANDINGS · WEEK 47 · UPDATED 14s AGO</Kicker>
          <h1 style={{ margin: '6px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 56, lineHeight: 0.95, color: WP.goldBright, letterSpacing: -1.5 }}>
            The Standings <em style={{ color: WP.gold }}>so far</em>.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { k: 'TOP WIN', v: 'Mira · 184', c: WP.green },
            { k: 'LONGEST WORD', v: 'BUZZARDS · 92', c: WP.gold },
            { k: 'HOT STREAK', v: 'Zack · 8W', c: WP.amber },
            { k: 'YOU', v: '#7 · 2W streak', c: WP.parchment },
          ].map((s, i) => (
            <div key={i} style={{ padding: '0 18px', borderLeft: i === 0 ? 'none' : `1px solid ${WP.rule}` }}>
              <Kicker size={9}>{s.k}</Kicker>
              <div style={{ fontFamily: WP.serif, fontSize: 18, color: s.c, fontWeight: 600, marginTop: 4 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.7fr 1fr', minHeight: 0, gap: 0 }}>
        {/* Left — podium + table */}
        <div style={{ padding: '22px 32px 22px 40px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {['Players', 'AI characters', 'Best words', 'Streaks'].map((t, i) => (
              <div key={t} style={{
                padding: '8px 14px', borderRadius: 999,
                fontFamily: WP.sans, fontSize: 12, fontWeight: 600,
                color: i === 0 ? WP.gold : WP.parchmentDim,
                background: i === 0 ? 'rgba(212,175,55,0.1)' : 'transparent',
                border: `1px solid ${i === 0 ? WP.rule : 'transparent'}`,
                cursor: 'pointer',
              }}>{t}</div>
            ))}
            <div style={{ flex: 1 }}/>
            <Kicker size={9} color={WP.parchmentDim}>SORT · WINS ↓</Kicker>
          </div>

          {/* Podium */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 12, alignItems: 'end' }}>
            <PodiumCard leader={LEADERS[1]} rank={2} height={180}/>
            <PodiumCard leader={LEADERS[0]} rank={1} height={220}/>
            <PodiumCard leader={LEADERS[2]} rank={3} height={180}/>
          </div>

          {/* Table */}
          <div style={{ border: `1px solid ${WP.rule}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '36px 1.6fr 50px 56px 70px 1.4fr 80px',
              gap: 14, padding: '11px 14px', alignItems: 'center',
              background: 'rgba(0,0,0,0.45)', borderBottom: `1px solid ${WP.rule}`,
              fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.6, color: WP.parchmentDim,
            }}>
              <span>#</span>
              <span>PLAYER</span>
              <span style={{ textAlign: 'right' }}>W</span>
              <span style={{ textAlign: 'right' }}>L</span>
              <span style={{ textAlign: 'right' }}>STREAK</span>
              <span>BEST WORD</span>
              <span style={{ textAlign: 'right' }}>BIGGEST POT</span>
            </div>
            {LEADERS.slice(3, 12).map((l, i) => (
              <div key={l.rank} style={{
                display: 'grid', gridTemplateColumns: '36px 1.6fr 50px 56px 70px 1.4fr 80px',
                gap: 14, padding: '10px 14px', alignItems: 'center',
                background: l.you ? 'rgba(212,175,55,0.08)' : (i % 2 ? 'rgba(0,0,0,0.15)' : 'transparent'),
                borderBottom: i < 8 ? `1px solid ${WP.ruleFaint}` : 'none',
                fontFamily: WP.sans, fontSize: 12, color: WP.parchment,
              }}>
                <span style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 16, color: l.you ? WP.gold : WP.parchmentDim, fontWeight: 600 }}>{l.rank}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MiniAv name={l.name} color={l.color} size={22} ring={l.you}/>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: l.you ? 700 : 500, color: l.you ? WP.goldBright : WP.parchment }}>{l.name}{l.you && <span style={{ color: WP.gold, marginLeft: 6, fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.4 }}>· YOU</span>}</span>
                    <span style={{ fontFamily: WP.mono, fontSize: 9, color: WP.parchmentFaint, letterSpacing: 1.2 }}>
                      {l.online ? <><span style={{ color: WP.green }}>●</span> @ {l.room}</> : <><span style={{ color: WP.parchmentFaint }}>○</span> OFFLINE</>}
                    </span>
                  </span>
                </span>
                <span style={{ textAlign: 'right', fontFamily: WP.mono, color: WP.green, fontWeight: 600 }}>{l.wins}</span>
                <span style={{ textAlign: 'right', fontFamily: WP.mono, color: WP.parchmentDim }}>{l.losses}</span>
                <span style={{ textAlign: 'right', fontFamily: WP.mono, color: l.streak > 0 ? WP.amber : WP.parchmentFaint }}>{l.streak > 0 ? `${l.streak}W` : '—'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: WP.serif, fontStyle: 'italic', color: WP.goldBright }}>{l.bestWord}</span>
                  <span style={{ fontFamily: WP.mono, fontSize: 10, color: WP.gold }}>{l.bestPts}p</span>
                </span>
                <span style={{ textAlign: 'right', fontFamily: WP.serif, fontStyle: 'italic', color: WP.gold, fontWeight: 600 }}>{l.biggest}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — sidebar features */}
        <div style={{
          padding: '22px 40px 22px 24px', overflow: 'auto',
          background: 'rgba(0,0,0,0.18)', borderLeft: `1px solid ${WP.ruleFaint}`,
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Award cards */}
          <div>
            <Kicker size={10}>AWARDS OF THE WEEK</Kicker>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AWARDS.map((a, i) => (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(0,0,0,0.3)', border: `1px solid ${WP.ruleFaint}`,
                  display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, alignItems: 'center',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: a.color, color: '#1a1208',
                    fontFamily: WP.serif, fontStyle: 'italic', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                  }}>{['◐','★','◈','◉'][i]}</div>
                  <div>
                    <Kicker size={9}>{a.label.toUpperCase()}</Kicker>
                    <div style={{ fontFamily: WP.serif, fontSize: 16, color: WP.goldBright, fontWeight: 600, fontStyle: 'italic', marginTop: 2 }}>{a.value}</div>
                    <div style={{ fontFamily: WP.sans, fontSize: 11, color: WP.parchmentDim, marginTop: 2 }}>by {a.by} · {a.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best words list */}
          <div>
            <Kicker size={10}>BEST WORDS THIS WEEK</Kicker>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {TOP_WORDS.slice(0, 6).map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: i < 5 ? `1px solid ${WP.ruleFaint}` : 'none',
                }}>
                  <span style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 14, color: WP.parchmentDim, width: 18 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <ScoreTiles word={w.word} size={16}/>
                    <div style={{ fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.2, color: WP.parchmentDim, marginTop: 4 }}>{w.by.toUpperCase()} · {w.room.toUpperCase()}</div>
                  </div>
                  <div style={{ fontFamily: WP.serif, fontSize: 18, color: WP.gold, fontWeight: 600 }}>+{w.pts}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AtmosphereMarquee/>
    </ScreenBg>
  );
}

function LeaderboardStandingsMobile() {
  return (
    <ScreenBg>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: WP.serif, fontWeight: 700, fontSize: 16, color: WP.goldBright }}>Word Poker</div>
        <MiniAv name="Magnus N" color={WP.violet} size={24}/>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 18px 16px' }}>
        <Kicker size={10} gap={2.4}>WEEK 47 · STANDINGS</Kicker>
        <h1 style={{ margin: '4px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 30, lineHeight: 0.95, color: WP.goldBright, letterSpacing: -0.6 }}>
          The Standings <em style={{ color: WP.gold }}>so far</em>.
        </h1>

        {/* View toggle */}
        <div style={{ marginTop: 12, display: 'flex', gap: 2, padding: 2, borderRadius: 999, background: 'rgba(0,0,0,0.3)', border: `1px solid ${WP.rule}` }}>
          {['Daily', 'Weekly', 'All-time'].map((v, i) => (
            <div key={v} style={{
              flex: 1, padding: '6px', borderRadius: 999, textAlign: 'center',
              fontFamily: WP.mono, fontSize: 10, letterSpacing: 1.4,
              color: i === 1 ? '#1a1208' : WP.parchmentDim,
              background: i === 1 ? WP.gold : 'transparent',
              fontWeight: i === 1 ? 700 : 500,
            }}>{v.toUpperCase()}</div>
          ))}
        </div>

        {/* Top-3 strip — compact */}
        <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
          {[LEADERS[1], LEADERS[0], LEADERS[2]].map((l, i) => {
            const r = [2, 1, 3][i];
            const isFirst = r === 1;
            return (
              <div key={r} style={{
                flex: isFirst ? 1.2 : 1, padding: '12px 10px',
                background: isFirst ? 'linear-gradient(180deg, rgba(212,175,55,0.16) 0%, rgba(0,0,0,0.3) 100%)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${isFirst ? WP.gold : WP.rule}`,
                borderRadius: 8, position: 'relative',
              }}>
                <div style={{ fontFamily: WP.serif, fontWeight: 600, fontStyle: 'italic', fontSize: isFirst ? 28 : 22, color: isFirst ? WP.gold : 'rgba(232,220,192,0.2)', lineHeight: 1, position: 'absolute', top: 6, right: 8 }}>{r}</div>
                <MiniAv name={l.name} color={l.color} size={28}/>
                <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 12, color: WP.goldBright, fontWeight: 600, marginTop: 6 }}>{l.name}</div>
                <div style={{ fontFamily: WP.mono, fontSize: 9, color: WP.green, marginTop: 2 }}>{l.wins}W</div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 14, display: 'flex', gap: 4 }}>
          {['Players', 'Words', 'Streaks', 'AI'].map((t, i) => (
            <div key={t} style={{
              padding: '6px 10px', borderRadius: 999,
              fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.4, fontWeight: 600,
              color: i === 0 ? WP.gold : WP.parchmentDim,
              background: i === 0 ? 'rgba(212,175,55,0.1)' : 'transparent',
              border: `1px solid ${i === 0 ? WP.rule : 'transparent'}`,
            }}>{t.toUpperCase()}</div>
          ))}
        </div>

        {/* Table - compact */}
        <div style={{ marginTop: 12, border: `1px solid ${WP.rule}`, borderRadius: 10, overflow: 'hidden' }}>
          {LEADERS.slice(3, 10).map((l, i) => (
            <div key={l.rank} style={{
              display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 10,
              padding: '10px 12px', alignItems: 'center',
              background: l.you ? 'rgba(212,175,55,0.1)' : 'transparent',
              borderBottom: i < 6 ? `1px solid ${WP.ruleFaint}` : 'none',
              fontFamily: WP.sans, fontSize: 12,
            }}>
              <span style={{ fontFamily: WP.serif, fontStyle: 'italic', color: WP.parchmentDim, fontWeight: 600 }}>{l.rank}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MiniAv name={l.name} color={l.color} size={22} ring={l.you}/>
                <span>
                  <span style={{ fontWeight: 600, color: l.you ? WP.goldBright : WP.parchment }}>{l.name}{l.you && <span style={{ color: WP.gold, fontSize: 9, marginLeft: 4, fontFamily: WP.mono }}> · YOU</span>}</span>
                  <span style={{ display: 'block', fontFamily: WP.mono, fontSize: 9, color: WP.parchmentDim }}>{l.bestWord} · {l.bestPts}p</span>
                </span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: WP.mono, fontSize: 11, color: WP.green, fontWeight: 600 }}>{l.wins}W</span>
                {l.streak > 0 && <span style={{ fontFamily: WP.mono, fontSize: 9, color: WP.amber, marginLeft: 6 }}>+{l.streak}</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Award strip */}
        <div style={{ marginTop: 14 }}>
          <Kicker size={9}>AWARDS</Kicker>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {AWARDS.slice(0, 3).map((a, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(0,0,0,0.3)', border: `1px solid ${WP.ruleFaint}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: a.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: WP.serif, fontStyle: 'italic', color: '#1a1208', fontWeight: 700, fontSize: 12,
                }}>{['◐','★','◈'][i]}</div>
                <div style={{ flex: 1 }}>
                  <Kicker size={8}>{a.label.toUpperCase()}</Kicker>
                  <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 14, color: WP.goldBright, fontWeight: 600 }}>{a.value} <span style={{ color: WP.parchmentDim, fontStyle: 'normal', fontSize: 11 }}>· {a.by}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AtmosphereMarquee small/>
    </ScreenBg>
  );
}

// ═══════════════════════════════════════════════════════════════
// V2 · HALL OF RECORDS — magazine spread
// ═══════════════════════════════════════════════════════════════

function AwardFeature({ award, big = false }) {
  const glyphs = { longest: '◐', biggest: '★', streak: '◈', rarest: '◉' };
  return (
    <div style={{
      padding: big ? '26px 24px 22px' : '20px 18px 18px',
      borderRadius: 14,
      background: big
        ? 'linear-gradient(160deg, rgba(212,175,55,0.18) 0%, rgba(0,0,0,0.4) 70%)'
        : 'linear-gradient(160deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
      border: `1px solid ${big ? WP.gold : WP.rule}`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Floating glyph behind */}
      <div style={{
        position: 'absolute', top: -12, right: -16,
        fontFamily: WP.serif, fontStyle: 'italic', fontSize: big ? 200 : 140,
        color: big ? 'rgba(212,175,55,0.1)' : 'rgba(232,220,192,0.05)',
        pointerEvents: 'none', lineHeight: 1,
      }}>{glyphs[award.kind]}</div>

      <Kicker size={big ? 11 : 10} gap={2.4}>{award.label.toUpperCase()}</Kicker>
      <div style={{
        marginTop: big ? 12 : 8,
        fontFamily: WP.serif, fontStyle: 'italic', fontWeight: 700,
        fontSize: big ? 52 : 32, color: WP.goldBright, letterSpacing: -1, lineHeight: 1,
      }}>
        {award.value}
      </div>
      <div style={{ marginTop: big ? 14 : 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <MiniAv name={award.by} color={award.color} size={big ? 28 : 22}/>
        <div style={{ fontFamily: WP.sans, fontSize: big ? 14 : 12, color: WP.parchment, fontWeight: 600 }}>{award.by}</div>
      </div>
      <div style={{ marginTop: 6, fontFamily: WP.mono, fontSize: big ? 10 : 9, letterSpacing: 1.4, color: WP.parchmentDim }}>{award.meta}</div>
    </div>
  );
}

function LeaderboardHallDesktop() {
  return (
    <ScreenBg>
      <LBMasthead view="weekly"/>

      <div style={{ flex: 1, overflow: 'auto', padding: '32px 48px 24px' }}>
        {/* Spread title */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <Kicker size={11} gap={3.4}>HALL OF RECORDS · WEEK 47</Kicker>
          <h1 style={{ margin: '8px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 88, lineHeight: 0.9, color: WP.goldBright, letterSpacing: -3.5 }}>
            The <em style={{ color: WP.gold }}>records</em> of the room.
          </h1>
          <div style={{ marginTop: 10, fontFamily: WP.serif, fontStyle: 'italic', fontSize: 15, color: WP.parchmentDim, maxWidth: 560, margin: '10px auto 0', lineHeight: 1.5 }}>
            Seven nights, four hundred and two hands, a quarter-million in pots moved. Here's who moved most of it.
          </div>
        </div>

        {/* Award cards — magazine grid */}
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14 }}>
          {/* Big hero card */}
          <AwardFeature award={AWARDS[0]} big/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AwardFeature award={AWARDS[1]}/>
            <AwardFeature award={AWARDS[2]}/>
          </div>
          <AwardFeature award={AWARDS[3]}/>
        </div>

        {/* Section header — rankings */}
        <div style={{ marginTop: 36, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `1px solid ${WP.rule}`, paddingBottom: 10 }}>
          <div>
            <Kicker size={11} gap={3}>RANKINGS · TOP TEN</Kicker>
            <div style={{ marginTop: 4, fontFamily: WP.serif, fontWeight: 600, fontSize: 32, color: WP.goldBright, fontStyle: 'italic' }}>By the numbers</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['Players', 'AI characters'].map((t, i) => (
              <div key={t} style={{
                padding: '6px 12px', borderRadius: 999,
                fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.4, fontWeight: 600,
                color: i === 0 ? WP.gold : WP.parchmentDim,
                background: i === 0 ? 'rgba(212,175,55,0.1)' : 'transparent',
                border: `1px solid ${i === 0 ? WP.rule : 'transparent'}`,
              }}>{t.toUpperCase()}</div>
            ))}
          </div>
        </div>

        {/* Two-column standing list */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[LEADERS.slice(0, 5), LEADERS.slice(5, 10)].map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column' }}>
              {col.map((l, i) => (
                <div key={l.rank} style={{
                  display: 'grid', gridTemplateColumns: '34px 36px 1fr auto', gap: 12, alignItems: 'center',
                  padding: '14px 6px', borderBottom: `1px solid ${WP.ruleFaint}`,
                  background: l.you ? 'rgba(212,175,55,0.05)' : 'transparent',
                }}>
                  <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 28, color: l.you ? WP.gold : WP.parchmentDim, fontWeight: 600, lineHeight: 1 }}>{l.rank}</div>
                  <MiniAv name={l.name} color={l.color} size={36} ring={l.you}/>
                  <div>
                    <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 17, color: l.you ? WP.goldBright : WP.parchment, fontWeight: 600 }}>
                      {l.name}{l.you && <span style={{ color: WP.gold, fontFamily: WP.mono, fontStyle: 'normal', fontSize: 9, letterSpacing: 1.4, marginLeft: 8 }}>· YOU</span>}
                    </div>
                    <div style={{ fontFamily: WP.mono, fontSize: 9, color: WP.gold, letterSpacing: 1.4, marginTop: 2 }}>{l.title.toUpperCase()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 18, color: WP.gold, fontWeight: 600 }}>{l.wins}W</div>
                    <div style={{ fontFamily: WP.mono, fontSize: 9, color: WP.parchmentDim, letterSpacing: 1.2 }}>{l.bestWord} · {l.bestPts}p</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <AtmosphereMarquee/>
    </ScreenBg>
  );
}

function LeaderboardHallMobile() {
  return (
    <ScreenBg>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: WP.serif, fontWeight: 700, fontSize: 16, color: WP.goldBright }}>Word Poker</div>
        <MiniAv name="Magnus N" color={WP.violet} size={24}/>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 18px 16px' }}>
        <Kicker size={10} gap={2.4}>HALL OF RECORDS · WEEK 47</Kicker>
        <h1 style={{ margin: '6px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 36, lineHeight: 0.92, color: WP.goldBright, letterSpacing: -1.2 }}>
          The <em style={{ color: WP.gold }}>records</em> of the room.
        </h1>

        <div style={{ marginTop: 16 }}>
          <AwardFeature award={AWARDS[0]} big/>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <AwardFeature award={AWARDS[1]}/>
          <AwardFeature award={AWARDS[2]}/>
        </div>

        <div style={{ marginTop: 22, borderBottom: `1px solid ${WP.rule}`, paddingBottom: 8 }}>
          <Kicker size={10}>RANKINGS · TOP TEN</Kicker>
          <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 22, color: WP.goldBright, fontWeight: 600, marginTop: 2 }}>By the numbers</div>
        </div>

        <div style={{ marginTop: 4 }}>
          {LEADERS.slice(0, 10).map((l, i) => (
            <div key={l.rank} style={{
              display: 'grid', gridTemplateColumns: '24px 30px 1fr auto', gap: 8, alignItems: 'center',
              padding: '11px 4px', borderBottom: `1px solid ${WP.ruleFaint}`,
              background: l.you ? 'rgba(212,175,55,0.06)' : 'transparent',
            }}>
              <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 18, color: l.you ? WP.gold : WP.parchmentDim, fontWeight: 600 }}>{l.rank}</div>
              <MiniAv name={l.name} color={l.color} size={28} ring={l.you}/>
              <div>
                <div style={{ fontFamily: WP.sans, fontSize: 13, color: l.you ? WP.goldBright : WP.parchment, fontWeight: 600 }}>{l.name}</div>
                <div style={{ fontFamily: WP.mono, fontSize: 8, color: WP.gold, letterSpacing: 1.2, marginTop: 1 }}>{l.title.toUpperCase()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 16, color: WP.gold, fontWeight: 600 }}>{l.wins}W</div>
                <div style={{ fontFamily: WP.mono, fontSize: 8, color: WP.parchmentDim }}>{l.bestWord} · {l.bestPts}p</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AtmosphereMarquee small/>
    </ScreenBg>
  );
}

// ═══════════════════════════════════════════════════════════════
// V3 · THE WIRE · LIVE — atmospheric, live spotlight on #1
// ═══════════════════════════════════════════════════════════════

function LeaderboardWireDesktop() {
  const top = LEADERS[0];
  return (
    <ScreenBg>
      <LBMasthead view="weekly"/>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', minHeight: 0 }}>
        {/* Left — main col with #1 spotlight + table */}
        <div style={{ padding: '24px 32px 24px 40px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Top heading */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <Kicker size={11} gap={3}>STANDINGS · WEEK 47 · LIVE</Kicker>
              <h1 style={{ margin: '6px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 46, lineHeight: 0.95, color: WP.goldBright, letterSpacing: -1.2 }}>
                Who's <em style={{ color: WP.gold }}>winning</em> tonight.
              </h1>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Players', 'AI', 'Words'].map((t, i) => (
                <div key={t} style={{
                  padding: '6px 12px', borderRadius: 999,
                  fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.4, fontWeight: 600,
                  color: i === 0 ? WP.gold : WP.parchmentDim,
                  background: i === 0 ? 'rgba(212,175,55,0.1)' : 'transparent',
                  border: `1px solid ${i === 0 ? WP.rule : 'transparent'}`,
                }}>{t.toUpperCase()}</div>
              ))}
            </div>
          </div>

          {/* #1 spotlight */}
          <div style={{
            padding: '24px 26px', borderRadius: 14,
            background: 'linear-gradient(120deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.04) 50%, rgba(0,0,0,0.3) 100%)',
            border: `1px solid ${WP.gold}`,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Drifting glyphs */}
            <div style={{
              position: 'absolute', top: -40, right: -20,
              fontFamily: WP.serif, fontWeight: 600, fontStyle: 'italic', fontSize: 240,
              color: 'rgba(212,175,55,0.15)', lineHeight: 1,
            }}>1</div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, position: 'relative', zIndex: 1 }}>
              <MiniAv name={top.name} color={top.color} size={80} ring/>
              <div style={{ flex: 1 }}>
                <Kicker size={10} gap={2.4}>
                  <LiveDot size={5}/> &nbsp;&nbsp;LIVE · @ THE MONASTERY · SEAT 3
                </Kicker>
                <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontWeight: 600, fontSize: 44, color: WP.goldBright, letterSpacing: -1, marginTop: 4, lineHeight: 1 }}>
                  {top.name}
                </div>
                <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 14, color: WP.gold, marginTop: 4 }}>"{top.title}"</div>

                <div style={{ marginTop: 14, display: 'flex', gap: 22 }}>
                  <div>
                    <Kicker size={9}>WINS</Kicker>
                    <div style={{ fontFamily: WP.serif, fontSize: 26, color: WP.green, fontWeight: 600, marginTop: 2 }}>{top.wins}</div>
                  </div>
                  <div style={{ width: 1, background: WP.rule }}/>
                  <div>
                    <Kicker size={9}>STREAK</Kicker>
                    <div style={{ fontFamily: WP.serif, fontSize: 26, color: WP.amber, fontWeight: 600, marginTop: 2 }}>{top.streak}W</div>
                  </div>
                  <div style={{ width: 1, background: WP.rule }}/>
                  <div>
                    <Kicker size={9}>BIGGEST POT</Kicker>
                    <div style={{ fontFamily: WP.serif, fontSize: 26, color: WP.gold, fontWeight: 600, marginTop: 2 }}>{top.biggest}</div>
                  </div>
                  <div style={{ width: 1, background: WP.rule }}/>
                  <div style={{ flex: 1 }}>
                    <Kicker size={9}>BEST WORD</Kicker>
                    <div style={{ marginTop: 4 }}>
                      <ScoreTiles word={top.bestWord} size={22}/>
                    </div>
                    <div style={{ fontFamily: WP.mono, fontSize: 9, color: WP.parchmentDim, marginTop: 4, letterSpacing: 1.2 }}>{top.bestPts} PTS · 9 LETTERS</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 18, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(0,0,0,0.4)', border: `1px solid ${WP.rule}`,
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: WP.mono, fontSize: 11,
            }}>
              <LiveDot size={6} color={WP.gold}/>
              <span style={{ color: WP.parchmentDim, letterSpacing: 1.4 }}>14s AGO</span>
              <span style={{ color: WP.parchment, fontFamily: WP.sans, fontSize: 12 }}>just played</span>
              <ScoreTiles word="TINCTURES" size={14}/>
              <span style={{ color: WP.gold, fontFamily: WP.serif, fontSize: 16, fontWeight: 600, marginLeft: 'auto' }}>+64</span>
            </div>
          </div>

          {/* Ranks 2-12 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {LEADERS.slice(1, 12).map((l, i) => (
              <div key={l.rank} style={{
                display: 'grid', gridTemplateColumns: '36px 32px 1fr 90px 100px 70px',
                gap: 14, padding: '11px 12px', alignItems: 'center',
                background: l.you ? 'rgba(212,175,55,0.1)' : 'transparent',
                borderBottom: `1px solid ${WP.ruleFaint}`,
                fontFamily: WP.sans, fontSize: 13,
              }}>
                <span style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 22, color: l.you ? WP.gold : WP.parchmentDim, fontWeight: 600 }}>{l.rank}</span>
                <MiniAv name={l.name} color={l.color} size={28} ring={l.you}/>
                <div>
                  <div style={{ fontWeight: 600, color: l.you ? WP.goldBright : WP.parchment }}>
                    {l.name}{l.you && <span style={{ color: WP.gold, fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.4, marginLeft: 6 }}>· YOU</span>}
                  </div>
                  <div style={{ fontFamily: WP.mono, fontSize: 9, color: WP.parchmentDim, letterSpacing: 1.2 }}>
                    {l.online ? <><span style={{ color: WP.green }}>●</span> @ {l.room?.toUpperCase()}</> : <span style={{ color: WP.parchmentFaint }}>○ OFFLINE</span>}
                  </div>
                </div>
                <div>
                  <ScoreTiles word={l.bestWord.slice(0, 6)} size={14}/>
                  <div style={{ fontFamily: WP.mono, fontSize: 9, color: WP.gold, letterSpacing: 1.2, marginTop: 3 }}>{l.bestPts} PTS</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: WP.serif, fontSize: 18, color: WP.green, fontWeight: 600, fontStyle: 'italic' }}>{l.wins}W</div>
                  <div style={{ fontFamily: WP.mono, fontSize: 9, color: WP.parchmentDim }}>{l.losses}L</div>
                </div>
                <div style={{ textAlign: 'right', fontFamily: WP.mono, fontSize: 11, color: l.streak > 0 ? WP.amber : WP.parchmentFaint }}>
                  {l.streak > 0 ? `+${l.streak}` : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — movement + best words */}
        <div style={{
          padding: '24px 40px 24px 24px', overflow: 'auto',
          background: 'rgba(0,0,0,0.22)', borderLeft: `1px solid ${WP.ruleFaint}`,
          display: 'flex', flexDirection: 'column', gap: 22,
        }}>
          {/* Movement */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <LiveDot size={7}/>
              <Kicker size={10}>MOVEMENT · LAST 24H</Kicker>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {MOVEMENT.map((m, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '36px 26px 1fr auto', gap: 10, alignItems: 'center',
                  padding: '10px 0', borderBottom: i < MOVEMENT.length - 1 ? `1px solid ${WP.ruleFaint}` : 'none',
                }}>
                  <div style={{
                    fontFamily: WP.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                    color: m.dir === 'up' ? WP.green : WP.red,
                  }}>{m.dir === 'up' ? `▲ ${m.amt}` : `▼ ${m.amt}`}</div>
                  <MiniAv name={m.name} color={LEADERS.find(l => l.name === m.name)?.color || WP.gold} size={26}/>
                  <div>
                    <div style={{ fontFamily: WP.sans, fontSize: 13, color: WP.goldBright, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontFamily: WP.mono, fontSize: 9, color: WP.parchmentDim, letterSpacing: 1.2 }}>#{m.from} → #{m.to} · {m.why.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best words this week */}
          <div>
            <Kicker size={10}>BEST WORDS · WEEK 47</Kicker>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {TOP_WORDS.slice(0, 5).map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0', borderBottom: i < 4 ? `1px solid ${WP.ruleFaint}` : 'none',
                }}>
                  <span style={{ fontFamily: WP.serif, fontStyle: 'italic', fontWeight: 600, fontSize: 22, color: i === 0 ? WP.gold : WP.parchmentDim, width: 20 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <ScoreTiles word={w.word} size={18}/>
                    <div style={{ fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.2, color: WP.parchmentDim, marginTop: 4 }}>
                      {w.by.toUpperCase()} · {w.room.toUpperCase()} · {w.when.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 22, color: WP.gold, fontWeight: 600 }}>+{w.pts}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AtmosphereMarquee/>
    </ScreenBg>
  );
}

function LeaderboardWireMobile() {
  const top = LEADERS[0];
  return (
    <ScreenBg>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: WP.serif, fontWeight: 700, fontSize: 16, color: WP.goldBright }}>Word Poker</div>
        <Kicker size={9}><LiveDot size={5}/> &nbsp; 142 LIVE</Kicker>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 18px 16px' }}>
        <Kicker size={10} gap={2.4}>STANDINGS · WEEK 47 · LIVE</Kicker>
        <h1 style={{ margin: '4px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 26, lineHeight: 1, color: WP.goldBright, letterSpacing: -0.5 }}>
          Who's <em style={{ color: WP.gold }}>winning</em> tonight.
        </h1>

        {/* #1 spotlight compact */}
        <div style={{
          marginTop: 14, padding: '16px 14px', borderRadius: 12,
          background: 'linear-gradient(120deg, rgba(212,175,55,0.18) 0%, rgba(0,0,0,0.3) 100%)',
          border: `1px solid ${WP.gold}`, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -20, right: -10, fontFamily: WP.serif, fontStyle: 'italic',
            fontSize: 110, color: 'rgba(212,175,55,0.18)', lineHeight: 1, fontWeight: 600,
          }}>1</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <MiniAv name={top.name} color={top.color} size={48} ring/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Kicker size={8} gap={1.6}>
                <LiveDot size={4}/> &nbsp; @ THE MONASTERY
              </Kicker>
              <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontWeight: 600, fontSize: 22, color: WP.goldBright, letterSpacing: -0.3, marginTop: 2 }}>{top.name}</div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { k: 'WINS', v: top.wins + 'W', c: WP.green },
              { k: 'STREAK', v: top.streak + 'W', c: WP.amber },
              { k: 'POT', v: top.biggest, c: WP.gold },
            ].map((s, i) => (
              <div key={i}>
                <Kicker size={8}>{s.k}</Kicker>
                <div style={{ fontFamily: WP.serif, fontSize: 16, color: s.c, fontWeight: 600, marginTop: 2, fontStyle: 'italic' }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${WP.rule}` }}>
            <Kicker size={8} gap={1.6}>BEST WORD · 14s AGO</Kicker>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScoreTiles word={top.bestWord} size={16}/>
              <span style={{ marginLeft: 'auto', color: WP.gold, fontFamily: WP.serif, fontStyle: 'italic', fontSize: 18, fontWeight: 600 }}>+{top.bestPts}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 14, display: 'flex', gap: 4 }}>
          {['Players', 'AI', 'Words', 'Movement'].map((t, i) => (
            <div key={t} style={{
              padding: '6px 10px', borderRadius: 999,
              fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.4, fontWeight: 600,
              color: i === 0 ? WP.gold : WP.parchmentDim,
              background: i === 0 ? 'rgba(212,175,55,0.1)' : 'transparent',
              border: `1px solid ${i === 0 ? WP.rule : 'transparent'}`,
            }}>{t.toUpperCase()}</div>
          ))}
        </div>

        {/* Ranks 2-10 */}
        <div style={{ marginTop: 10 }}>
          {LEADERS.slice(1, 10).map((l, i) => (
            <div key={l.rank} style={{
              display: 'grid', gridTemplateColumns: '22px 28px 1fr auto', gap: 10, alignItems: 'center',
              padding: '10px 4px', borderBottom: `1px solid ${WP.ruleFaint}`,
              background: l.you ? 'rgba(212,175,55,0.08)' : 'transparent',
            }}>
              <span style={{ fontFamily: WP.serif, fontStyle: 'italic', color: l.you ? WP.gold : WP.parchmentDim, fontSize: 16, fontWeight: 600 }}>{l.rank}</span>
              <MiniAv name={l.name} color={l.color} size={26} ring={l.you}/>
              <div>
                <div style={{ fontFamily: WP.sans, fontSize: 12, fontWeight: 600, color: l.you ? WP.goldBright : WP.parchment }}>
                  {l.name}{l.you && <span style={{ color: WP.gold, fontFamily: WP.mono, fontSize: 8, letterSpacing: 1.2, marginLeft: 4 }}> · YOU</span>}
                </div>
                <div style={{ fontFamily: WP.mono, fontSize: 8, color: WP.parchmentDim, letterSpacing: 1.2 }}>
                  {l.bestWord} · {l.bestPts}p {l.online && <span style={{ color: WP.green }}>· LIVE</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: WP.mono, fontSize: 11, color: WP.green, fontWeight: 600 }}>{l.wins}W</span>
                {l.streak > 0 && <span style={{ fontFamily: WP.mono, fontSize: 9, color: WP.amber, marginLeft: 6 }}>+{l.streak}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Best words mini section */}
        <div style={{ marginTop: 18 }}>
          <Kicker size={9}>BEST WORDS THIS WEEK</Kicker>
          <div style={{ marginTop: 8 }}>
            {TOP_WORDS.slice(0, 4).map((w, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: i < 3 ? `1px solid ${WP.ruleFaint}` : 'none',
              }}>
                <ScoreTiles word={w.word} size={14}/>
                <div style={{ flex: 1, fontFamily: WP.mono, fontSize: 9, color: WP.parchmentDim, marginLeft: 4, letterSpacing: 1.2 }}>{w.by.toUpperCase()}</div>
                <span style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 15, color: WP.gold, fontWeight: 600 }}>+{w.pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AtmosphereMarquee small/>
    </ScreenBg>
  );
}
