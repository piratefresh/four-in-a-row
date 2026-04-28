import type { HTMLAttributes } from "react";

export type WordTileSize = "xs" | "sm" | "md" | "lg";

export type WordTileVariant = "default" | "community" | "empty";

export type WordTileMultiplier = "2L" | "3L";

export type WordTileProps = {
  letter?: string;
  letters?: string[];
  baseValue?: number;
  baseValues?: number[];
  multiplier?: WordTileMultiplier;
  showValue?: boolean;
  size?: WordTileSize;
  variant?: WordTileVariant;
  isChoice?: boolean;
  selectedLetter?: string;
  inlineValue?: boolean;
  isNew?: boolean;
  isDragging?: boolean;
  disabled?: boolean;
} & HTMLAttributes<HTMLDivElement>;
