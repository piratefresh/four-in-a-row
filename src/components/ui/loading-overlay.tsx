import { useState } from "react";
import { PokerChipHero } from "@/components/ui/PokerChipHero";

export const WORD_POKER_LOADING_TIPS = [
  "While your opponent is thinking, use that time to plan your best possible word!",
  "Tap the ? below anytime to pull up the FAQ.",
  "Bluffing is a real strategy - betting high with a weak hand can pressure your opponent into folding.",
  "Go for high-value letters and look for 2x or 3x tiles on the board to maximize your score!",
  "Can I bluff in Word Poker? Absolutely! Betting high even when your word isn't great can pressure your opponent into folding and hand you the pot without ever showing your word. Just like real poker - sometimes the bet is stronger than the hand.",
] as const;

interface LoadingOverlayProps {
  message?: string;
  subtitle?: string;
  subtitles?: readonly string[];
  spinning?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export function LoadingOverlay({
  message = "Loading...",
  subtitle,
  subtitles,
  spinning = true,
  actionLabel,
  onAction,
}: LoadingOverlayProps) {
  const [randomSubtitle] = useState(() => {
    if (!subtitles?.length) return undefined;
    return subtitles[Math.floor(Math.random() * subtitles.length)];
  });
  const displaySubtitle = subtitle ?? randomSubtitle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-felt-deep">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 px-6 text-center">
        {spinning ? <PokerChipHero tone="gold" size="lg" spinning /> : null}
        <div className="space-y-3">
          <p className="text-lg font-medium text-cream">{message}</p>
          {displaySubtitle ? (
            <p className="text-sm leading-6 text-cream/75">{displaySubtitle}</p>
          ) : null}
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-md bg-[#114D28] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#176636]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
