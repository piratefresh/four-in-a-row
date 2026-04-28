# WordTile v2

A decomposed, UX-flow-aligned redesign of the Word Poker letter tile component.

## Architecture

The component is split into single-responsibility files under `word-tile-v2/`:

| File | Purpose | ~Lines |
|------|---------|--------|
| `types.ts` | `WordTileProps`, `WordTileSize`, `WordTileVariant`, `WordTileMultiplier` | 24 |
| `styles.ts` | Tailwind class maps, background gradients, `getVariantStyle()` | 83 |
| `TileShell.tsx` | Outer wrapper: bg, border, inset, size, state highlights | 32 |
| `TileContent.tsx` | Letter/choice rendering, value badge placement | 65 |
| `TileBadge.tsx` | `ValueBadge`, `ChoiceValueBadge`, `ChoiceSummaryBadge` | ~80 |
| `TileMultiplier.tsx` | 2L dashed / 3L animated gradient border wrapper | ~50 |
| `CompactMetadata.tsx` | Below-tile metadata slot for `inlineValue={false}` mode | 58 |
| `WordTile.tsx` | Orchestrator: composes sub-components | 94 |
| `index.ts` | Re-exports | 2 |

## Props

```ts
type WordTileProps = {
  letter?: string;            // Single letter to display
  letters?: string[];         // Multi-letter choice (implies isChoice)
  baseValue?: number;         // Single letter score override
  baseValues?: number[];      // Multi-letter score overrides
  multiplier?: "2L" | "3L";  // Letter score multiplier border
  showValue?: boolean;        // default true — show score values
  size?: "xs" | "sm" | "md" | "lg";  // default "md"
  variant?: "default" | "community" | "empty";  // default "default"
  isChoice?: boolean;         // Treat as multi-letter choice card
  selectedLetter?: string;    // Currently chosen letter in a choice card
  inlineValue?: boolean;      // default true — render values inside the tile at all sizes
  isNew?: boolean;            // Gold highlight for freshly revealed community cards
  isDragging?: boolean;       // Lift + slight rotation drag effect
  disabled?: boolean;         // Dimmed appearance, gold ring highlight
} & HTMLAttributes<HTMLDivElement>;
```

## Differences from v1

| Aspect | v1 | v2 |
|--------|----|----|
| File structure | Single 450-line file | 9 files, each <100 lines |
| `variant="hidden"` | Dark solid bg (`#181818`) | `variant="empty"` — dashed border, transparent bg |
| New state | None | `isNew` — gold gradient for fresh tiles |
| Dragging state | None | `isDragging` — lift + rotate transform |
| Typography | Generic `font-bold` | `font-display` (Fraunces 800) for letters, `font-mono` (JetBrains Mono) for values |
| Value placement | Inside tile only on `lg`, compact metadata below on smaller | `inlineValue={true}` (default) renders values inside tile at **all** sizes; `inlineValue={false}` falls back to compact metadata below |
| Border radius | `rounded-[6px]` | `rounded-[5px]` (matches UX doc spec) |
| Design tokens | Hardcoded amber/teal hex | Uses project theme tokens (`-cream`, `-ink`, `-gold`, `-felt-deep`, etc.) |
| Outside-tile values | Variant-dependent opacity (amber/teal/none) | Bold white with drop shadow (`text-white drop-shadow`) |

## Variants

### `default`
Cream paper tile with ink text. Used for player hand tiles.

### `community`
Deep felt-green tile with cream text. Used for shared/community letters on the table.

### `empty`
Transparent background with dashed border. Replaces v1's "hidden" variant. Used for unrevealed community slots. Renders a hidden `?` for accessibility.

## New States

### `isNew`
Applies a gold gradient background (`#f5c76a → #d4a54a → #a77d2e`). Use on community tiles that were just revealed this round, matching the `.letter-tile.new` style from the UX flow doc.

### `isDragging`
Adds `-translate-y-1 -rotate-[3deg] shadow-2xl` with a 150ms transition, matching the UX doc's `.letter-tile.dragging` lift effect.

## `inlineValue` Behavior

| `inlineValue` | Size | Value rendering |
|---------------|------|-----------------|
| `true` (default) | any | Value badge rendered **inside** the tile (absolute bottom-right) |
| `false` | `lg` | No metadata — `lg` has no compact slot |
| `false` | `xs`/`sm`/`md` | Value + choice summary rendered **below** the tile in a compact metadata row, styled as bold white with drop shadow |

## Import

```ts
// Direct import (preferred for tree-shaking)
import { WordTile } from "@/components/rooms/table/word-tile-v2";
import type { WordTileProps, WordTileSize } from "@/components/rooms/table/word-tile-v2";

// Barrel export (convenience)
import { WordTileV2 } from "@/components/rooms";
```

## Showcase

Visit `/dev/tile-showcase` to see v1 and v2 side-by-side with all variants, sizes, and states.

## Migration from v1

The original `WordTile` in `../WordTile.tsx` is untouched. To migrate a consumer:

1. Change `variant="hidden"` to `variant="empty"`
2. Add `inlineValue` if you need the old compact-below behavior
3. Add `isNew` or `isDragging` props as needed
4. Update the import path

v1 remains available at `../WordTile` for gradual adoption.