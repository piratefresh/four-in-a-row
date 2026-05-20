import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type HomeCardTone = "recommended" | "online" | "offline" | "standings";
type HomeCardSize = "default" | "compact";

type ModeCardProps = {
  symbol: ReactNode;
  tag: string;
  label: string;
  description: string;
  badge?: string;
  stat: string;
  tone?: HomeCardTone;
  size?: HomeCardSize;
  disabled?: boolean;
  onSelect?: () => void;
};

const symbolColors: Record<HomeCardTone, string> = {
  recommended: "text-brass/70 border-brass/15",
  online: "text-emerald-300 border-emerald-300/10",
  offline: "text-cyan-300 border-cyan-300/10",
  standings: "text-brass/70 border-brass/15",
};

const cardColors: Record<HomeCardTone, string> = {
  recommended:
    "bg-black/25 border-brass/10",
  online:
    "bg-black/25 border-brass/10",
  offline:
    "bg-black/25 border-brass/10",
  standings:
    "bg-black/25 border-brass/10",
};

const sizeConfig: Record<HomeCardSize, { circle: string; symbol: string; title: string; desc: string; padding: string; gap: string; gridCols: string }> = {
  default: {
    circle: "size-[46px]",
    symbol: "text-[22px]",
    title: "text-[22px]",
    desc: "text-xs leading-[1.4]",
    padding: "px-[22px] py-[18px]",
    gap: "gap-[18px]",
    gridCols: "grid-cols-[46px_1fr_auto]",
  },
  compact: {
    circle: "size-10",
    symbol: "text-lg",
    title: "text-lg",
    desc: "text-[11px]",
    padding: "px-3.5 py-3",
    gap: "gap-3",
    gridCols: "grid-cols-[40px_1fr_auto]",
  },
};

export function ModeCard({
  symbol,
  tag,
  label,
  description,
  badge,
  stat,
  tone = "online",
  size = "default",
  disabled = false,
  onSelect,
}: ModeCardProps) {
  const sz = sizeConfig[size];
  const isCompact = size === "compact";

  const content = (
    <>
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-full border bg-black/40 font-mono transition-colors",
          !disabled &&
            "group-hover/mode:border-brass/30 group-hover/mode:text-brass group-focus-visible/mode:border-brass/30 group-focus-visible/mode:text-brass",
          sz.circle,
          sz.symbol,
          symbolColors[tone],
        )}
      >
        {symbol}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "font-mono uppercase tracking-[0.14em] text-cream/55",
            isCompact ? "text-[8px]" : "text-[9px] tracking-[0.18em]",
          )}>
            {tag}
          </span>
          {badge ? (
            <span className={cn(
              "rounded-[3px] border border-brass/25 bg-black/25 font-mono font-bold uppercase text-brass/75 transition-colors",
              !disabled &&
                "group-hover/mode:border-brass group-hover/mode:bg-brass group-hover/mode:text-[#1a1208] group-focus-visible/mode:border-brass group-focus-visible/mode:bg-brass group-focus-visible/mode:text-[#1a1208]",
              isCompact
                ? "px-1 py-px text-[7px] tracking-[0.12em]"
                : "px-1.5 py-0.5 text-[8px] tracking-[0.14em]",
            )}>
              {badge}
            </span>
          ) : null}
        </div>
        <div className={cn(
          "mt-0.5 font-serif font-semibold not-italic italic text-cream",
          sz.title,
        )}>
          {label}
        </div>
        <div className={cn("mt-0.5 text-cream/55", sz.desc)}>
          {description}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {size === "default" ? (
          <>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream/55">
              {stat}
            </span>
            <div
              className={cn(
                "grid size-[34px] place-items-center rounded-full border border-brass/20 bg-black/20 transition-colors",
                !disabled &&
                  "group-hover/mode:border-brass/35 group-hover/mode:bg-brass/12 group-focus-visible/mode:border-brass/35 group-focus-visible/mode:bg-brass/12",
              )}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className="text-brass"
              >
                <path d="M2 2L8 5L2 8Z" fill="currentColor" />
              </svg>
            </div>
          </>
        ) : (
          <span
            className={cn(
              "text-brass/65 text-base transition-colors",
              !disabled &&
                "group-hover/mode:text-brass group-focus-visible/mode:text-brass",
            )}
          >
            &#8250;
          </span>
        )}
      </div>
    </>
  );

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative grid w-full items-center rounded-[10px] border text-left transition-colors",
        "group/mode focus-visible:outline-none",
        sz.gridCols,
        sz.gap,
        sz.padding,
        cardColors[tone],
        !disabled &&
          "cursor-pointer hover:border-brass/40 hover:bg-linear-to-r hover:from-brass/10 hover:to-brass/4 focus-visible:border-brass/40 focus-visible:bg-linear-to-r focus-visible:from-brass/10 focus-visible:to-brass/4",
        disabled && "cursor-not-allowed opacity-65",
      )}
    >
      {content}
    </button>
  );
}
