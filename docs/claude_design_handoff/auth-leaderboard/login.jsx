// login.jsx — 3 login variations (desktop + mobile each)
// V1 The Stub — perforated ticket-stub form
// V2 The Wire — two-column with live atmosphere & social proof
// V3 Last Hand — one-tap resume your seat

const GoogleGlyph = (
  <svg width="14" height="14" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6 0-1.2-.1-1.8H9v3.4h4.8c-.2 1-.8 1.8-1.7 2.4v2h2.8c1.6-1.5 2.7-3.7 2.7-6z"/><path fill="#34A853" d="M9 18c2.4 0 4.4-.8 5.9-2.2l-2.8-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H1v2.3C2.5 15.9 5.5 18 9 18z"/><path fill="#FBBC04" d="M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5H1c-.7 1.2-1 2.6-1 4s.3 2.8 1 4l2.9-2.3z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5C13.4.9 11.4 0 9 0 5.5 0 2.5 2.1 1 5l2.9 2.3C4.6 5.1 6.6 3.6 9 3.6z"/></svg>
);
const AppleGlyph = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill={WP.parchment}><path d="M11.4 7.4c0-1.9 1.5-2.8 1.6-2.9-.9-1.3-2.3-1.5-2.7-1.5-1.2-.1-2.3.7-2.9.7-.6 0-1.5-.7-2.5-.7-1.3 0-2.5.8-3.2 1.9C.3 7.2 1.4 11 3 13.1c.7 1 1.6 2.1 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.6.7 2.7.7c1.1 0 1.8-1 2.5-2.1.8-1.2 1.1-2.3 1.1-2.4-.1 0-2.2-.9-2.4-3.3zM9.4 1.8c.6-.7 1-1.6.9-2.6-.9 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.5 1 .1 2-.5 2.5-1.2z"/></svg>
);
const DiscordGlyph = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.3 4.4A19.5 19.5 0 0015.4 3l-.3.4a14.4 14.4 0 014.5 2.3 14 14 0 00-12.4 0 14 14 0 014.5-2.3L11.5 3a19.5 19.5 0 00-4.9 1.4A20.6 20.6 0 003 17a14.6 14.6 0 004.5 2.3l1-1.4a9.4 9.4 0 01-2.5-1.2c.2-.2.5-.3.7-.5a10 10 0 008.6 0c.2.2.5.3.7.5a9.4 9.4 0 01-2.5 1.2l1 1.4A14.6 14.6 0 0021 17a20.6 20.6 0 00-3.4-12.6h2.7zM9 14.4c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8zm6 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8z"/></svg>
);

// ─── chrome wrappers ─────────────────────────────────────────
function ScreenBg({ children, vignette = true }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: WP.bgGrad, color: WP.parchment,
      fontFamily: WP.sans, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {vignette && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.06) 0%, transparent 60%)',
        }}/>
      )}
      {children}
    </div>
  );
}

// Top masthead used across desktop variants
function Masthead({ tab = 'sign-in', edition = 'VOL. XII · TUE · 9:41 PM', online = '142 PLAYERS · 6 TABLES' }) {
  return (
    <div style={{
      padding: '20px 40px', borderBottom: `1px solid ${WP.rule}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'relative', zIndex: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div style={{ fontFamily: WP.serif, fontWeight: 700, fontSize: 22, color: WP.goldBright, letterSpacing: -0.5 }}>Word Poker</div>
        <Kicker>{edition}</Kicker>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Kicker color={WP.parchmentDim}><span style={{ color: WP.green }}>●</span> {online}</Kicker>
        <div style={{ display: 'flex', gap: 4 }}>
          <Kicker style={{ padding: '5px 10px', borderRadius: 999, color: tab === 'sign-in' ? WP.gold : WP.parchmentFaint, background: tab === 'sign-in' ? 'rgba(212,175,55,0.1)' : 'transparent', border: `1px solid ${tab === 'sign-in' ? WP.rule : 'transparent'}` }}>SIGN IN</Kicker>
          <Kicker style={{ padding: '5px 10px', borderRadius: 999, color: tab === 'register' ? WP.gold : WP.parchmentFaint, background: tab === 'register' ? 'rgba(212,175,55,0.1)' : 'transparent', border: `1px solid ${tab === 'register' ? WP.rule : 'transparent'}` }}>NEW HAND</Kicker>
        </div>
      </div>
    </div>
  );
}

// Bottom marquee for atmosphere
function AtmosphereMarquee({ small = false }) {
  const items = [...AUTH_LIVE_PLAYS, ...AUTH_LIVE_PLAYS];
  return (
    <div style={{
      borderTop: `1px solid ${WP.rule}`, background: 'rgba(0,0,0,0.35)',
      padding: small ? '7px 0' : '9px 0', overflow: 'hidden', whiteSpace: 'nowrap',
      fontFamily: WP.mono, fontSize: small ? 9 : 10, color: WP.parchmentDim,
      display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0,
    }}>
      <div style={{
        paddingLeft: 20, flexShrink: 0, color: WP.gold, letterSpacing: 2,
        display: 'flex', alignItems: 'center', gap: 8,
        borderRight: `1px solid ${WP.rule}`, paddingRight: 14,
      }}>
        <LiveDot size={6}/> LIVE ON THE WIRE
      </div>
      <div style={{
        display: 'inline-flex', gap: 32, paddingLeft: 18,
        animation: 'marquee 55s linear infinite',
      }}>
        {items.map((m, i) => (
          <span key={i} style={{ flexShrink: 0 }}>
            <span style={{ color: WP.gold }}>{m.who}</span>
            <span style={{ opacity: 0.65 }}> · {m.msg} @ </span>
            <span style={{ color: WP.goldBright }}>{m.room}</span>
            {m.pts && <span style={{ color: WP.gold, marginLeft: 8 }}>+{m.pts}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// V1 · THE STUB — perforated ticket-stub
// ═══════════════════════════════════════════════════════════════

function PerforationEdge({ vertical = false }) {
  // Returns a dotted seam used between stub halves
  const dots = Array.from({ length: vertical ? 28 : 80 }, (_, i) => i);
  return (
    <div style={{
      position: 'absolute',
      ...(vertical
        ? { top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 1 }
        : { left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: 1 }),
      display: 'flex', flexDirection: vertical ? 'column' : 'row',
      gap: 4, alignItems: 'center', justifyContent: 'space-between',
      padding: vertical ? '8px 0' : '0 8px',
      pointerEvents: 'none',
    }}>
      {dots.map(i => (
        <span key={i} style={{
          width: 2, height: 2, borderRadius: '50%',
          background: 'rgba(212,175,55,0.4)', flexShrink: 0,
        }}/>
      ))}
    </div>
  );
}

function TicketStub({ width = 440 }) {
  return (
    <div style={{
      width, position: 'relative',
      background: 'linear-gradient(180deg, #f4ead0 0%, #ead9b0 100%)',
      color: '#1a1208',
      borderRadius: 10,
      boxShadow: '0 30px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.4)',
    }}>
      {/* Scalloped left/right edges */}
      <span style={{
        position: 'absolute', top: '50%', left: -8, transform: 'translateY(-50%)',
        width: 16, height: 16, borderRadius: '50%', background: WP.ink,
        boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.4)',
      }}/>
      <span style={{
        position: 'absolute', top: '50%', right: -8, transform: 'translateY(-50%)',
        width: 16, height: 16, borderRadius: '50%', background: WP.ink,
        boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.4)',
      }}/>

      {/* Stub head — masthead-like ticket info */}
      <div style={{ padding: '22px 32px 18px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: WP.mono, fontSize: 9, letterSpacing: 2.4, color: '#6a4a18' }}>ADMIT ONE · TONIGHT'S DEAL</div>
            <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontWeight: 700, fontSize: 30, color: '#1a1208', letterSpacing: -0.5, lineHeight: 1, marginTop: 4 }}>
              Word Poker
            </div>
            <div style={{ fontFamily: WP.serif, fontSize: 13, color: '#6a4a18', marginTop: 4, fontStyle: 'italic' }}>
              The Monastery is seated · 5 of 6
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: WP.mono, fontSize: 8, letterSpacing: 1.6, color: '#6a4a18' }}>SERIAL</div>
            <div style={{ fontFamily: WP.mono, fontSize: 13, color: '#1a1208', fontWeight: 600, letterSpacing: 1 }}>WP-XII·4291</div>
            <div style={{ marginTop: 10, fontFamily: WP.mono, fontSize: 8, letterSpacing: 1.6, color: '#6a4a18' }}>POT TONIGHT</div>
            <div style={{ fontFamily: WP.serif, fontSize: 18, color: '#1a1208', fontWeight: 700 }}>$11,420</div>
          </div>
        </div>

        {/* Tiles spelling welcome */}
        <div style={{ display: 'flex', gap: 4, marginTop: 16, justifyContent: 'center' }}>
          <TileWord word="WELCOME BACK" size={26} points/>
        </div>
      </div>

      {/* perforation seam */}
      <div style={{ position: 'relative', height: 12, borderTop: '1px dashed rgba(106,74,24,0.4)', borderBottom: '1px dashed rgba(106,74,24,0.4)', background: 'repeating-linear-gradient(90deg, transparent 0 6px, rgba(106,74,24,0.1) 6px 8px)' }}>
      </div>

      {/* Stub body — form on dark "betting slip" feel */}
      <div style={{
        background: WP.ink, color: WP.parchment,
        padding: '24px 32px 28px',
        borderRadius: '0 0 10px 10px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="EMAIL OR HANDLE" type="email" value="magnussithnilsen@gmail.com" icon="@"/>
          <Field label="PASSWORD" type="password" placeholder="••••••••" hint="FORGOT?" icon="●"/>
        </div>

        <div style={{ marginTop: 18 }}>
          <PrimaryButton kicker="↳ TAKE YOUR SEAT">Sign in to Word Poker</PrimaryButton>
        </div>

        <Rule label="OR DEAL IN VIA"/>

        <div style={{ display: 'flex', gap: 8 }}>
          <GhostButton icon={GoogleGlyph}>Google</GhostButton>
          <GhostButton icon={AppleGlyph}>Apple</GhostButton>
          <GhostButton icon={DiscordGlyph}>Discord</GhostButton>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.6, color: WP.parchmentDim }}>
            <LiveDot size={5}/>  &nbsp; 142 IN THE ROOM TONIGHT
          </span>
          <a style={{ fontFamily: WP.sans, fontSize: 12, color: WP.gold, textDecoration: 'none', fontWeight: 600 }}>New here? Deal yourself in →</a>
        </div>
      </div>

      {/* House rule micro-footer */}
      <div style={{
        background: '#1a1208', color: 'rgba(232,220,192,0.55)',
        padding: '10px 32px', fontFamily: WP.mono, fontSize: 9, letterSpacing: 1.4,
        display: 'flex', justifyContent: 'space-between',
        borderRadius: '0 0 10px 10px',
      }}>
        <span>HOUSE RULE — 5× TILES CAN STEAL ANY POT</span>
        <span>GOOD LUCK</span>
      </div>
    </div>
  );
}

function LoginStubDesktop() {
  return (
    <ScreenBg>
      <Masthead tab="sign-in"/>

      {/* Background ambient felt */}
      <div style={{
        position: 'absolute', top: 80, right: -100, width: 600, height: 600,
        background: 'radial-gradient(ellipse at center, rgba(30,80,60,0.35) 0%, transparent 60%)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', bottom: 60, left: -100, width: 480, height: 480,
        background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }}/>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 40px', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 460px 1fr', alignItems: 'center', gap: 40, width: '100%', maxWidth: 1200 }}>
          {/* Left flavor */}
          <div>
            <Kicker size={11} gap={3}>TUESDAY · 9:41 PM · LIVE</Kicker>
            <h1 style={{ margin: '10px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 48, lineHeight: 0.98, color: WP.goldBright, letterSpacing: -1 }}>
              The table's <em style={{ color: WP.gold }}>warm</em>.<br/>Take your seat.
            </h1>
            <div style={{ marginTop: 14, fontFamily: WP.serif, fontStyle: 'italic', fontSize: 14, color: WP.parchmentDim, maxWidth: 360, lineHeight: 1.5 }}>
              You left The Monastery at <span style={{ color: WP.gold }}>+$340</span> last night. Mira is back, Ellis is up two stacks, and the buy-in is still kind.
            </div>
            <div style={{ marginTop: 22, display: 'flex', gap: 18 }}>
              <div>
                <Kicker size={9}>LAST LOGIN</Kicker>
                <div style={{ fontFamily: WP.serif, fontSize: 18, color: WP.goldBright, marginTop: 4 }}>Mon · 11:14 PM</div>
              </div>
              <div style={{ width: 1, background: WP.rule }}/>
              <div>
                <Kicker size={9}>YOUR STREAK</Kicker>
                <div style={{ fontFamily: WP.serif, fontSize: 18, color: WP.gold, marginTop: 4 }}>2 wins · keep going</div>
              </div>
            </div>
          </div>

          {/* Stub */}
          <TicketStub width={460}/>

          {/* Right flavor — who's at the table */}
          <div>
            <Kicker size={11} gap={3}>NOW AT YOUR REGULAR TABLE</Kicker>
            <div style={{ marginTop: 10, fontFamily: WP.serif, fontStyle: 'italic', fontSize: 22, color: WP.goldBright }}>The Monastery</div>
            <div style={{ marginTop: 12, padding: '14px 16px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${WP.rule}`, borderRadius: 10 }}>
              {AUTH_LIVE_PLAYS.slice(0, 5).map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 0', borderBottom: i < 4 ? `1px solid ${WP.ruleFaint}` : 'none',
                  fontFamily: WP.mono, fontSize: 10,
                }}>
                  <span style={{ color: WP.parchmentFaint, width: 36 }}>{p.t}</span>
                  <MiniAv name={p.who} color={p.color} size={18}/>
                  <span style={{ color: WP.goldBright, flex: 1, fontFamily: WP.sans, fontSize: 11 }}>{p.who}</span>
                  <span style={{ color: p.kind === 'big' ? WP.gold : p.kind === 'raise' ? WP.red : WP.parchmentDim, fontSize: 10 }}>{p.msg}</span>
                  {p.pts && <span style={{ color: WP.gold, fontFamily: WP.serif, fontSize: 13, fontWeight: 600 }}>+{p.pts}</span>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontFamily: WP.serif, fontStyle: 'italic', fontSize: 13, color: WP.parchmentDim, lineHeight: 1.5 }}>
              <span style={{ color: WP.gold }}>Word of the night:</span> TINCTURES · 64 pts by Mira Quill
            </div>
          </div>
        </div>
      </div>

      <AtmosphereMarquee/>
    </ScreenBg>
  );
}

function LoginStubMobile() {
  return (
    <ScreenBg>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '8px 18px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: WP.serif, fontWeight: 700, fontSize: 16, color: WP.goldBright }}>Word Poker</div>
        <Kicker size={9}>VOL. XII · TUE</Kicker>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 0' }}>
        <Kicker size={9} gap={2.4}>ADMIT ONE · TONIGHT'S DEAL</Kicker>
        <h1 style={{ margin: '6px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 32, lineHeight: 0.98, color: WP.goldBright, letterSpacing: -0.6 }}>
          The table's <em style={{ color: WP.gold }}>warm</em>.
        </h1>

        {/* Mini ticket */}
        <div style={{
          marginTop: 16, padding: 18, background: 'linear-gradient(180deg, #f4ead0 0%, #ead9b0 100%)',
          color: '#1a1208', borderRadius: 10, position: 'relative',
          boxShadow: '0 12px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Kicker size={8} gap={1.6} color="#6a4a18">SERIAL</Kicker>
            <div style={{ fontFamily: WP.mono, fontSize: 11, color: '#1a1208', fontWeight: 600 }}>WP-XII·4291</div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 3, justifyContent: 'center' }}>
            <TileWord word="WELCOME" size={22} points/>
          </div>
        </div>

        {/* Perforation */}
        <div style={{ height: 1, borderTop: '1px dashed rgba(212,175,55,0.4)', margin: '0 -18px' }}/>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="EMAIL OR HANDLE" type="email" value="magnussithnilsen@gmail.com" icon="@"/>
          <Field label="PASSWORD" type="password" placeholder="••••••••" hint="FORGOT?" icon="●"/>
        </div>

        <div style={{ marginTop: 16 }}>
          <PrimaryButton kicker="↳ TAKE YOUR SEAT">Sign in</PrimaryButton>
        </div>

        <Rule label="OR DEAL IN VIA"/>
        <div style={{ display: 'flex', gap: 6 }}>
          <GhostButton icon={GoogleGlyph}>Google</GhostButton>
          <GhostButton icon={AppleGlyph}>Apple</GhostButton>
        </div>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <a style={{ fontFamily: WP.sans, fontSize: 12, color: WP.gold, fontWeight: 600 }}>New here? Deal yourself in →</a>
        </div>
      </div>

      <AtmosphereMarquee small/>
    </ScreenBg>
  );
}

// ═══════════════════════════════════════════════════════════════
// V2 · THE WIRE — two-column with atmosphere & social proof
// ═══════════════════════════════════════════════════════════════

function LoginWireDesktop() {
  return (
    <ScreenBg>
      <Masthead tab="sign-in"/>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.25fr 1fr', minHeight: 0 }}>
        {/* Left — atmosphere */}
        <div style={{
          padding: '54px 56px 40px', overflow: 'auto',
          display: 'flex', flexDirection: 'column', gap: 24,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.04) 0%, transparent 60%)',
          borderRight: `1px solid ${WP.ruleFaint}`,
        }}>
          <div>
            <Kicker size={11} gap={3}>EDITORIAL · NIGHTLY EDITION</Kicker>
            <h1 style={{ margin: '12px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 64, lineHeight: 0.92, color: WP.goldBright, letterSpacing: -2 }}>
              While you were <em style={{ color: WP.gold, fontStyle: 'italic' }}>away</em>…
            </h1>
            <div style={{ marginTop: 16, fontFamily: WP.serif, fontSize: 16, color: WP.parchmentDim, fontStyle: 'italic', maxWidth: 460, lineHeight: 1.55 }}>
              Six tables ran late last night. Three started fresh in the last hour. The Monastery's still going.
            </div>
          </div>

          {/* Headline play card */}
          <div style={{
            padding: 22, borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(212,175,55,0.1) 0%, rgba(0,0,0,0.25) 100%)',
            border: `1px solid ${WP.rule}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Kicker size={10}>HEADLINE PLAY · 14s AGO</Kicker>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MiniAv name="Mira Quill" color="#e6b450" size={28}/>
                  <div>
                    <div style={{ fontFamily: WP.sans, fontSize: 14, fontWeight: 600, color: WP.goldBright }}>Mira Quill</div>
                    <Kicker size={9} gap={1.4} color={WP.parchmentDim}>@ THE MONASTERY</Kicker>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: WP.serif, fontSize: 38, color: WP.gold, fontWeight: 700, lineHeight: 1 }}>+64</div>
                <Kicker size={8}>POINTS</Kicker>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 3 }}>
              <TileWord word="TINCTURES" size={32} points/>
            </div>
            <div style={{ marginTop: 14, fontFamily: WP.serif, fontStyle: 'italic', fontSize: 13, color: WP.parchmentDim, lineHeight: 1.5 }}>
              "Caught Ellis on the river. He was holding three 5× tiles and didn't pull the trigger."
            </div>
          </div>

          {/* Mini live feed */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <LiveDot size={7}/>
              <Kicker size={10}>LIVE FEED · LAST 90s</Kicker>
            </div>
            <div>
              {AUTH_LIVE_PLAYS.slice(0, 5).map((ev, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'baseline', gap: 12,
                  padding: '8px 0', borderBottom: i < 4 ? `1px solid ${WP.ruleFaint}` : 'none',
                  fontFamily: WP.mono, fontSize: 11,
                }}>
                  <span style={{ color: WP.parchmentFaint, width: 38 }}>{ev.t}</span>
                  <span style={{ color: ev.kind === 'big' ? WP.gold : ev.kind === 'raise' ? WP.red : ev.kind === 'play' ? WP.green : WP.parchmentDim }}>●</span>
                  <span style={{ color: WP.parchmentDim, width: 100, flexShrink: 0 }}>{ev.room}</span>
                  <span style={{ color: WP.goldBright, flex: 1, fontFamily: WP.sans, fontSize: 12 }}>{ev.who} {ev.msg}</span>
                  {ev.pts && <span style={{ color: WP.gold, fontFamily: WP.serif, fontSize: 15, fontWeight: 600 }}>+{ev.pts}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Stat strip */}
          <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${WP.rule}`, paddingTop: 16 }}>
            {[
              { label: 'PLAYERS TONIGHT', val: '142', sub: '+18 vs. avg' },
              { label: 'TABLES SEATED',   val: '6',   sub: '4 with open seats' },
              { label: 'HOTTEST POT',     val: '$4.8K', sub: 'Monastery' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, paddingLeft: i === 0 ? 0 : 18, borderLeft: i === 0 ? 'none' : `1px solid ${WP.rule}` }}>
                <Kicker size={9}>{s.label}</Kicker>
                <div style={{ fontFamily: WP.serif, fontSize: 22, color: WP.goldBright, fontWeight: 600, marginTop: 4 }}>{s.val}</div>
                <div style={{ fontFamily: WP.sans, fontSize: 11, color: WP.parchmentDim, marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div style={{ padding: '54px 56px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ maxWidth: 380 }}>
            <Mark size={44}/>
            <h2 style={{ margin: '18px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 42, color: WP.goldBright, letterSpacing: -1, lineHeight: 1 }}>
              Welcome <em style={{ color: WP.gold }}>back</em>.
            </h2>
            <div style={{ marginTop: 8, fontFamily: WP.serif, fontStyle: 'italic', fontSize: 14, color: WP.parchmentDim }}>
              Magnus — we kept your seat at The Monastery warm.
            </div>

            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="EMAIL OR HANDLE" type="email" value="magnussithnilsen@gmail.com" icon="@"/>
              <Field label="PASSWORD" type="password" placeholder="••••••••" hint="FORGOT?" icon="●"/>
            </div>

            <div style={{ marginTop: 18 }}>
              <PrimaryButton kicker="↳ TAKE YOUR SEAT">Sign in to Word Poker</PrimaryButton>
            </div>

            <Rule label="OR"/>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <GhostButton icon={GoogleGlyph}>Continue with Google</GhostButton>
              <GhostButton icon={AppleGlyph}>Continue with Apple</GhostButton>
              <GhostButton icon={DiscordGlyph}>Continue with Discord</GhostButton>
            </div>

            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a style={{ fontFamily: WP.sans, fontSize: 12, color: WP.parchmentDim, fontWeight: 500 }}>Magic link instead →</a>
              <a style={{ fontFamily: WP.sans, fontSize: 12, color: WP.gold, fontWeight: 600 }}>New here? Deal in →</a>
            </div>
          </div>
        </div>
      </div>

      <AtmosphereMarquee/>
    </ScreenBg>
  );
}

function LoginWireMobile() {
  return (
    <ScreenBg>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: WP.serif, fontWeight: 700, fontSize: 16, color: WP.goldBright }}>Word Poker</div>
        <Kicker size={9}>● 142 LIVE</Kicker>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px 0' }}>
        {/* Headline play */}
        <div style={{
          padding: 14, borderRadius: 10,
          background: 'linear-gradient(180deg, rgba(212,175,55,0.1) 0%, rgba(0,0,0,0.2) 100%)',
          border: `1px solid ${WP.rule}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MiniAv name="Mira Quill" color="#e6b450" size={24}/>
              <div>
                <Kicker size={8} gap={1.2}>HEADLINE · 14s AGO</Kicker>
                <div style={{ fontSize: 12, color: WP.goldBright, fontWeight: 600 }}>Mira · TINCTURES</div>
              </div>
            </div>
            <div style={{ fontFamily: WP.serif, fontSize: 24, color: WP.gold, fontWeight: 700 }}>+64</div>
          </div>
          <div style={{ marginTop: 8 }}>
            <TileWord word="TINCTURES" size={20} points/>
          </div>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Mark size={40}/>
          <h2 style={{ margin: '12px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 32, color: WP.goldBright, letterSpacing: -0.6 }}>
            Welcome <em style={{ color: WP.gold }}>back</em>.
          </h2>
          <div style={{ marginTop: 4, fontFamily: WP.serif, fontStyle: 'italic', fontSize: 13, color: WP.parchmentDim }}>
            We kept your seat warm.
          </div>
        </div>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="EMAIL OR HANDLE" type="email" value="magnussithnilsen@gmail.com" icon="@"/>
          <Field label="PASSWORD" type="password" placeholder="••••••••" hint="FORGOT?" icon="●"/>
        </div>

        <div style={{ marginTop: 14 }}>
          <PrimaryButton kicker="↳ TAKE YOUR SEAT">Sign in</PrimaryButton>
        </div>

        <Rule label="OR"/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GhostButton icon={GoogleGlyph}>Continue with Google</GhostButton>
          <GhostButton icon={AppleGlyph}>Continue with Apple</GhostButton>
        </div>

        <div style={{ margin: '16px 0 18px', textAlign: 'center' }}>
          <a style={{ fontFamily: WP.sans, fontSize: 12, color: WP.gold, fontWeight: 600 }}>New here? Deal in →</a>
        </div>
      </div>

      <AtmosphereMarquee small/>
    </ScreenBg>
  );
}

// ═══════════════════════════════════════════════════════════════
// V3 · LAST HAND — friction-killer, one-tap resume
// ═══════════════════════════════════════════════════════════════

// Mini-felt with seats — bespoke, simpler than data.jsx MiniFelt so we don't
// depend on a specific room object shape
function ResumeFelt({ width = 380, height = 230 }) {
  const seats = [
    { x: 0.5, y: 0.92, name: 'You',          color: WP.gold, you: true },
    { x: 0.12, y: 0.72, name: 'Mira Quill',  color: '#e6b450' },
    { x: 0.08, y: 0.32, name: 'Jamie',       color: '#7ec4cf' },
    { x: 0.5, y: 0.10, name: 'Ellis',        color: '#b8a6f0' },
    { x: 0.92, y: 0.32, name: 'Raja',        color: '#d97757' },
    { x: 0.88, y: 0.72, name: 'Zack',        color: '#9ec27a' },
  ];
  return (
    <div style={{
      width, height, position: 'relative',
      background: 'radial-gradient(ellipse at center, #1a4a35 0%, #0e3422 60%, #08291b 100%)',
      borderRadius: width * 0.45,
      border: '3px solid #3a2815',
      boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), 0 16px 40px rgba(0,0,0,0.6)',
    }}>
      <div style={{ position: 'absolute', inset: 8, borderRadius: width * 0.43, border: `1px solid ${WP.rule}` }}/>
      {/* Pot in center */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
        <Kicker size={9}>POT · YOUR SEAT</Kicker>
        <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 30, color: WP.gold, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>$4,280</div>
        <div style={{ fontFamily: WP.mono, fontSize: 9, color: WP.parchmentDim, letterSpacing: 1.4, marginTop: 4 }}>BIG BLIND IN <span style={{ color: WP.gold }}>00:34</span></div>
      </div>
      {seats.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x * 100}%`, top: `${s.y * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}>
          <MiniAv name={s.name} color={s.color} size={s.you ? 38 : 30} ring={s.you}/>
          {s.you && (
            <div style={{
              position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
              marginTop: 6, padding: '2px 8px', borderRadius: 999,
              background: WP.gold, color: '#1a1208',
              fontFamily: WP.mono, fontSize: 8, fontWeight: 700, letterSpacing: 1.4,
              whiteSpace: 'nowrap',
            }}>YOU</div>
          )}
        </div>
      ))}
    </div>
  );
}

function LoginResumeDesktop() {
  return (
    <ScreenBg>
      <Masthead tab="sign-in"/>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 40px' }}>
        <div style={{ width: '100%', maxWidth: 1080, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
          {/* Left — felt + status */}
          <div>
            <Kicker size={11} gap={3}>RESUME · YOUR SEAT IS HELD</Kicker>
            <h1 style={{ margin: '12px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 56, lineHeight: 0.95, color: WP.goldBright, letterSpacing: -1.5 }}>
              Pick up <em style={{ color: WP.gold }}>where</em><br/>you left off.
            </h1>
            <div style={{ marginTop: 14, fontFamily: WP.serif, fontStyle: 'italic', fontSize: 15, color: WP.parchmentDim, maxWidth: 380, lineHeight: 1.5 }}>
              The Monastery dealt around your seat. You're still in for $340, big blind drops in 34 seconds.
            </div>

            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
              <ResumeFelt width={420} height={250}/>
            </div>
          </div>

          {/* Right — one-tap card */}
          <div>
            <div style={{
              padding: '28px 28px 24px', borderRadius: 14,
              background: 'rgba(0,0,0,0.35)', border: `1px solid ${WP.rule}`,
              boxShadow: '0 30px 70px rgba(0,0,0,0.45)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <MiniAv name="Magnus Nilsen" color={WP.violet} size={56}/>
                <div>
                  <Kicker size={9} gap={1.6}>SIGNED IN AS</Kicker>
                  <div style={{ fontFamily: WP.serif, fontSize: 22, color: WP.goldBright, fontWeight: 600 }}>Magnus Nilsen</div>
                  <div style={{ fontFamily: WP.mono, fontSize: 10, color: WP.parchmentDim, letterSpacing: 1.2 }}>magnussithnilsen@gmail.com</div>
                </div>
              </div>

              <div style={{
                marginTop: 22, padding: '14px 16px', borderRadius: 8,
                background: 'rgba(212,175,55,0.08)', border: `1px solid ${WP.rule}`,
                display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'center',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={WP.gold} strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>
                </div>
                <div>
                  <div style={{ fontFamily: WP.sans, fontSize: 13, color: WP.goldBright, fontWeight: 600 }}>Trusted device</div>
                  <div style={{ fontFamily: WP.serif, fontStyle: 'italic', fontSize: 12, color: WP.parchmentDim }}>Last hand played from this machine 18 hrs ago</div>
                </div>
                <Kicker size={9}>VERIFIED</Kicker>
              </div>

              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <PrimaryButton kicker="↳ RETURN TO THE MONASTERY">Resume your seat · $340</PrimaryButton>
                <GhostButton>Use password instead</GhostButton>
              </div>

              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderTop: `1px solid ${WP.ruleFaint}`, paddingTop: 14 }}>
                {[
                  { k: 'STREAK',  v: '2W', c: WP.gold },
                  { k: 'CHIPS',   v: '$1,500', c: WP.goldBright },
                  { k: 'STANDING',v: '#7',   c: WP.parchment },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', borderLeft: i === 0 ? 'none' : `1px solid ${WP.ruleFaint}` }}>
                    <Kicker size={8}>{s.k}</Kicker>
                    <div style={{ fontFamily: WP.serif, fontSize: 18, color: s.c, fontWeight: 600, marginTop: 3 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16, fontFamily: WP.sans, fontSize: 12, color: WP.parchmentDim, textAlign: 'center' }}>
              Not Magnus? <a style={{ color: WP.gold, fontWeight: 600 }}>Sign in with another account</a> · <a style={{ color: WP.parchment }}>Continue as guest</a>
            </div>
          </div>
        </div>
      </div>

      <AtmosphereMarquee/>
    </ScreenBg>
  );
}

function LoginResumeMobile() {
  return (
    <ScreenBg>
      <div style={{ height: 54 }}/>
      <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: WP.serif, fontWeight: 700, fontSize: 16, color: WP.goldBright }}>Word Poker</div>
        <Kicker size={9}>YOUR SEAT IS HELD</Kicker>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 20px', display: 'flex', flexDirection: 'column' }}>
        <Kicker size={10} gap={2.4}>RESUME</Kicker>
        <h1 style={{ margin: '4px 0 0', fontFamily: WP.serif, fontWeight: 600, fontSize: 30, lineHeight: 0.98, color: WP.goldBright, letterSpacing: -0.6 }}>
          Pick up <em style={{ color: WP.gold }}>where</em><br/>you left off.
        </h1>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <ResumeFelt width={340} height={200}/>
        </div>

        <div style={{
          marginTop: 16, padding: '18px 18px', borderRadius: 12,
          background: 'rgba(0,0,0,0.35)', border: `1px solid ${WP.rule}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MiniAv name="Magnus Nilsen" color={WP.violet} size={42}/>
            <div>
              <Kicker size={8}>SIGNED IN AS</Kicker>
              <div style={{ fontFamily: WP.serif, fontSize: 17, color: WP.goldBright, fontWeight: 600 }}>Magnus Nilsen</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <PrimaryButton kicker="↳ RETURN TO THE MONASTERY">Resume · $340</PrimaryButton>
          </div>
          <div style={{ marginTop: 8 }}>
            <GhostButton>Use password instead</GhostButton>
          </div>
        </div>

        <div style={{ marginTop: 14, fontFamily: WP.sans, fontSize: 12, color: WP.parchmentDim, textAlign: 'center' }}>
          Not Magnus? <a style={{ color: WP.gold, fontWeight: 600 }}>Switch account</a>
        </div>
      </div>

      <AtmosphereMarquee small/>
    </ScreenBg>
  );
}
