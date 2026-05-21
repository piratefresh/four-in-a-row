// app.jsx — Online Rooms redesign canvas

const { useState: useSt, useEffect: useEf } = React;

// Simple iOS-ish phone bezel for the mobile artboards
function PhoneShell({ children, width = 393, height = 852 }) {
  return (
    <div style={{
      width, height, borderRadius: 56, overflow: 'hidden',
      background: '#000',
      boxShadow: '0 0 0 12px #1a1a1a, 0 0 0 13px #2a2a2a, 0 20px 60px rgba(0,0,0,0.5)',
      position: 'relative',
    }}>
      {/* dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 124, height: 36, borderRadius: 999, background: '#000', zIndex: 10,
      }}/>
      {/* status bar */}
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

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "featured": "parlor",
  "showFocus": false
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweaks] = useSt(() => {
    try { return { ...TWEAK_DEFAULTS, ...JSON.parse(localStorage.getItem('rooms_tweaks') || '{}') }; }
    catch { return TWEAK_DEFAULTS; }
  });
  const [tweakOpen, setTweakOpen] = useSt(false);

  useEf(() => { localStorage.setItem('rooms_tweaks', JSON.stringify(tweaks)); }, [tweaks]);

  useEf(() => {
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

  // Variation order — featured one goes first
  const order = ['parlor', 'floor', 'ticker'];
  const featuredIdx = order.indexOf(tweaks.featured);
  const reordered = featuredIdx >= 0
    ? [order[featuredIdx], ...order.filter(x => x !== tweaks.featured)]
    : order;

  const titles = {
    parlor: { title: 'The Parlor', sub: 'Editorial casino · hero featured room with live mini-felt' },
    floor:  { title: 'The Floor',  sub: 'Cards-as-tables · every room is a bird\'s-eye felt' },
    ticker: { title: 'The Wire',   sub: 'Newsroom · split list + live activity feed' },
  };

  function renderDesktop(v) {
    if (v === 'parlor') return <ParlorDesktop/>;
    if (v === 'floor')  return <FloorDesktop/>;
    if (v === 'ticker') return <TickerDesktop/>;
  }
  function renderMobile(v) {
    if (v === 'parlor') return <ParlorMobile/>;
    if (v === 'floor')  return <FloorMobile/>;
    if (v === 'ticker') return <TickerMobile/>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <DesignCanvas>
        <DCSection id="desktop" title="Desktop — 1440 × 900">
          {reordered.map(v => (
            <DCArtboard
              key={`d-${v}`}
              id={`d-${v}`}
              label={titles[v].title + (v === tweaks.featured ? ' ★ featured' : '')}
              width={1440} height={900}
            >
              <div data-screen-label={`Desktop · ${titles[v].title}`} style={{ width: '100%', height: '100%' }}>
                {renderDesktop(v)}
              </div>
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="mobile" title="Mobile — 393 × 852">
          {reordered.map(v => (
            <DCArtboard
              key={`m-${v}`}
              id={`m-${v}`}
              label={titles[v].title + ' · mobile'}
              width={440} height={910}
            >
              <div data-screen-label={`Mobile · ${titles[v].title}`} style={{
                width: '100%', height: '100%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%)',
              }}>
                <PhoneShell>{renderMobile(v)}</PhoneShell>
              </div>
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="createroom" title="Create Room — in The Wire's vocabulary" subtitle="Two-column desktop modal with live preview · mobile bottom sheet">
          <DCArtboard id="cr-desktop" label="Deal slip · desktop modal" width={1440} height={900}>
            <div data-screen-label="Create Room · desktop" style={{ width: '100%', height: '100%' }}>
              <CreateRoomDesktop/>
            </div>
          </DCArtboard>
          <DCArtboard id="cr-mobile" label="Deal slip · mobile sheet" width={440} height={910}>
            <div data-screen-label="Create Room · mobile" style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%)',
            }}>
              <PhoneShell><CreateRoomMobile/></PhoneShell>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="home" title="Home — Choose how to play" subtitle="Editorial newsroom · headline play + modes list + live feed">
          <DCArtboard id="home-desktop" label="Home · desktop" width={1440} height={900}>
            <div data-screen-label="Home · desktop" style={{ width: '100%', height: '100%' }}>
              <HomeDesktop/>
            </div>
          </DCArtboard>
          <DCArtboard id="home-mobile" label="Home · mobile" width={440} height={910}>
            <div data-screen-label="Home · mobile" style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%)',
            }}>
              <PhoneShell><HomeMobile/></PhoneShell>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="game" title="Game Room — mid-hand (Flop, your turn)" subtitle="Felt + seats + community letters + hand log + chat + deal-slip betting footer">
          <DCArtboard id="game-desktop" label="Game · desktop · flop" width={1440} height={900}>
            <div data-screen-label="Game · desktop" style={{ width: '100%', height: '100%' }}>
              <GameDesktop/>
            </div>
          </DCArtboard>
          <DCArtboard id="game-mobile" label="Game · mobile · flop" width={440} height={910}>
            <div data-screen-label="Game · mobile" style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%)',
            }}>
              <PhoneShell><GameMobile/></PhoneShell>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="showdown" title="Showdown — results" subtitle="Headline winner spotlight + scoreboard of words">
          <DCArtboard id="show-desktop" label="Showdown · desktop" width={1440} height={900}>
            <div data-screen-label="Showdown · desktop" style={{ width: '100%', height: '100%' }}>
              <ShowdownDesktop/>
            </div>
          </DCArtboard>
          <DCArtboard id="show-mobile" label="Showdown · mobile" width={440} height={910}>
            <div data-screen-label="Showdown · mobile" style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%)',
            }}>
              <PhoneShell><ShowdownMobile/></PhoneShell>
            </div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      {tweakOpen && (
        <TweakPanel
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

function TweakPanel({ tweaks, setT, onClose }) {
  const variations = [
    { key: 'parlor', label: 'The Parlor', desc: 'Editorial casino · hero room' },
    { key: 'floor',  label: 'The Floor',  desc: 'Cards-as-tables · bird\'s eye' },
    { key: 'ticker', label: 'The Wire',   desc: 'Newsroom · live activity feed' },
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, width: 280, zIndex: 9999,
      background: 'rgba(12,38,32,0.96)', color: '#e8dcc0',
      border: '1px solid rgba(212,175,55,0.3)', borderRadius: 14,
      padding: 18, fontFamily: 'Inter, system-ui', fontSize: 13,
      backdropFilter: 'blur(8px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 16, color: '#f4e4c1', fontWeight: 600 }}>Tweaks</div>
        <div onClick={onClose} style={{ cursor: 'pointer', fontSize: 18, color: 'rgba(232,220,192,0.5)' }}>×</div>
      </div>

      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 1.6, color: 'rgba(232,220,192,0.55)', marginBottom: 8 }}>FEATURED DIRECTION</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {variations.map(v => (
          <div key={v.key} onClick={() => setT('featured', v.key)} style={{
            padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
            background: tweaks.featured === v.key ? 'rgba(212,175,55,0.12)' : 'rgba(0,0,0,0.25)',
            border: `1px solid ${tweaks.featured === v.key ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.1)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: tweaks.featured === v.key ? '#d4af37' : '#f4e4c1', fontWeight: 600 }}>{v.label}</div>
              {tweaks.featured === v.key && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#d4af37', letterSpacing: 1.2 }}>★ FEATURED</span>}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(232,220,192,0.5)', marginTop: 2 }}>{v.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'rgba(232,220,192,0.45)', lineHeight: 1.4, padding: '10px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: 6 }}>
        Direction order on canvas updates to put the featured one first in each section. Double-click an artboard to focus it fullscreen.
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
