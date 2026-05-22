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

export function TileShell({ children, className, disabled, isChoiceHighlight, isDragging, isNew, size, style, variant, ...divProps }: TileShellProps) {
  const borderClass = variant === "empty" ? "border border-dashed" : "border";
  const highlightClass = isChoiceHighlight || disabled ? "ring-2 ring-gold shadow-[0_0_18px_rgba(212,165,74,0.48),0_4px_8px_rgba(0,0,0,0.32)]" : "";
  const stateClass = isNew && variant !== "empty" ? "border-gold-bright text-ink" : "";
  const dragClass = isDragging ? "-translate-y-1 -rotate-[3deg] shadow-2xl" : "";
  const variantStyle = getVariantStyle(variant, isNew);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-[5px] transition-transform duration-150 ${borderClass} ${variantShellClasses[variant]} ${sizeClasses[size]} ${highlightClass} ${stateClass} ${dragClass} ${disabled ? "cursor-not-allowed opacity-80" : ""} ${className ?? ""}`}
      style={{ ...variantStyle, ...style }}
      {...divProps}
    >
      <div className={`pointer-events-none absolute inset-0.5 rounded-[4px] border ${insetClasses[variant]}`} />
      {isNew && variant !== "empty" ? (
        <div className="pointer-events-none absolute -inset-y-6 -left-[95%] z-10 w-[70%] rotate-12 animate-[tile-glint-sweep_0.58s_ease-out_both] bg-[linear-gradient(90deg,transparent_0%,rgba(244,211,94,0)_18%,rgba(255,246,190,0.88)_46%,rgba(212,175,55,0.48)_56%,rgba(244,211,94,0)_82%,transparent_100%)] blur-[0.5px] mix-blend-screen [animation-delay:var(--tile-glint-delay,0s)]" />
      ) : null}
      <div className="relative z-20 flex h-full w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}
