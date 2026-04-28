import type { HTMLAttributes, ReactNode } from "react";
import { getVariantStyle, insetClasses, sizeClasses, variantShellClasses } from "./styles";
import type { WordTileSize, WordTileVariant } from "./types";

type TileShellProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  isChoiceHighlight?: boolean;
  isDragging?: boolean;
  isNew?: boolean;
  size: WordTileSize;
  variant: WordTileVariant;
} & HTMLAttributes<HTMLDivElement>;

export function TileShell({ children, className, disabled, isChoiceHighlight, isDragging, isNew, size, variant, ...divProps }: TileShellProps) {
  const borderClass = variant === "empty" ? "border border-dashed" : "border";
  const highlightClass = isChoiceHighlight || disabled ? "ring-2 ring-gold shadow-[0_0_18px_rgba(212,165,74,0.48),0_4px_8px_rgba(0,0,0,0.32)]" : "";
  const stateClass = isNew && variant !== "empty" ? "border-gold-bright text-ink" : "";
  const dragClass = isDragging ? "-translate-y-1 -rotate-[3deg] shadow-2xl" : "";

  return (
    <div
      className={`relative flex items-center justify-center rounded-[5px] transition-transform duration-150 ${borderClass} ${variantShellClasses[variant]} ${sizeClasses[size]} ${highlightClass} ${stateClass} ${dragClass} ${disabled ? "cursor-not-allowed opacity-80" : ""} ${className ?? ""}`}
      style={getVariantStyle(variant, isNew)}
      {...divProps}
    >
      <div className={`pointer-events-none absolute inset-0.5 rounded-[4px] border ${insetClasses[variant]}`} />
      {children}
    </div>
  );
}
