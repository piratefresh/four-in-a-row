// v3-ticker.jsx — Variation 3: The Ticker (newsroom / trading floor)

const TICKER_BG = 'linear-gradient(180deg, #0a1d17 0%, #051410 100%)';

function TickerChrome({ children }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: TICKER_BG, color: '#e8dcc0',
      fontFamily: 'Inter, system-ui', position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>{children}</div>
  );
}

function tickerColor(kind) {
  if (kind === 'big') return '#d4af37';
  if (kind === 'raise') return '#ff5d4e';
  if (kind === 'fold') return 'rgba(232,220,192,0.4)';
  if (kind === 'play') return '#9ec27a';
  if (kind === 'call') return '#7ec4cf';
  if (kind === 'pot') return '#e6b450';
  return 'rgba(232,220,192,0.5)';
}

function TickerRow({ ev, dense = false }) {
  const c = tickerColor(ev.kind);
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 12,
      padding: dense ? '6px 0' : '10px 0',
      borderBottom: '1px solid rgba(212,175,55,0.06)',
      fontFamily: 'JetBrains Mono', fontSize: dense ? 11 : 12,
    }}>
      <span style={{ color: 'rgba(232,220,192,0.35)', width: 44, flexShrink: 0 }}>{ev.t}</span>
      <span style={{ color: c, width: 6, flexShrink: 0 }}>●</span>
      <span style={{ color: 'rgba(232,220,192,0.55)', flexShrink: 0 }}>{ev.room}</span>
      <span style={{ color: '#f4e4c1', flex: 1, fontFamily: 'Inter' }}>{ev.msg}</span>
      {ev.pts && (
        <span style={{
          fontFamily: '"Noto Serif", serif', fontSize: dense ? 14 : 16, color: '#d4af37', fontWeight: 600,
        }}>+{ev.pts}</span>
      )}
    </div>
  );
}

function TickerRoomCard({ room, compact = false }) {
  const isFull = room.status === 'full';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: compact ? '1fr 60px 80px 60px' : '1.6fr 1fr 0.9fr 0.8fr 60px',
      gap: 14, alignItems: 'center',
      padding: '14px 18px', borderRadius: 10,
      background: room.hot ? 'rgba(212,175,55,0.05)' : 'rgba(0,0,0,0.25)',
      border: `1px solid ${room.hot ? 'rgba(212,175,55,0.25)' : 'rgba(212,175,55,0.08)'}`,
      cursor: isFull ? 'not-allowed' : 'pointer',
      opacity: isFull ? 0.55 : 1,
      marginBottom: 8,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f4e4c1' }}>{room.name}</div>
          <StatusDot status={room.status}/>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 1.1, color: 'rgba(232,220,192,0.45)', marginTop: 3 }}>{room.sub}</div>
      </div>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AvatarStack list={room.avatars} size={20} max={4}/>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'rgba(232,220,192,0.5)' }}>{room.taken}/{room.seats}</span>
        </div>
      )}
      <div>
        <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 16, color: '#d4af37', fontWeight: 600, lineHeight: 1 }}>${room.pot.toLocaleString()}</div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.4)', marginTop: 2, letterSpacing: 1 }}>POT</div>
      </div>
      <Sparkline values={room.potTrend} w={compact ? 60 : 80} h={26} color="#d4af37"/>
      {!compact && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: room.status === 'live' ? '#d4af37' : 'rgba(232,220,192,0.55)' }}>{room.nextHand}</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'rgba(232,220,192,0.4)', marginTop: 2, letterSpacing: 1 }}>NEXT</div>
        </div>
      )}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2L8 5L2 8Z" fill="#d4af37"/></svg>
      </div>
    </div>
  );
}
