import { cn } from "@/lib/utils";

type FeedbackRatingProps = {
  value: number | null;
  onChange: (value: number) => void;
  compact?: boolean;
  disabled?: boolean;
};

const RATINGS = [1, 2, 3, 4, 5] as const;

export function FeedbackRating({
  value,
  onChange,
  compact,
  disabled,
}: FeedbackRatingProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Feedback rating"
      className={cn("flex flex-wrap gap-3", compact ? "gap-2.5" : "gap-3")}
    >
      {RATINGS.map((rating) => {
        const isSelected = value === rating;
        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(rating)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed font-mono font-semibold transition-[background-color,border-color,color,opacity,transform,box-shadow] duration-150 focus-visible:ring-[3px] focus-visible:ring-gold/35 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
              compact ? "size-12 text-sm" : "size-14 text-base",
              isSelected
                ? "border-gold-bright bg-gold text-felt-deep shadow-[0_0_18px_rgba(212,165,74,0.25)]"
                : "border-cream/24 bg-black/12 text-cream/58 hover:border-gold/70 hover:text-gold",
            )}
          >
            {rating}
          </button>
        );
      })}
    </div>
  );
}
