import type { CSSProperties } from "react";
import type { WordTileSize, WordTileVariant } from "./types";

export const tileBackgrounds = {
  default: "linear-gradient(145deg, #f6efe0 0%, #ead5a9 58%, #d1b476 100%)",
  community: "linear-gradient(145deg, #14523f 0%, #0d3b2e 48%, #072419 100%)",
  new: "linear-gradient(145deg, #f5c76a 0%, #d4a54a 58%, #a77d2e 100%)",
} satisfies Record<string, string>;

export const sizeClasses: Record<WordTileSize, string> = {
  xs: "h-12 w-9 text-[20px] sm:h-14 sm:w-11 sm:text-[22px]",
  sm: "h-14 w-11 text-[22px] sm:h-16 sm:w-12 sm:text-2xl",
  md: "h-16 w-12 text-2xl sm:h-[72px] sm:w-14 sm:text-[28px]",
  lg: "h-24 w-[72px] text-[44px] sm:h-32 sm:w-24 sm:text-[58px] xl:h-36 xl:w-28 xl:text-[66px]",
};

export const valuePositionClasses: Record<WordTileSize, string> = {
  xs: "bottom-1 right-1 text-[8px]",
  sm: "bottom-1 right-1 text-[8px]",
  md: "bottom-1.5 right-1.5 text-[9px]",
  lg: "bottom-2 right-2 text-xs sm:text-sm xl:text-base",
};

export const compactValueClasses: Record<Exclude<WordTileSize, "lg">, string> = {
  xs: "mt-0.5 rounded px-1 py-0 text-[9px]",
  sm: "mt-0.5 rounded px-1 py-0 text-[9px]",
  md: "mt-0.5 rounded px-1.5 py-0.5 text-[10px]",
};

export const compactChoiceValueClasses: Record<Exclude<WordTileSize, "lg">, string> = {
  xs: "flex items-center gap-0.5 rounded px-1 py-0 text-[8px]",
  sm: "flex items-center gap-0.5 rounded px-1 py-0 text-[9px]",
  md: "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px]",
};

export const compactMetadataSlotClasses: Record<Exclude<WordTileSize, "lg">, string> = {
  xs: "mt-0.5 h-[22px]",
  sm: "mt-0.5 h-[22px]",
  md: "mt-0.5 h-[24px]",
};

export const choiceSummaryClasses: Record<WordTileSize, string> = {
  xs: "bottom-1 left-1 px-1 py-0 text-[8px] whitespace-nowrap",
  sm: "bottom-1 left-1 px-1 py-0 text-[8px] whitespace-nowrap",
  md: "bottom-1.5 left-1.5 px-1 py-0 text-[9px] whitespace-nowrap",
  lg: "bottom-1.5 left-1.5 px-1.5 py-0.5 text-[10px] sm:bottom-2 sm:left-2 sm:text-xs",
};

export const variantShellClasses: Record<WordTileVariant, string> = {
  default: "border-ink/70 text-ink shadow-[0_4px_8px_rgba(0,0,0,0.32),inset_0_-4px_0_rgba(0,0,0,0.1)]",
  community: "border-gold/45 text-cream shadow-[0_6px_14px_rgba(0,0,0,0.38),inset_0_-4px_0_rgba(0,0,0,0.18)]",
  empty: "border-cream/25 bg-cream/[0.08] text-transparent shadow-none",
};

export const insetClasses: Record<WordTileVariant, string> = {
  default: "border-white/45",
  community: "border-white/15",
  empty: "border-cream/10",
};

export const valueBadgeClasses: Record<WordTileVariant, string> = {
  default: "text-ink/65",
  community: "text-cream/70",
  empty: "text-transparent",
};

export const choiceSummaryBadgeClasses: Record<WordTileVariant, string> = {
  default: "bg-cream/75 text-ink/75 ring-1 ring-ink/10",
  community: "bg-felt-deep/55 text-cream/80 ring-1 ring-white/10",
  empty: "text-transparent",
};

export const selectedChoiceTextClasses: Record<WordTileVariant, string> = {
  default: "text-ink",
  community: "text-white",
  empty: "text-transparent",
};

export function getVariantStyle(variant: WordTileVariant, isNew?: boolean): CSSProperties | undefined {
  if (variant === "empty") return undefined;
  if (isNew) return { background: tileBackgrounds.new };
  return { background: tileBackgrounds[variant] };
}
