import { cn } from "@/lib/utils";

type PokerChipHeroSize = "sm" | "md" | "lg" | "xl";
type PokerChipHeroTone = "gold" | "red" | "blue" | "green" | "purple";

interface PokerChipHeroProps {
  size?: PokerChipHeroSize;
  tone?: PokerChipHeroTone;
  spinning?: boolean;
  className?: string;
}

const sizeClasses: Record<PokerChipHeroSize, string> = {
  sm: "h-7 w-7 border-2",
  md: "h-10 w-10 border-[3px]",
  lg: "h-16 w-16 border-[3px]",
  xl: "h-24 w-24 border-4",
};

const toneClasses: Record<PokerChipHeroTone, { bg: string; border: string; inner: string }> = {
  gold: {
    bg: "bg-[radial-gradient(circle_at_40%_35%,#f5c76a,#d4a54a,#b8892e)]",
    border: "border-felt-deep/80",
    inner: "border-felt-deep/30",
  },
  red: {
    bg: "bg-[radial-gradient(circle_at_40%_35%,#c23d3d,#8a2b2b,#5c1a1a)]",
    border: "border-gold/60",
    inner: "border-gold/25",
  },
  blue: {
    bg: "bg-[radial-gradient(circle_at_40%_35%,#3b6cb5,#2b4f8a,#1a3460)]",
    border: "border-gold/55",
    inner: "border-gold/25",
  },
  green: {
    bg: "bg-[radial-gradient(circle_at_40%_35%,#4ac773,#2c7a4f,#1a5232)]",
    border: "border-gold/55",
    inner: "border-gold/25",
  },
  purple: {
    bg: "bg-[radial-gradient(circle_at_40%_35%,#9d56ff,#6b3ab5,#4c1d95)]",
    border: "border-gold/55",
    inner: "border-gold/25",
  },
};

export function PokerChipHero({
  size = "md",
  tone = "gold",
  spinning = false,
  className,
}: PokerChipHeroProps) {
  const chipSize = sizeClasses[size];
  const chipTone = toneClasses[tone];

  return (
    <div
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full border-dashed shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.25)]",
        chipSize,
        chipTone.bg,
        chipTone.border,
        spinning && "animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-[60%] w-[60%] items-center justify-center rounded-full border-dashed",
          chipTone.inner,
        )}
      />
    </div>
  );
}
