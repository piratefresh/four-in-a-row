// app.jsx — design canvas for auth + leaderboard variations

const { useState: useStAL, useEffect: useEfAL } = React;

// Phone shell — same vocabulary as online-rooms/app.jsx
function PhoneAL({ children, width = 393, height = 852 }) {
  return (
    <div style={{
      width, height, borderRadius: 56, overflow: 'hidden',
      background: '#000',
      boxShadow: '0 0 0 12px #1a1a1a, 0 0 0 13px #2a2a2a, 0 20px 60px rgba(0,0,0,0.5)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 124, height: 36, borderRadius: 999, background: '#000', zIndex: 10,
      }}/>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 30px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 5,
        fontFamily: '-apple-system, "SF Pro", system-ui', fontSize: 16, fontWeight: 600, color: '#fff',
      }}>
        <span>9:41</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <svg width="17" height="11" viewBox="0 0 17 11">
            <rect x="0" y="7" width="2.5" height="4" rx="0.5" fill="#fff"/>
            <rect x="4" y="5" width="2.5" height="6" rx="0.5" fill="#fff"/>
            <rect x="8" y="3" width="2.5" height="8" rx="0.5" fill="#fff"/>
            <rect x="12" y="0" width="2.5" height="11" rx="0.5" fill="#fff"/>
          </svg>
          <svg width="24" height="11" viewBox="0 0 24 11">
            <rect x="0.5" y="0.5" width="20" height="10" rx="2.5" stroke="#fff" strokeOpacity="0.4" fill="none"/>
            <rect x="2" y="2" width="17" height="7" rx="1.5" fill="#fff"/>
            <rect x="21" y="3.5" width="1.5" height="4" rx="0.5" fill="#fff" opacity="0.4"/>
          </svg>
        </span>
      </div>
      <div style={{ width: '100%', height: '100%' }}>{children}</div>
    </div>
  );
}

const PhoneFrameBg = ({ children }) => (
  <div style={{
    width: '100%', height: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%)',
  }}>{children}</div>
);

const AL_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "featured_login":       "wire",
  "featured_register":    "buyin",
  "featured_leaderboard": "wire"
}/*EDITMODE-END*/;

function ALApp() {
  const [tweaks, setTweaks] = useStAL(() => {
    try { return { ...AL_TWEAK_DEFAULTS, ...JSON.parse(localStorage.getItem('al_tweaks') || '{}') }; }
    catch { return AL_TWEAK_DEFAULTS; }
  });
  const [tweakOpen, setTweakOpen] = useStAL(false);

  useEfAL(() => { localStorage.setItem('al_tweaks', JSON.stringify(tweaks)); }, [tweaks]);

  useEfAL(() => {
    function onMsg(e) {
      if (e.data?.type === '__activate_edit_mode') setTweakOpen(true);
      else if (e.data?.type === '__deactivate_edit_mode') setTweakOpen(false);
    }
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function setT(key, val) {
    const next = { ...tweaks, [key]: val };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
  }

  // Per-screen variation lookups
  const loginOrder    = ['stub', 'wire', 'resume'];
  const registerOrder = ['dealin', 'buyin', 'pickseat'];
  const lbOrder       = ['standings', 'hall', 'wire'];

  function reorder(arr, key) {
    const i = arr.indexOf(key);
    return i >= 0 ? [arr[i], ...arr.filter(x => x !== key)] : arr;
  }

  const loginTitles = {
    stub:   { title: 'The Stub',     sub: 'Perforated ticket-stub login · friction-killer with atmosphere' },
    wire:   { title: 'The Wire',     sub: 'Two-column · live ticker on the left, form on the right' },
    resume: { title: 'Last Hand',    sub: 'One-tap resume · seat held, big blind in 34s' },
  };
  const registerTitles = {
    dealin:   { title: 'Deal Yourself In', sub: 'Multi-step subscribe · chip progress, suggested handles' },
    buyin:    { title: 'The Buy-In',       sub: 'Atmospheric · $500 welcome stake visualized as chips' },
    pickseat: { title: 'Pick a Seat',      sub: 'Literal seat selection at a mini-felt before the form' },
  };
  const lbTitles = {
    standings: { title: 'The Standings',  sub: 'Dense broadsheet · podium + sortable table + awards sidebar' },
    hall:      { title: 'Hall of Records',sub: 'Magazine spread · big award cards + two-col rankings' },
    wire:      { title: 'The Wire · Live',sub: 'Live #1 spotlight · movement column · best words with tiles' },
  };

  function renderLoginDesktop(v) {
    if (v === 'stub')   return <LoginStubDesktop/>;
    if (v === 'wire')   return <LoginWireDesktop/>;
    if (v === 'resume') return <LoginResumeDesktop/>;
  }
  function renderLoginMobile(v) {
    if (v === 'stub')   return <LoginStubMobile/>;
    if (v === 'wire')   return <LoginWireMobile/>;
    if (v === 'resume') return <LoginResumeMobile/>;
  }
  function renderRegisterDesktop(v) {
    if (v === 'dealin')   return <RegisterDealinDesktop/>;
    if (v === 'buyin')    return <RegisterBuyinDesktop/>;
    if (v === 'pickseat') return <RegisterPickseatDesktop/>;
  }
  function renderRegisterMobile(v) {
    if (v === 'dealin')   return <RegisterDealinMobile/>;
    if (v === 'buyin')    return <RegisterBuyinMobile/>;
    if (v === 'pickseat') return <RegisterPickseatMobile/>;
  }
  function renderLBDesktop(v) {
    if (v === 'standings') return <LeaderboardStandingsDesktop/>;
    if (v === 'hall')      return <LeaderboardHallDesktop/>;
    if (v === 'wire')      return <LeaderboardWireDesktop/>;
  }
  function renderLBMobile(v) {
    if (v === 'standings') return <LeaderboardStandingsMobile/>;
    if (v === 'hall')      return <LeaderboardHallMobile/>;
    if (v === 'wire')      return <LeaderboardWireMobile/>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <DesignCanvas>
        {/* ───── LOGIN ───────────────────────────────────────── */}
        <DCSection id="login-desktop" title="Login · desktop — 1440 × 900" subtitle={`Featured: ${loginTitles[tweaks.featured_login]?.title}. Reorder via Tweaks.`}>
          {reorder(loginOrder, tweaks.featured_login).map(v => (
            <DCArtboard
              key={`l-d-${v}`} id={`l-d-${v}`}
              label={loginTitles[v].title + (v === tweaks.featured_login ? ' ★' : '') + ' — ' + loginTitles[v].sub}
              width={1440} height={900}
            >
              <div data-screen-label={`Login · Desktop · ${loginTitles[v].title}`} style={{ width: '100%', height: '100%' }}>
                {renderLoginDesktop(v)}
              </div>
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="login-mobile" title="Login · mobile — 393 × 852">
          {reorder(loginOrder, tweaks.featured_login).map(v => (
            <DCArtboard
              key={`l-m-${v}`} id={`l-m-${v}`}
              label={loginTitles[v].title + ' · mobile'}
              width={440} height={910}
            >
              <div data-screen-label={`Login · Mobile · ${loginTitles[v].title}`} style={{ width: '100%', height: '100%' }}>
                <PhoneFrameBg><PhoneAL>{renderLoginMobile(v)}</PhoneAL></PhoneFrameBg>
              </div>
            </DCArtboard>
          ))}
        </DCSection>

        {/* ───── REGISTER ────────────────────────────────────── */}
        <DCSection id="register-desktop" title="Register · desktop — 1440 × 900" subtitle={`Featured: ${registerTitles[tweaks.featured_register]?.title}`}>
          {reorder(registerOrder, tweaks.featured_register).map(v => (
            <DCArtboard
              key={`r-d-${v}`} id={`r-d-${v}`}
              label={registerTitles[v].title + (v === tweaks.featured_register ? ' ★' : '') + ' — ' + registerTitles[v].sub}
              width={1440} height={900}
            >
              <div data-screen-label={`Register · Desktop · ${registerTitles[v].title}`} style={{ width: '100%', height: '100%' }}>
                {renderRegisterDesktop(v)}
              </div>
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="register-mobile" title="Register · mobile — 393 × 852">
          {reorder(registerOrder, tweaks.featured_register).map(v => (
            <DCArtboard
              key={`r-m-${v}`} id={`r-m-${v}`}
              label={registerTitles[v].title + ' · mobile'}
              width={440} height={910}
            >
              <div data-screen-label={`Register · Mobile · ${registerTitles[v].title}`} style={{ width: '100%', height: '100%' }}>
                <PhoneFrameBg><PhoneAL>{renderRegisterMobile(v)}</PhoneAL></PhoneFrameBg>
              </div>
            </DCArtboard>
          ))}
        </DCSection>

        {/* ───── LEADERBOARD ─────────────────────────────────── */}
        <DCSection id="leaderboard-desktop" title="Leaderboard · desktop — 1440 × 900" subtitle={`Featured: ${lbTitles[tweaks.featured_leaderboard]?.title}`}>
          {reorder(lbOrder, tweaks.featured_leaderboard).map(v => (
            <DCArtboard
              key={`b-d-${v}`} id={`b-d-${v}`}
              label={lbTitles[v].title + (v === tweaks.featured_leaderboard ? ' ★' : '') + ' — ' + lbTitles[v].sub}
              width={1440} height={900}
            >
              <div data-screen-label={`Leaderboard · Desktop · ${lbTitles[v].title}`} style={{ width: '100%', height: '100%' }}>
                {renderLBDesktop(v)}
              </div>
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="leaderboard-mobile" title="Leaderboard · mobile — 393 × 852">
          {reorder(lbOrder, tweaks.featured_leaderboard).map(v => (
            <DCArtboard
              key={`b-m-${v}`} id={`b-m-${v}`}
              label={lbTitles[v].title + ' · mobile'}
              width={440} height={910}
            >
              <div data-screen-label={`Leaderboard · Mobile · ${lbTitles[v].title}`} style={{ width: '100%', height: '100%' }}>
                <PhoneFrameBg><PhoneAL>{renderLBMobile(v)}</PhoneAL></PhoneFrameBg>
              </div>
            </DCArtboard>
          ))}
        </DCSection>
      </DesignCanvas>

      {tweakOpen && (
        <ALTweakPanel
          tweaks={tweaks}
          setT={setT}
          onClose={() => {
            setTweakOpen(false);
            window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
          }}
        />
      )}
    </div>
  );
}

function ALTweakPanel({ tweaks, setT, onClose }) {
  const groups = [
    {
      key: 'featured_login', title: 'LOGIN',
      options: [
        { key: 'stub',   label: 'The Stub',  desc: 'Perforated ticket-stub form' },
        { key: 'wire',   label: 'The Wire',  desc: 'Two-column · atmospheric' },
        { key: 'resume', label: 'Last Hand', desc: 'One-tap resume your seat' },
      ],
    },
    {
      key: 'featured_register', title: 'REGISTER',
      options: [
        { key: 'dealin',   label: 'Deal Yourself In', desc: 'Multi-step subscribe feel' },
        { key: 'buyin',    label: 'The Buy-In',       desc: 'Atmospheric welcome stake' },
        { key: 'pickseat', label: 'Pick a Seat',      desc: 'Literal seat selection' },
      ],
    },
    {
      key: 'featured_leaderboard', title: 'LEADERBOARD',
      options: [
        { key: 'standings', label: 'The Standings',  desc: 'Broadsheet · sortable table' },
        { key: 'hall',      label: 'Hall of Records',desc: 'Magazine spread · awards' },
        { key: 'wire',      label: 'The Wire · Live',desc: 'Live spotlight on #1' },
      ],
    },
  ];

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, width: 300, zIndex: 9999,
      background: 'rgba(12,38,32,0.96)', color: '#e8dcc0',
      border: '1px solid rgba(212,175,55,0.3)', borderRadius: 14,
      padding: 18, fontFamily: 'Inter, system-ui', fontSize: 13,
      backdropFilter: 'blur(8px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      maxHeight: 'calc(100vh - 40px)', overflow: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 16, color: '#f4e4c1', fontWeight: 600 }}>Tweaks</div>
        <div onClick={onClose} style={{ cursor: 'pointer', fontSize: 18, color: 'rgba(232,220,192,0.5)' }}>×</div>
      </div>

      <div style={{ fontSize: 11, color: 'rgba(232,220,192,0.55)', lineHeight: 1.4, marginBottom: 14 }}>
        Pick a featured direction per screen — featured artboards lead each section.
      </div>

      {groups.map(g => (
        <div key={g.key} style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.8, color: 'rgba(232,220,192,0.55)', marginBottom: 8 }}>
            FEATURED · {g.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {g.options.map(o => {
              const sel = tweaks[g.key] === o.key;
              return (
                <div key={o.key} onClick={() => setT(g.key, o.key)} style={{
                  padding: '8px 11px', borderRadius: 8, cursor: 'pointer',
                  background: sel ? 'rgba(212,175,55,0.12)' : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${sel ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.1)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: sel ? '#d4af37' : '#f4e4c1', fontWeight: 600 }}>{o.label}</div>
                    {sel && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: '#d4af37', letterSpacing: 1.2 }}>★</span>}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(232,220,192,0.5)', marginTop: 2 }}>{o.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 10, color: 'rgba(232,220,192,0.45)', lineHeight: 1.4, padding: '8px 10px', background: 'rgba(0,0,0,0.25)', borderRadius: 6 }}>
        Tip — double-click any artboard to view it fullscreen. Drag the grip to reorder.
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ALApp />);
