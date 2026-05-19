import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PokerChip } from "../table/PokerChip";
import { TypingIndicator } from "./TypingIndicator";

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

function getAvatarColor(name: string) {
  const colors = [
    "bg-gradient-to-br from-purple-500 to-purple-700",
    "bg-gradient-to-br from-blue-500 to-blue-700",
    "bg-gradient-to-br from-green-500 to-green-700",
    "bg-gradient-to-br from-amber-500 to-amber-700",
    "bg-gradient-to-br from-rose-500 to-rose-700",
    "bg-gradient-to-br from-cyan-500 to-cyan-700",
    "bg-gradient-to-br from-pink-500 to-pink-700",
    "bg-gradient-to-br from-indigo-500 to-indigo-700",
  ];
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

type PhasePlayerBadgeProps = {
  name: string;
  avatarUrl?: string | null;
  chips: number;
  bet?: number;
  actionLabel?: string;
  chatBubbleMessage?: string | null;
  urgentBubbleMessage?: string | null;
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
};

export function PhasePlayerBadge({
  name,
  avatarUrl,
  chips,
  bet = 0,
  actionLabel,
  chatBubbleMessage = null,
  urgentBubbleMessage = null,
  isActiveTurn = false,
  isCurrentPlayer = false,
  personality,
  avatarSizeClass,
  initialsClass,
  infoCardClassName = "",
  betClassName = "",
  className = "",
  blindPosition,
  isThinking = false,
  mobileInfoPlacement = "bottom",
  infoLayout = "card",
}: PhasePlayerBadgeProps) {
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const blindBadgeConfig = {
    dealer: { label: "D", title: "Dealer Button" },
    small: { label: "SB", title: "Small Blind" },
    big: { label: "BB", title: "Big Blind" },
  };

  const badge = blindPosition ? blindBadgeConfig[blindPosition] : null;
  const bubbleMessage = urgentBubbleMessage ?? chatBubbleMessage;
  const isUrgentBubble = urgentBubbleMessage !== null;
  const mobileInfoPopupClassName =
    mobileInfoPlacement === "top" ? "bottom-full mb-2" : "top-full mt-2";
  const statusLabel =
    isCurrentPlayer && isActiveTurn
      ? "Your Turn"
      : isThinking
        ? "Thinking..."
        : actionLabel
          ? actionLabel
          : isActiveTurn
            ? "Thinking..."
            : "Waiting";

  useEffect(() => {
    if (infoLayout !== "card" || !mobileInfoOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMobileInfoOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileInfoOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [infoLayout, mobileInfoOpen]);

  const infoCardContent = (
    <>
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
      {isThinking ? (
        <TypingIndicator className="mt-1 text-amber-400" />
      ) : actionLabel ? (
        <div className="mt-1 text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-[#b8b19a] sm:text-[11px]">
          {actionLabel}
        </div>
      ) : null}
    </>
  );

  return (
    <div
      ref={rootRef}
      className={`relative flex flex-col items-center ${className}`}
    >
      <div className="relative">
        {bubbleMessage ? (
          <div className="pointer-events-none absolute -top-4 left-1/2 z-30 w-max max-w-[180px] -translate-x-1/2 -translate-y-full sm:max-w-[220px]">
            <div
              className={`relative rounded-2xl border px-3 py-2 text-center text-[11px] font-bold leading-snug shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:text-[12px] ${
                isUrgentBubble
                  ? "border-white bg-white text-black"
                  : "border-[#e8d8aa] bg-[#f7f1dd] text-[#2b1810]"
              }`}
            >
              <span className="block break-words">{bubbleMessage}</span>
              <span
                className={`absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r ${
                  isUrgentBubble
                    ? "border-white bg-white"
                    : "border-[#e8d8aa] bg-[#f7f1dd]"
                }`}
              />
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className={infoLayout === "card" ? "xs:pointer-events-none" : ""}
          onClick={
            infoLayout === "card"
              ? () => setMobileInfoOpen((open) => !open)
              : undefined
          }
          aria-expanded={infoLayout === "card" ? mobileInfoOpen : undefined}
          aria-label={
            infoLayout === "card"
              ? `Show player info for ${name}`
              : `${name} avatar`
          }
        >
          <Avatar
            className={`relative z-0 overflow-hidden rounded-full border bg-[#d7d0ff] ${
              isActiveTurn
                ? "border-gold-bright shadow-[0_0_0_3px_rgba(212,165,74,0.32),0_0_24px_rgba(212,165,74,0.55),0_8px_24px_rgba(0,0,0,0.35)] animate-pulse"
                : "border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            } ${avatarSizeClass}`}
          >
            <AvatarImage src={avatarUrl ?? undefined} alt={`${name} avatar`} />
            <AvatarFallback
              className={`${getAvatarColor(name)} font-semibold text-white ${initialsClass}`}
            >
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        </button>
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
        {infoLayout === "card" && mobileInfoOpen ? (
          <div
            className={`absolute left-1/2 z-50 w-max max-w-[160px] -translate-x-1/2 rounded-lg border border-slate-800 bg-black/96 px-2.5 py-2 text-center shadow-[0_10px_28px_rgba(0,0,0,0.45)] xs:hidden ${mobileInfoPopupClassName}`}
          >
            {infoCardContent}
          </div>
        ) : null}
      </div>
      {infoLayout === "card" ? (
        <div
          className={`border border-slate-800 relative z-10 -mt-3 hidden min-w-20 flex-col items-center justify-center py-2 text-center xs:flex ${
            isActiveTurn
              ? "bg-black"
              : "bg-black shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
          } ${infoCardClassName}`}
        >
          {infoCardContent}
        </div>
      ) : null}
      {bet > 0 && (
        <PokerChip
          amount={bet}
          label="BET"
          size="sm"
          tone="blue"
          className={`absolute left-0 top-1/2 z-20 -translate-x-1/4 -translate-y-1/2 ${betClassName}`}
        />
      )}
      {infoLayout === "compact" ? (
        <div className="mt-1.5 flex max-w-30 flex-col items-center text-center sm:max-w-40">
          <div className="max-w-full truncate font-mono text-[11px] font-semibold uppercase leading-none text-[#f3f1ea] sm:text-[13px]">
            {name}
            {isCurrentPlayer ? (
              <span className="ml-1 text-[#d7c27a]">(you)</span>
            ) : null}
          </div>
          {isActiveTurn && isCurrentPlayer ? (
            <div className="mt-1 rounded-full bg-[#f4d37a] px-2.5 py-0.5 text-[9px] font-bold uppercase leading-none text-[#2b1810] shadow-[0_0_10px_rgba(244,211,122,0.45),0_1px_6px_rgba(0,0,0,0.35)] sm:text-[11px] sm:px-3 sm:py-1">
              {statusLabel}
            </div>
          ) : (
            <div
              className={`mt-1 max-w-full truncate rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase leading-none shadow-[0_1px_6px_rgba(0,0,0,0.35)] sm:text-[11px] sm:px-3 sm:py-1 ${
                isThinking || isActiveTurn
                  ? "bg-[#1a4a2a] text-[#f0a64a]"
                  : actionLabel
                    ? "bg-[#1a4a2a] text-[#d4af37]"
                    : "bg-[#1a4a2a] text-[#d4af37]/75"
              }`}
            >
              {statusLabel}
            </div>
          )}
          <div className="mt-0.5 text-[10px] font-medium leading-none text-[#f3f1ea]/80 sm:text-[12px]">
            ${chips}
          </div>
        </div>
      ) : null}
    </div>
  );
}
