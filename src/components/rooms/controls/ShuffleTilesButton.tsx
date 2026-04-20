import { Shuffle } from "lucide-react";
import { cn } from "../../../lib/utils";

type ShuffleTilesButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
};

export function ShuffleTilesButton({
  onClick,
  disabled,
  className,
  iconClassName,
}: ShuffleTilesButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#404247] bg-[linear-gradient(180deg,#2f3034_0%,#1f2023_100%)] text-[#f6f3ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.28)] transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-150 outline-none hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_24px_rgba(0,0,0,0.32)] active:translate-y-0 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_14px_rgba(0,0,0,0.24)] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45 xs:h-10 xs:w-10 sm:h-11 sm:w-11",
        className,
      )}
      aria-label="Shuffle tiles"
    >
      <Shuffle className={cn("h-4 w-4 xs:h-[18px] xs:w-[18px] sm:h-5 sm:w-5", iconClassName)} />
    </button>
  );
}
