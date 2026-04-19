import { cn } from "@/lib/utils";

type PokerChipSize = "xs" | "sm" | "md" | "lg";
type PokerChipTone = "red" | "blue" | "green" | "purple";

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
  { root: string; amount: string; label: string }
> = {
  xs: {
    root: "h-[28px] w-[28px] border-2",
    amount: "text-[8px]",
    label: "mt-px text-[6px]",
  },
  sm: {
    root: "h-[38px] w-[38px] border-2",
    amount: "text-[11px]",
    label: "mt-px text-[8px]",
  },
  md: {
    root: "h-[52px] w-[52px] border-2",
    amount: "text-[13px]",
    label: "mt-0.5 text-[9px]",
  },
  lg: {
    root: "h-[68px] w-[68px] border-[3px]",
    amount: "text-[16px]",
    label: "mt-0.5 text-[10px]",
  },
};

const toneClasses: Record<
  PokerChipTone,
  { root: string; text: string; ring: string }
> = {
  red: {
    root: "bg-[radial-gradient(circle_at_40%_35%,#cc2727,#5a0e0e)]",
    text: "text-[#ffd45b]",
    ring: "border-[#d4af37]/60",
  },
  blue: {
    root: "bg-[radial-gradient(circle_at_40%_35%,#3c9fe8,#103f73)]",
    text: "text-[#d5f2ff]",
    ring: "border-[#d4af37]/55",
  },
  green: {
    root: "bg-[radial-gradient(circle_at_40%_35%,#4ac773,#185432)]",
    text: "text-[#f4d97c]",
    ring: "border-[#d4af37]/55",
  },
  purple: {
    root: "bg-[radial-gradient(circle_at_40%_35%,#9d56ff,#4c1d95)]",
    text: "text-[#ffe2a8]",
    ring: "border-[#d4af37]/55",
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
        "inline-flex select-none items-center justify-center rounded-full border-dashed font-sans font-bold leading-none shadow-[0_3px_8px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] transition-[transform,box-shadow,filter] duration-300",
        chipSize.root,
        chipTone.root,
        chipTone.ring,
        chipTone.text,
        className,
      )}
      >
        <div className="flex flex-col items-center justify-center">
        <span className={chipSize.amount}>
          ${CHIP_NUMBER_FORMATTER.format(amount)}
        </span>
        {label ? (
          <span className={cn(chipSize.label, "uppercase opacity-75")}>
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
