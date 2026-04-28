import { cn } from "@/lib/utils";

type PokerChipSize = "xs" | "sm" | "md" | "lg";
export type PokerChipTone = "red" | "green" | "blue" | "black" | "purple";

interface PokerChipProps {
  amount: number;
  label?: string | null;
  size?: PokerChipSize;
  tone?: PokerChipTone;
  className?: string;
}

const CHIP_NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

const sizeClasses: Record<
  PokerChipSize,
  { root: string; amount: string; label: string; valueArea: string }
> = {
  xs: {
    root: "h-[28px] w-[28px] border-2",
    amount: "text-[8px]",
    label: "mt-px text-[6px]",
    valueArea: "size-[80%]",
  },
  sm: {
    root: "h-[38px] w-[38px] border-2",
    amount: "text-[10px]",
    label: "mt-px text-[6px]",
    valueArea: "size-[80%]",
  },
  md: {
    root: "h-[52px] w-[52px] border-2",
    amount: "text-[13px]",
    label: "mt-0.5 text-[9px]",
    valueArea: "size-[80%]",
  },
  lg: {
    root: "h-[68px] w-[68px] border-[3px]",
    amount: "text-[16px]",
    label: "mt-0.5 text-[10px]",
    valueArea: "size-[80%]",
  },
};

const toneClasses: Record<
  PokerChipTone,
  { root: string; accent: string }
> = {
  red: {
    root:
      "border-chip-red bg-[repeating-conic-gradient(from_0deg,var(--color-cream)_0deg_10deg,var(--color-chip-red)_10deg_30deg)]",
    accent: "bg-chip-red",
  },
  blue: {
    root:
      "border-chip-blue bg-[repeating-conic-gradient(from_0deg,var(--color-cream)_0deg_10deg,var(--color-chip-blue)_10deg_30deg)]",
    accent: "bg-chip-blue",
  },
  black: {
    root:
      "border-ink bg-[repeating-conic-gradient(from_0deg,var(--color-cream)_0deg_10deg,var(--color-ink)_10deg_30deg)]",
    accent: "bg-ink",
  },
  green: {
    root:
      "border-chip-green bg-[repeating-conic-gradient(from_0deg,var(--color-cream)_0deg_10deg,var(--color-chip-green)_10deg_30deg)]",
    accent: "bg-chip-green",
  },
  purple: {
    root:
      "border-[#6d3fa6] bg-[repeating-conic-gradient(from_0deg,var(--color-cream)_0deg_10deg,rgb(109_63_166)_10deg_30deg)]",
    accent: "bg-[#6d3fa6]",
  },
};

export function PokerChip({
  amount,
  label = "BET",
  size = "sm",
  tone = "red",
  className,
}: PokerChipProps) {
  const chipSize = sizeClasses[size];
  const chipTone = toneClasses[tone];

  return (
    <div
      className={cn(
        "relative inline-flex select-none items-center justify-center overflow-hidden rounded-full border p-[3px] font-sans font-bold leading-none shadow-[0_3px_8px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.24)] transition-[transform,box-shadow,filter] duration-300",
        chipSize.root,
        chipTone.root,
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-[14%] rounded-full border border-cream/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.26),inset_0_-2px_5px_rgba(0,0,0,0.22)]",
          chipTone.accent,
        )}
      />
      <div
        className={cn(
          "relative z-10 flex flex-col items-center justify-center rounded-full border border-ink/10 bg-cream px-0.5 text-center text-ink shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.7)]",
          chipSize.valueArea,
        )}
      >
        <span className={cn(chipSize.amount, "max-w-full leading-none")}>
          ${CHIP_NUMBER_FORMATTER.format(amount)}
        </span>
        {label ? (
          <span className={cn(chipSize.label, "uppercase text-ink/70")}>
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
