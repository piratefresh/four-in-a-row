import { choiceSummaryBadgeClasses, choiceSummaryClasses, selectedChoiceTextClasses, valueBadgeClasses, valuePositionClasses } from "./styles";
import type { WordTileSize, WordTileVariant } from "./types";

type ValueBadgeProps = {
  value: number;
  size: WordTileSize;
  variant: WordTileVariant;
};

export function ValueBadge({ value, size, variant }: ValueBadgeProps) {
  if (variant === "empty") return null;

  return (
    <span className={`absolute font-mono font-bold leading-none ${valuePositionClasses[size]} ${valueBadgeClasses[variant]}`}>
      {value}
    </span>
  );
}

type ChoiceValueBadgeProps = {
  values: number[];
  size: WordTileSize;
  variant: WordTileVariant;
};

export function ChoiceValueBadge({ values, size, variant }: ChoiceValueBadgeProps) {
  if (variant === "empty" || values.length === 0) return null;

  return (
    <div className={`absolute flex items-center gap-1 font-mono font-bold leading-none ${valuePositionClasses[size]} ${valueBadgeClasses[variant]}`}>
      {values.map((value, index) => (
        <span key={`${value}-${index}`}>
          {value}
          {index < values.length - 1 ? <span className="mx-px opacity-50">/</span> : null}
        </span>
      ))}
    </div>
  );
}

type ChoiceSummaryBadgeProps = {
  letters: string[];
  selectedLetter?: string;
  size: WordTileSize;
  variant: WordTileVariant;
  compact?: boolean;
};

export function ChoiceSummaryBadge({ letters, selectedLetter, size, variant, compact = false }: ChoiceSummaryBadgeProps) {
  if (variant === "empty" || letters.length === 0) return null;

  return (
    <div className={`${compact ? "" : "absolute"} flex items-center gap-0.5 rounded font-mono font-semibold leading-none ${choiceSummaryBadgeClasses[variant]} ${choiceSummaryClasses[size]}`}>
      {letters.map((letter, index) => (
        <span key={`${letter}-${index}`} className={letter === selectedLetter ? `font-bold ${selectedChoiceTextClasses[variant]}` : ""}>
          {letter}
          {index < letters.length - 1 ? <span className="mx-px opacity-50">/</span> : null}
        </span>
      ))}
    </div>
  );
}
