import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  avatarSizeClass: string;
  initialsClass: string;
  infoCardClassName?: string;
  betClassName?: string;
  className?: string;
};

export function PhasePlayerBadge({
  name,
  avatarUrl,
  chips,
  bet = 0,
  avatarSizeClass,
  initialsClass,
  infoCardClassName = "",
  betClassName = "",
  className = "",
}: PhasePlayerBadgeProps) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <Avatar
        className={`relative z-0 overflow-hidden rounded-full border border-white/25 bg-[#d7d0ff] shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${avatarSizeClass}`}
      >
        <AvatarImage src={avatarUrl ?? undefined} alt={`${name} avatar`} />
        <AvatarFallback
          className={`bg-gradient-to-br from-[#cfc7ff] via-[#aebdff] to-[#80a7ff] font-semibold text-white ${initialsClass}`}
        >
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div
        className={`relative z-10 -mt-3 flex min-w-[112px] flex-col items-center justify-center bg-[#2c2c2f] px-3 py-1 text-center shadow-[0_6px_16px_rgba(0,0,0,0.35)] sm:min-w-[136px] sm:-mt-4 ${infoCardClassName}`}
      >
        <div className="max-w-full truncate text-[11px] font-medium leading-none text-white sm:text-[14px]">
          {name}
        </div>
        <div className="mt-1 text-[10px] font-medium leading-none text-[#f3f1ea] sm:text-[13px]">
          ${chips}
        </div>
      </div>
      {bet > 0 && (
        <div
          className={`absolute left-0 top-1/2 z-20 -translate-x-1/4 -translate-y-1/2 rounded-full bg-[#2b2b2e] px-3 py-2 text-center text-[10px] font-medium leading-tight text-white shadow-[0_8px_16px_rgba(0,0,0,0.3)] sm:px-4 sm:py-3 sm:text-[12px] ${betClassName}`}
        >
          ${bet}
          <br />
          Bet
        </div>
      )}
    </div>
  );
}
