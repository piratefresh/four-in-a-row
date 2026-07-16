import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type SeatStatus = {
  color: string;
  border: string;
  label: string;
};

const SEAT_STATUS: Record<string, SeatStatus> = {
  waiting: {
    color: "#9ec27a",
    border: "rgba(158,194,122,0.33)",
    label: "WAITING",
  },
  yourturn: { color: "#d4af37", border: "#806316", label: "YOUR TURN" },
  call: { color: "#7ec4cf", border: "rgba(126,196,207,0.45)", label: "CALL" },
  called: { color: "#7ec4cf", border: "rgba(126,196,207,0.45)", label: "CALL" },
  raise: { color: "#e6b450", border: "rgba(230,180,80,0.45)", label: "RAISE" },
  raised: { color: "#e6b450", border: "rgba(230,180,80,0.45)", label: "RAISE" },
  check: { color: "#9ec27a", border: "rgba(158,194,122,0.33)", label: "CHECK" },
  checked: {
    color: "#9ec27a",
    border: "rgba(158,194,122,0.33)",
    label: "CHECK",
  },
  fold: {
    color: "rgba(232,220,192,0.45)",
    border: "rgba(232,220,192,0.24)",
    label: "FOLD",
  },
  folded: {
    color: "rgba(232,220,192,0.45)",
    border: "rgba(232,220,192,0.24)",
    label: "FOLD",
  },
  thinking: {
    color: "#d4af37",
    border: "rgba(212,175,55,0.45)",
    label: "THINKING",
  },
  winner: { color: "#f7df7a", border: "#806316", label: "WINNER" },
};

const BLIND_BADGE_CONFIG = {
  dealer: { label: "D", title: "Dealer Button", className: "bg-[#f4e4c1]" },
  small: { label: "SB", title: "Small Blind", className: "bg-[#d4af37]" },
  big: { label: "BB", title: "Big Blind", className: "bg-[#e07a5f]" },
} as const;

type SeatProps = {
  name: string;
  avatarUrl?: string | null;
  chips: number;
  bet?: number;
  actionLabel?: string;
  chatBubbleMessage?: string | null;
  urgentBubbleMessage?: string | null;
  stickerReaction?: {
    id: string;
    label: string;
    symbol: string;
  } | null;
  isActiveTurn?: boolean;
  isCurrentPlayer?: boolean;
  personality?: string | null;
  avatarSizeClass: string;
  initialsClass: string;
  infoCardClassName?: string;
  betClassName?: string;
  className?: string;
  blindPosition?: "dealer" | "small" | "big";
  isThinking?: boolean;
  mobileInfoPlacement?: "top" | "bottom";
  infoLayout?: "card" | "compact";
  variant?: "default" | "mobile";
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const AI_AVATAR_COLORS: Record<string, string> = {
  "nora vale": "bg-[#7ec4cf]",
  "the anchor": "bg-[#7ec4cf]",
  "ellis march": "bg-[#e07a5f]",
  "the ledger": "bg-[#e07a5f]",
  "jax rook": "bg-[#e6448a]",
  "the blade": "bg-[#e6448a]",
  "mira quill": "bg-[#8b5cf6]",
  "the wildcard": "bg-[#8b5cf6]",
  bold: "bg-[#e6b450]",
  tricky: "bg-[#8b5cf6]",
  steady: "bg-[#9ec27a]",
};

function getAvatarColor(name: string, personality?: string | null) {
  const aiColor =
    AI_AVATAR_COLORS[name.toLowerCase()] ??
    (personality ? AI_AVATAR_COLORS[personality.toLowerCase()] : undefined);

  if (aiColor) return aiColor;

  const colors = [
    "bg-[#a78bfa]",
    "bg-[#7ec4cf]",
    "bg-[#e07a5f]",
    "bg-[#e6448a]",
    "bg-[#9ec27a]",
    "bg-[#e6b450]",
    "bg-[#f4e4c1]",
    "bg-[#c084fc]",
  ];
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function normalizeStatus({
  actionLabel,
  isActiveTurn,
  isCurrentPlayer,
  isThinking,
}: Pick<
  SeatProps,
  "actionLabel" | "isActiveTurn" | "isCurrentPlayer" | "isThinking"
>) {
  if (isCurrentPlayer && isActiveTurn) return "yourturn";
  if (isThinking || isActiveTurn) return "thinking";
  return actionLabel?.toLowerCase().replace(/\s+/g, "") || "waiting";
}

function SeatChip({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute left-1/2 top-[-36px] z-20 -translate-x-1/2",
        className,
      )}
      aria-label={`Bet ${amount}`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f4e4c1] bg-[radial-gradient(circle_at_30%_30%,#ed4747_0%,#c41a1a_60%,#8b0e0e_100%)] font-sans text-[10px] font-extrabold text-[#fff8dc] shadow-[0_2px_4px_rgba(0,0,0,0.5),0_0_0_2px_rgba(255,255,255,0.06)_inset] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
        {amount}
      </div>
    </div>
  );
}

export function Seat({
  name,
  avatarUrl,
  chips,
  bet = 0,
  actionLabel,
  chatBubbleMessage = null,
  urgentBubbleMessage = null,
  stickerReaction = null,
  isActiveTurn = false,
  isCurrentPlayer = false,
  personality,
  avatarSizeClass,
  initialsClass,
  betClassName = "",
  className = "",
  blindPosition,
  isThinking = false,
  variant = "default",
}: SeatProps) {
  const statusKey = normalizeStatus({
    actionLabel,
    isActiveTurn,
    isCurrentPlayer,
    isThinking,
  });
  const status = SEAT_STATUS[statusKey] ?? SEAT_STATUS.waiting;
  const isFolded = statusKey === "fold" || statusKey === "folded";
  const isWinner = statusKey === "winner";
  const badge = blindPosition ? BLIND_BADGE_CONFIG[blindPosition] : null;
  const bubbleMessage = urgentBubbleMessage ?? chatBubbleMessage;
  const isUrgentBubble = urgentBubbleMessage !== null;
  const [bubbleDismissed, setBubbleDismissed] = useState(false);

  useEffect(() => {
    setBubbleDismissed(false);
  }, [bubbleMessage]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center",
        variant === "mobile" && "w-[112px]",
        isFolded && "opacity-50",
        className,
      )}
    >
      <div className="relative">
        {stickerReaction ? (
          <div
            key={stickerReaction.id}
            className="pointer-events-none absolute -top-5 left-1/2 z-40 -translate-x-1/2 -translate-y-full motion-safe:animate-[sticker-pop_3s_ease-out_both]"
            aria-label={stickerReaction.label}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#f7df7a]/50 bg-black/45 text-[38px] shadow-[0_12px_34px_rgba(0,0,0,0.46),0_0_24px_rgba(247,223,122,0.24)] backdrop-blur-[1px] [text-shadow:0_3px_12px_rgba(0,0,0,0.7)]">
              {stickerReaction.symbol}
            </div>
          </div>
        ) : null}

        {bubbleMessage && !bubbleDismissed ? (
          <div
            className="pointer-events-auto absolute -top-4 left-1/2 z-30 w-max max-w-[180px] -translate-x-1/2 -translate-y-full sm:max-w-[220px]"
            onPointerLeave={() => setBubbleDismissed(true)}
          >
            <div
              className={cn(
                "relative rounded-2xl border px-3 py-2 text-center text-[11px] font-bold leading-snug shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:text-[12px]",
                isUrgentBubble
                  ? "border-white bg-white text-black"
                  : "border-[#e8d8aa] bg-[#f7f1dd] text-[#2b1810]",
              )}
            >
              <span className="block break-words">{bubbleMessage}</span>
              <span
                className={cn(
                  "absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r",
                  isUrgentBubble
                    ? "border-white bg-white"
                    : "border-[#e8d8aa] bg-[#f7f1dd]",
                )}
              />
            </div>
          </div>
        ) : null}

        {badge ? (
          <div
            className={cn(
              "absolute -right-1.5 -top-1.5 z-20 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-[1.5px] border-[#3a2815] px-1 text-[#1a1208] shadow-[0_1px_3px_rgba(0,0,0,0.5)]",
              badge.className,
            )}
            title={badge.title}
          >
            <span className="font-mono text-[10px] font-extrabold leading-none">
              {badge.label}
            </span>
          </div>
        ) : null}

        <Avatar
          className={cn(
            "relative z-0 overflow-hidden rounded-full border-0 bg-[#d7d0ff] text-[#0c1410] transition-shadow duration-300",
            isWinner
              ? "shadow-[0_0_0_3px_#0c2620,0_0_0_6px_#f7df7a,0_0_44px_rgba(244,211,94,0.7)] motion-safe:animate-[winner-burst_1.1s_cubic-bezier(0.34,1.56,0.64,1)_both]"
              : isActiveTurn
                ? "shadow-[0_0_0_3px_#0c2620,0_0_0_5px_#d4af37,0_0_22px_rgba(212,175,55,0.35)] animate-seat-breathe"
                : "shadow-[0_0_0_3px_#0c2620,0_4px_10px_rgba(0,0,0,0.5)]",
            variant === "mobile" ? "h-9 w-9" : avatarSizeClass,
          )}
        >
          <AvatarImage src={avatarUrl ?? undefined} alt={`${name} avatar`} />
          <AvatarFallback
            className={cn(
              "font-sans font-extrabold text-[#0c1410]",
              getAvatarColor(name, personality),
              variant === "mobile" ? "text-[12px]" : initialsClass,
            )}
          >
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div
        className={cn(
          "mt-2 max-w-36 truncate text-center font-mono font-semibold uppercase leading-none text-[#f4e4c1]",
          variant === "mobile"
            ? "mt-1.5 max-w-[124px] text-[8px] tracking-[0.16em]"
            : "text-[10px] tracking-[1.4px]",
        )}
      >
        {name}
        {personality ? (
          <span className="ml-1 hidden text-[#d4af37]/70 sm:inline">
            ({personality})
          </span>
        ) : null}
        {isCurrentPlayer ? (
          <span className="text-[#d4af37]"> · YOU</span>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-1.5 rounded font-mono font-semibold uppercase leading-none transition-colors duration-200",
          variant === "mobile"
            ? "mt-1 max-w-[74px] truncate px-1.5 py-[3px] text-[7px] tracking-[0.16em]"
            : "px-2.5 py-[3px] text-[9px] tracking-[1.4px]",
        )}
        style={{
          background: isWinner
            ? "#f7df7a"
            : isCurrentPlayer && isActiveTurn
              ? "#d4af37"
              : "rgba(0,0,0,0.4)",
          border: `1px solid ${isWinner || (isCurrentPlayer && isActiveTurn) ? "#806316" : status.border}`,
          color:
            isWinner || (isCurrentPlayer && isActiveTurn)
              ? "#1a1208"
              : status.color,
        }}
      >
        {isWinner
          ? "WINNER"
          : isCurrentPlayer && isActiveTurn
            ? "YOUR TURN"
            : status.label}
      </div>

      <div
        className={cn(
          "mt-[5px] font-serif font-semibold leading-none text-[#d4af37]",
          variant === "mobile" ? "mt-1 text-[12px]" : "text-[13px]",
        )}
        aria-label={`Player stack: ${chips.toLocaleString()} coins`}
      >
        ${chips.toLocaleString()}
      </div>

      {bet > 0 ? <SeatChip amount={bet} className={betClassName} /> : null}
    </div>
  );
}
