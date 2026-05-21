// v5-home.jsx — Home / "Choose how to play" in The Wire vocabulary

// Shared bottom marquee data
const MARQUEE = [
  { who: 'Mira Quill',     verb: 'won a match with',       prize: 'TINCTURES · 64pts' },
  { who: 'Magnus Nilsen',  verb: 'opened',                 prize: 'The Glutenin Table · $50/$100' },
  { who: 'Ellis March',    verb: 'lost a hand at',         prize: 'High Roller Deck' },
  { who: 'Zack',           verb: 'played',                 prize: 'RUSTICS · 29pts at Full Rack' },
  { who: 'Ollo',           verb: 'shoved all-in at',       prize: 'The Wire' },
  { who: 'Dylan Marx',     verb: 'won the daily challenge', prize: 'River Run · +180pts' },
  { who: 'Wynn',           verb: 'started',                prize: 'a private 6-seat table' },
];

function BottomMarquee({ small = false }) {
  // double the array so it scrolls seamlessly via CSS keyframes
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      borderTop: '1px solid rgba(212,175,55,0.18)',
      background: 'rgba(0,0,0,0.35)',
      padding: small ? '8px 0' : '10px 0',
      overflow: 'hidden', whiteSpace: 'nowrap',
      fontFamily: 'JetBrains Mono', fontSize: small ? 9 : 11, color: 'rgba(232,220,192,0.7)',
      display: 'flex', alignItems: 'center', gap: 24,
    }}>
      <div style={{
        paddingLeft: 30, flexShrink: 0,
        color: '#d4af37', letterSpacing: 2,
        display: 'flex', alignItems: 'center', gap: 8,
        borderRight: '1px solid rgba(212,175,55,0.18)', paddingRight: 16,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5d4e', animation: 'pulse 1.6s ease-in-out infinite' }}/>
        LIVE ON THE WIRE
      </div>
      <div style={{
        display: 'inline-flex', gap: 40, paddingLeft: 24,
        animation: 'marquee 60s linear infinite',
      }}>
        {items.map((m, i) => (
          <span key={i} style={{ flexShrink: 0 }}>
            <span style={{ color: '#d4af37' }}>{m.who}</span>
            <span style={{ opacity: 0.65 }}> · {m.verb} · </span>
            <span style={{ color: '#f4e4c1' }}>{m.prize}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const HOME_CSS = `
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
`;

// ─── DESKTOP HOME ────────────────────────────────────────────
function HomeDesktop() {
  const modes = [
    {
      id: 'tutorial', kind: 'tutorial', recommended: true,
      kicker: 'WALK-THROUGH · 2 MIN',
      name: 'Tutorial',
      blurb: 'Learn the deal — community letters, pots, and the showdown. Earns +50 chips on completion.',
      meta: '+50 CHIPS',
    },
    {
      id: 'online', kind: 'online',
      kicker: 'LIVE OPPONENTS · NOW',
      name: 'Online tables',
      blurb: '6 tables open, 142 players in the room. Featured: The Monastery — Mira just rinsed for 64.',
      meta: '6 TABLES · 142 ONLINE',
    },
    {
      id: 'offline', kind: 'offline',
      kicker: 'PRACTICE · ANY TIME',
      name: 'Offline mode',
      blurb: 'Play hands against AI seats. No signup, no clock pressure. Three difficulty rungs.',
      meta: 'BOTS · OFFLINE',
    },
    {
      id: 'riverrun', kind: 'solo',
      kicker: 'DAILY CHALLENGE · 8 HANDS',
      name: 'River Run',
      blurb: 'Solo gauntlet of rising targets. Today\'s par: 240pts. Top run so far: Dylan at 312.',
      meta: 'PAR 240 · TOP 312',
    },
    {
      id: 'leaderboard', kind: 'leaderboard',
      kicker: 'STANDINGS · WEEKLY',
      name: 'The standings',
      blurb: 'Top players, longest words, biggest pots of the week. Mira Quill leads chips; Zack leads points.',
      meta: 'MIRA · ZACK · OLLO',
    },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(180deg, #0a1d17 0%, #051410 100%)',
      color: '#e8dcc0', fontFamily: 'Inter', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{HOME_CSS}</style>

      {/* Masthead */}
      <div style={{
        padding: '24px 48px', borderBottom: '1px solid rgba(212,175,55,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <div style={{
            fontFamily: '"Noto Serif", serif', fontWeight: 700,
            fontSize: 26, color: '#f4e4c1', letterSpacing: -0.5,
          }}>Word Poker</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2, color: 'rgba(212,175,55,0.7)' }}>VOL. XII · NIGHTLY EDITION · TUE</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.55)', letterSpacing: 1.4 }}>
            <span style={{ color: '#9ec27a' }}>●</span> 142 PLAYERS · 6 TABLES
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '4px 4px 4px 14px', borderRadius: 999,
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.18)',
          }}>
            <div style={{ fontSize: 12 }}>Magnus Nilsen</div>
            <Avo a={{ name: 'Magnus N', color: '#a78bfa' }} size={26}/>
          </div>
        </div>
      </div>

      {/* Main two columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', minHeight: 0 }}>
        {/* Left — modes */}
        <div style={{ padding: '40px 48px', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, letterSpacing: 3, color: '#d4af37', marginBottom: 12 }}>WHAT'LL IT BE TONIGHT?</div>
          <h1 style={{ margin: 0, fontFamily: '"Noto Serif", serif', fontWeight: 600, fontSize: 56, lineHeight: 0.95, color: '#f4e4c1', letterSpacing: -1.5 }}>
            Choose how <em style={{ fontStyle: 'italic', color: '#d4af37' }}>to play</em>
          </h1>
          <div style={{ marginTop: 12, fontSize: 14, color: 'rgba(232,220,192,0.55)', maxWidth: 460 }}>
            Pick a deal. Online matches are seated within thirty seconds; offline runs never close.
          </div>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {modes.map(m => <ModeRow key={m.id} m={m}/>)}
          </div>

          <div style={{ flex: 1 }}/>

          {/* Showdown tip card */}
          <div style={{
            marginTop: 28, padding: '14px 18px', borderRadius: 10,
            background: 'rgba(212,175,55,0.05)', border: '1px dashed rgba(212,175,55,0.3)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#d4af37', letterSpacing: 1.6 }}>HOUSE RULE</div>
            <div style={{ width: 1, height: 16, background: 'rgba(212,175,55,0.3)' }}/>
            <div style={{ fontSize: 13, color: '#e8dcc0', fontStyle: 'italic' }}>
              Showdowns favor length, but a 5× tile in the rack can steal any pot.
            </div>
          </div>
        </div>

        {/* Right — what's happening */}
        <div style={{
          padding: '40px 40px 80px', overflow: 'auto',
          background: 'rgba(0,0,0,0.18)',
          borderLeft: '1px solid rgba(212,175,55,0.12)',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5d4e', animation: 'pulse 1.6s ease-in-out infinite' }}/>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2, color: 'rgba(232,220,192,0.6)' }}>LIVE FEED · LAST 90s</div>
            </div>
            <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 26, color: '#f4e4c1', fontWeight: 600, fontStyle: 'italic' }}>What's happening</div>
          </div>

          {/* Headline play */}
          <div style={{
            padding: '16px 18px', borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(212,175,55,0.1) 0%, rgba(0,0,0,0.2) 100%)',
            border: '1px solid rgba(212,175,55,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avo a={{ name: 'Mira Quill', color: '#e6b450' }} size={28}/>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f4e4c1' }}>Mira Quill</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.2, color: 'rgba(232,220,192,0.5)' }}>@ THE MONASTERY · 14s AGO</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 28, color: '#d4af37', fontWeight: 600, lineHeight: 1 }}>+64</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.2, color: 'rgba(232,220,192,0.5)' }}>POINTS</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
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

          {/* Mini ticker rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { t: '00:21', room: 'High Roller', who: 'Ollo', msg: 'played ZEPHYR', pts: 51, kind: 'big' },
              { t: '00:38', room: 'Full Rack',   who: 'Zack', msg: 'played RUSTICS', pts: 29, kind: 'play' },
              { t: '01:02', room: 'Monastery',   who: 'Jamie', msg: 'shoved all-in', kind: 'raise' },
              { t: '01:14', room: 'Cursive',     who: 'Dani', msg: 'played QUARRY', pts: 38, kind: 'play' },
              { t: '01:31', room: 'High Roller', who: 'Petra', msg: 'folded', kind: 'fold' },
              { t: '01:48', room: 'Monastery',   who: 'Ellis', msg: 'raised to $400', kind: 'raise' },
            ].map((ev, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'baseline', gap: 10,
                padding: '9px 0', borderBottom: '1px solid rgba(212,175,55,0.07)',
                fontFamily: 'JetBrains Mono', fontSize: 11,
              }}>
                <span style={{ color: 'rgba(232,220,192,0.35)', width: 40, flexShrink: 0 }}>{ev.t}</span>
                <span style={{ color: tickerColor(ev.kind), width: 6, flexShrink: 0 }}>●</span>
                <span style={{ color: 'rgba(232,220,192,0.55)', width: 86, flexShrink: 0 }}>{ev.room}</span>
                <span style={{ color: '#f4e4c1', flex: 1, fontFamily: 'Inter' }}>{ev.who} {ev.msg}</span>
                {ev.pts && <span style={{ fontFamily: '"Noto Serif", serif', fontSize: 14, color: '#d4af37', fontWeight: 600 }}>+{ev.pts}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomMarquee/>
    </div>
  );
}

function ModeRow({ m }) {
  const kindAccent = {
    tutorial:    { glyph: '◐', color: '#d4af37' },
    online:      { glyph: '◉', color: '#9ec27a' },
    offline:     { glyph: '◎', color: '#7ec4cf' },
    solo:        { glyph: '◈', color: '#e6b450' },
    leaderboard: { glyph: '★', color: '#d4af37' },
  }[m.kind] || { glyph: '·', color: '#d4af37' };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '46px 1fr auto', gap: 18, alignItems: 'center',
      padding: '18px 22px', borderRadius: 12, cursor: 'pointer',
      background: m.recommended ? 'linear-gradient(90deg, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.04) 100%)' : 'rgba(0,0,0,0.25)',
      border: m.recommended ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(212,175,55,0.1)',
      position: 'relative',
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: '50%',
        background: 'rgba(0,0,0,0.4)', border: `1px solid ${kindAccent.color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'JetBrains Mono', fontSize: 22, color: kindAccent.color,
      }}>{kindAccent.glyph}</div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.8, color: 'rgba(232,220,192,0.55)' }}>{m.kicker}</div>
          {m.recommended && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.4, color: '#1a1208', background: '#d4af37', padding: '2px 7px', borderRadius: 3 }}>RECOMMENDED</span>}
        </div>
        <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 22, color: '#f4e4c1', fontWeight: 600, marginTop: 4, fontStyle: 'italic' }}>{m.name}</div>
        <div style={{ fontSize: 12, color: 'rgba(232,220,192,0.55)', marginTop: 4, lineHeight: 1.4 }}>{m.blurb}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.4, color: 'rgba(232,220,192,0.55)' }}>{m.meta}</div>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2L8 5L2 8Z" fill="#d4af37"/></svg>
        </div>
      </div>
    </div>
  );
}

// ─── MOBILE HOME ─────────────────────────────────────────────
function HomeMobile() {
  const modes = [
    { id: 'tutorial', kind: 'tutorial', recommended: true, kicker: '2 MIN', name: 'Tutorial', blurb: 'Learn the deal · +50 chips' },
    { id: 'online', kind: 'online', kicker: '6 TABLES OPEN', name: 'Online tables', blurb: '142 live opponents in the room' },
    { id: 'offline', kind: 'offline', kicker: 'BOTS · NO SIGNUP', name: 'Offline mode', blurb: 'Practice hands against AI' },
    { id: 'riverrun', kind: 'solo', kicker: '8 HANDS · DAILY', name: 'River Run', blurb: 'Solo gauntlet · par 240' },
    { id: 'leaderboard', kind: 'leaderboard', kicker: 'WEEKLY STANDINGS', name: 'The standings', blurb: 'Top players & best words' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(180deg, #0a1d17 0%, #051410 100%)',
      color: '#e8dcc0', fontFamily: 'Inter', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{HOME_CSS}</style>

      <div style={{ height: 54 }}/>
      <div style={{ padding: '0 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: '"Noto Serif", serif', fontWeight: 700, fontSize: 17, color: '#f4e4c1' }}>Word Poker</div>
        <Avo a={{ name: 'Magnus N', color: '#a78bfa' }} size={28}/>
      </div>

      <div style={{ padding: '14px 18px 8px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2.5, color: '#d4af37' }}>VOL. XII · NIGHTLY</div>
        <h1 style={{ margin: '4px 0 0', fontFamily: '"Noto Serif", serif', fontSize: 32, fontWeight: 600, color: '#f4e4c1', letterSpacing: -0.8, lineHeight: 0.95 }}>
          Choose how <em style={{ color: '#d4af37' }}>to play</em>
        </h1>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.5)', letterSpacing: 1.2, marginTop: 8 }}>
          <span style={{ color: '#9ec27a' }}>●</span> 142 ONLINE · 6 TABLES
        </div>
      </div>

      {/* Headline play strip */}
      <div style={{
        margin: '4px 18px 8px', padding: '10px 12px', borderRadius: 10,
        background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.25)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Avo a={{ name: 'Mira Q', color: '#e6b450' }} size={26}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.2, color: '#d4af37' }}>HEADLINE · 14s AGO</div>
          <div style={{ fontSize: 12, color: '#f4e4c1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Mira · TINCTURES @ Monastery</div>
        </div>
        <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 22, color: '#d4af37', fontWeight: 600 }}>+64</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '6px 18px 60px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {modes.map(m => {
          const kindAccent = {
            tutorial: { glyph: '◐', color: '#d4af37' },
            online: { glyph: '◉', color: '#9ec27a' },
            offline: { glyph: '◎', color: '#7ec4cf' },
            solo: { glyph: '◈', color: '#e6b450' },
            leaderboard: { glyph: '★', color: '#d4af37' },
          }[m.kind] || { glyph: '·', color: '#d4af37' };
          return (
            <div key={m.id} style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 24px', gap: 12, alignItems: 'center',
              padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
              background: m.recommended ? 'linear-gradient(90deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.04) 100%)' : 'rgba(0,0,0,0.25)',
              border: m.recommended ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(212,175,55,0.1)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)', border: `1px solid ${kindAccent.color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'JetBrains Mono', fontSize: 18, color: kindAccent.color,
              }}>{kindAccent.glyph}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, letterSpacing: 1.4, color: 'rgba(232,220,192,0.55)' }}>{m.kicker}</div>
                  {m.recommended && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 7, letterSpacing: 1.2, color: '#1a1208', background: '#d4af37', padding: '1px 5px', borderRadius: 2 }}>REC.</span>}
                </div>
                <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 18, color: '#f4e4c1', fontWeight: 600, marginTop: 2, fontStyle: 'italic' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(232,220,192,0.55)', marginTop: 2 }}>{m.blurb}</div>
              </div>
              <div style={{ color: '#d4af37', fontSize: 16 }}>›</div>
            </div>
          );
        })}
      </div>

      <BottomMarquee small/>
    </div>
  );
}
