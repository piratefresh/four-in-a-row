import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PokerChip } from "../table/PokerChip";

export const PHASE_BADGE_OPPONENT_POSITION_CLASS: Record<
  "top" | "left" | "right",
  string
> = {
  top: "left-1/2 top-[22%] -translate-x-1/2",
  left: "left-1/2 top-[43%] -translate-x-[155%] -translate-y-1/2",
  right: "left-1/2 top-[43%] translate-x-[55%] -translate-y-1/2",
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type PhasePlayerBadgeProps = {
  name: string;
  avatarUrl?: string | null;
  chips: number;
  bet?: number;
  actionLabel?: string;
  isActiveTurn?: boolean;
  isCurrentPlayer?: boolean;
  personality?: string | null;
  avatarSizeClass: string;
  initialsClass: string;
  infoCardClassName?: string;
  betClassName?: string;
  className?: string;
  blindPosition?: "dealer" | "small" | "big";
};

export function PhasePlayerBadge({
  name,
  avatarUrl,
  chips,
  bet = 0,
  actionLabel,
  isActiveTurn = false,
  isCurrentPlayer = false,
  personality,
  avatarSizeClass,
  initialsClass,
  infoCardClassName = "",
  betClassName = "",
  className = "",
  blindPosition,
}: PhasePlayerBadgeProps) {
  const blindBadgeConfig = {
    dealer: { label: "D", title: "Dealer Button" },
    small: { label: "SB", title: "Small Blind" },
    big: { label: "BB", title: "Big Blind" },
  };

  const badge = blindPosition ? blindBadgeConfig[blindPosition] : null;

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <div className="relative">
        <Avatar
          className={`relative z-0 overflow-hidden rounded-full border bg-[#d7d0ff] ${
            isActiveTurn
              ? "border-[#f4d37a] shadow-[0_0_0_3px_rgba(244,211,122,0.32),0_0_24px_rgba(244,211,122,0.55),0_8px_24px_rgba(0,0,0,0.35)]"
              : "border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          } ${avatarSizeClass}`}
        >
          <AvatarImage src={avatarUrl ?? undefined} alt={`${name} avatar`} />
          <AvatarFallback
            className={`bg-gradient-to-br from-[#cfc7ff] via-[#aebdff] to-[#80a7ff] font-semibold text-white ${initialsClass}`}
          >
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        {badge && (
          <div
            className="absolute -left-[10px] -top-3 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-[#f4e4c1] text-[#2b1810] shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
            title={badge.title}
          >
            <span className="text-[11px] font-bold leading-none">
              {badge.label}
            </span>
          </div>
        )}
      </div>
      <div
        className={`border border-slate-800 relative z-10 -mt-3 flex min-w-20 flex-col items-center justify-center py-2 text-center ${
          isActiveTurn
            ? "bg-black"
            : "bg-black shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
        } ${infoCardClassName}`}
      >
        <div className="max-w-full truncate text-[11px] font-medium leading-none text-white sm:text-[14px]">
          {name}
          {personality ? (
            <span className="ml-1 text-[#a0a0ff]">({personality})</span>
          ) : null}
          {isCurrentPlayer ? (
            <span className="ml-1 text-[#d7c27a]">(you)</span>
          ) : null}
        </div>
        <div className="mt-1 text-[10px] font-medium leading-none text-[#f3f1ea] sm:text-[13px]">
          ${chips}
        </div>
        {actionLabel ? (
          <div className="mt-1 text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-[#b8b19a] sm:text-[11px]">
            {actionLabel}
          </div>
        ) : null}
      </div>
      {bet > 0 && (
        <PokerChip
          amount={bet}
          label="BET"
          size="sm"
          tone="blue"
          className={`absolute left-0 top-1/2 z-20 -translate-x-1/4 -translate-y-1/2 ${betClassName}`}
        />
      )}
    </div>
  );
}
