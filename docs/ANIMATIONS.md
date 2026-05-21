# Word Poker Game Animations

This document describes all available animations integrated from the Claude design handoff.

## Animation Classes

All animations are available as Tailwind utility classes and can be applied to any element.

### Tile Animations

#### `animate-tile-flip`
- **Usage**: Community tiles flipping into view
- **Duration**: 0.45s
- **Easing**: cubic-bezier(0.34, 1.56, 0.64, 1) - bouncy
- **Effect**: Tiles flip from above with a 3D rotation effect
- **Example**:
```tsx
<div className="gf-tile animate-tile-flip" style={{ animationDelay: '0.16s' }}>
  <WordTile {...tile} />
</div>
```

#### `animate-tile-deal-in`
- **Usage**: New tiles being dealt from the deck
- **Duration**: 0.7s
- **Easing**: cubic-bezier(0.34, 1.56, 0.64, 1) - bouncy
- **Effect**: Tiles fall from above with overshoot, rotate and scale
- **Example**:
```tsx
<div className="animate-tile-deal-in">
  <WordTile {...tile} />
</div>
```

#### `animate-hole-slide-in`
- **Usage**: Hole cards sliding into player's hand
- **Duration**: 0.55s
- **Easing**: cubic-bezier(0.34, 1.56, 0.64, 1) - bouncy
- **Effect**: Slides from bottom-right corner with rotation
- **Example**:
```tsx
<div className="animate-hole-slide-in" style={{ animationDelay: `${index * 0.12}s` }}>
  <WordTile {...tile} />
</div>
```

### Phase & Game State Animations

#### `animate-phase-slide`
- **Usage**: Phase labels transitioning (Pre-flop → Flop → Turn → River)
- **Duration**: 0.5s
- **Easing**: cubic-bezier(0.34, 1.56, 0.64, 1) - bouncy
- **Effect**: Slides down with blur effect
- **Example**:
```tsx
<div key={phaseKey} className="animate-phase-slide">
  <div>Phase {phaseNumber}</div>
  <div>{phaseName}</div>
</div>
```

#### `animate-word-morph`
- **Usage**: Word preview changing as tiles are selected
- **Duration**: 0.55s
- **Easing**: cubic-bezier(0.34, 1.4, 0.64, 1) - bouncy
- **Effect**: Morphs with scale, letter-spacing, and vertical movement
- **Example**:
```tsx
<div key={word} className="animate-word-morph">
  {bestWord}
</div>
```

#### `animate-pot-pop`
- **Usage**: Pot value updating when bets are placed
- **Duration**: 0.8s
- **Easing**: cubic-bezier(0.34, 1.56, 0.64, 1) - bouncy
- **Effect**: Scales up with color flash and glow
- **Example**:
```tsx
<div key={potAmount} className="animate-pot-pop">
  ${pot.toLocaleString()}
</div>
```

### Player & Seat Animations

#### `animate-seat-breathe`
- **Usage**: Active player indicator (whose turn it is)
- **Duration**: 1.6s infinite
- **Easing**: ease-in-out
- **Effect**: Gentle pulsing/breathing effect with brightness and scale
- **Example**:
```tsx
<div className={turn ? "animate-seat-breathe" : ""}>
  <Avatar {...player} />
</div>
```

#### `animate-winner-burst`
- **Usage**: Winner reveal at showdown
- **Duration**: 1.1s
- **Easing**: cubic-bezier(0.34, 1.56, 0.64, 1) - bouncy
- **Effect**: Bursts outward with brightness and scale
- **Example**:
```tsx
<div className={isWinner ? "animate-winner-burst" : ""}>
  <PlayerCard {...winner} />
</div>
```

### UI Element Animations

#### `animate-timer-pulse`
- **Usage**: Turn timer countdown
- **Duration**: 1s infinite
- **Easing**: ease-in-out
- **Effect**: Gentle opacity pulsing
- **Example**:
```tsx
<div className="animate-timer-pulse">
  00:{seconds.toString().padStart(2, '0')}
</div>
```

#### `animate-payout-float`
- **Usage**: Floating "+$280" callout when winning pot
- **Duration**: 3.4s
- **Easing**: ease-out
- **Effect**: Floats upward while fading out
- **Example**:
```tsx
<div className="animate-payout-float">
  +${winAmount}
</div>
```

#### `animate-felt-sweep`
- **Usage**: Subtle gold sweep around the felt table edge
- **Duration**: 9s infinite
- **Easing**: linear
- **Effect**: Slow rotating gradient for ambient table effect
- **Example**:
```tsx
<div className="animate-felt-sweep" style={{
  background: 'conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.25) 30deg, transparent 60deg)',
  mask: 'radial-gradient(circle, transparent 65%, #000 67%, #000 71%, transparent 73%)'
}} />
```

### Chip Animations (Advanced)

#### `animate-chip-to-pot`
- **Usage**: Betting chips flying from player to pot
- **Duration**: 1.4s
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1)
- **CSS Variables**: `--from-x`, `--from-y` (pixel offsets)
- **Example**:
```tsx
<div
  className="animate-chip-to-pot"
  style={{
    '--from-x': '120px',
    '--from-y': '80px',
    animationDelay: `${index * 0.08}s`
  } as React.CSSProperties}
>
  <Chip amount={betAmount} />
</div>
```

#### `animate-chip-to-winner`
- **Usage**: Pot payout chips flying to winner
- **Duration**: 1.6s
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1)
- **CSS Variables**: `--to-x`, `--to-y` (pixel offsets)
- **Example**:
```tsx
<div
  className="animate-chip-to-winner"
  style={{
    '--to-x': '-120px',
    '--to-y': '-80px',
    animationDelay: `${index * 0.1}s`
  } as React.CSSProperties}
>
  <Chip amount={denomination} />
</div>
```

## Usage Tips

### Staggered Animations
For multiple tiles/elements, use `animationDelay` to create a cascade effect:
```tsx
{tiles.map((tile, i) => (
  <div
    key={i}
    className="animate-tile-flip"
    style={{ animationDelay: `${i * 0.13}s` }}
  >
    <WordTile {...tile} />
  </div>
))}
```

### Key-Based Remounting
To replay an animation when content changes, use a key:
```tsx
// This will re-animate every time the word changes
<div key={currentWord} className="animate-word-morph">
  {currentWord}
</div>
```

### Conditional Animations
Apply animations based on state:
```tsx
<div className={isActive ? "animate-seat-breathe" : ""}>
  {/* content */}
</div>
```

### Accessibility
All animations respect `prefers-reduced-motion`:
- Tile animations become simple glint effects
- Infinite animations are disabled
- Movement-based animations are simplified

## Animation Groups in Design File

The design file (`docs/claude_design_handoff/Online Rooms.html`) demonstrates these animation patterns:

1. **Pre-flop → Flop → Turn → River** - Phase transitions with staggered tile reveals
2. **Betting rounds** - Chips flying to pot with dynamic offsets
3. **Showdown** - Winner burst, pot payout, floating score callouts
4. **Turn indicators** - Breathing effect on active player
5. **Real-time updates** - Pot pops, word morphs, phase slides

## CSS Variables

These CSS custom properties are available in your theme:

```css
--animate-tile-flip
--animate-tile-deal-in
--animate-hole-slide-in
--animate-phase-slide
--animate-word-morph
--animate-pot-pop
--animate-seat-breathe
--animate-winner-burst
--animate-timer-pulse
--animate-payout-float
--animate-felt-sweep
--animate-chip-to-pot
--animate-chip-to-winner
```

Use them with Tailwind's `animation-` utilities or in custom CSS.

## Current Integration Status

✅ **Integrated**:
- `animate-tile-flip` - Used in RoomCommunityStrip.tsx
- Basic tile reveal animations

🚧 **Ready to Use**:
- `animate-hole-slide-in` - For player hand tiles
- `animate-seat-breathe` - For active turn indicator
- `animate-pot-pop` - For pot value updates
- `animate-phase-slide` - For game phase transitions
- `animate-word-morph` - For word preview changes
- `animate-winner-burst` - For showdown winner
- `animate-payout-float` - For win amount callouts

All animations are fully implemented in `src/styles.css` and ready to use throughout your application.
