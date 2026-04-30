import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export type TipItem = {
  label: string;
  detail: string;
};

export const MAIN_MENU_TIPS: TipItem[] = [
  {
    label: "Power-ups",
    detail: "Unlock at level 3 with score boosts, peeks, and table tricks.",
  },
  {
    label: "Multipliers",
    detail: "A 3L tile can turn one strong letter into the swing tile.",
  },
  {
    label: "Betting",
    detail: "Check when it is free, call when the word is worth chasing.",
  },
  {
    label: "Showdown",
    detail: "Long words win more often, but high-value tiles can steal pots.",
  },
];

type TipsProps = {
  tips?: TipItem[];
  intervalMs?: number;
  className?: string;
};

export function Tips({
  tips = MAIN_MENU_TIPS,
  intervalMs = 30_000,
  className,
}: TipsProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const safeTips = tips.length > 0 ? tips : MAIN_MENU_TIPS;
  const tip = safeTips[tipIndex % safeTips.length]!;

  useEffect(() => {
    if (safeTips.length <= 1) return;

    const timer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % safeTips.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, safeTips.length]);

  return (
    <aside
      aria-live="polite"
      className={cn(
        "rounded-[8px] border border-dashed border-cream/15 bg-cream/5 px-4 py-3 text-center text-xs leading-5 text-gold",
        className,
      )}
    >
      <div className="flex items-start justify-center gap-2">
        <Lightbulb className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} />
        <p>
          <span className="font-semibold">{tip.label}:</span> {tip.detail}
        </p>
      </div>
    </aside>
  );
}
