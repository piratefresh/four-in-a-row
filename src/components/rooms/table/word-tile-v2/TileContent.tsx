import { ChoiceSummaryBadge, ChoiceValueBadge, ValueBadge } from "./TileBadge";
import type { WordTileSize, WordTileVariant } from "./types";

type TileContentProps = {
  letters: string[];
  values: number[];
  isChoiceCard: boolean;
  selectedLetter?: string;
  showValue: boolean;
  inlineValue: boolean;
  size: WordTileSize;
  variant: WordTileVariant;
};

function selectedValue(letters: string[], values: number[], selectedLetter: string) {
  const selectedIndex = letters.indexOf(selectedLetter);
  return values[selectedIndex >= 0 ? selectedIndex : 0];
}

export function TileContent({ letters, values, isChoiceCard, selectedLetter, showValue, inlineValue, size, variant }: TileContentProps) {
  if (variant === "empty") {
    return <span aria-hidden="true">?</span>;
  }

  if (!isChoiceCard) {
    const value = values[0];

    return (
      <div className="relative flex h-full w-full items-center justify-center leading-none">
        <span className="translate-y-[-1px] font-display font-extrabold leading-none tracking-[-0.03em]">
          {letters[0]}
        </span>
        {showValue && inlineValue && typeof value === "number" ? <ValueBadge value={value} size={size} variant={variant} /> : null}
      </div>
    );
  }

  if (selectedLetter) {
    const value = selectedValue(letters, values, selectedLetter);

    return (
      <div className="relative flex h-full w-full items-center justify-center leading-none">
        <span className="translate-y-[-1px] font-display font-extrabold leading-none tracking-[-0.03em]">
          {selectedLetter}
        </span>
        <ChoiceSummaryBadge letters={letters} selectedLetter={selectedLetter} size={size} variant={variant} />
        {showValue && inlineValue && typeof value === "number" ? <ValueBadge value={value} size={size} variant={variant} /> : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center leading-none">
      <div className={`flex items-center font-display font-extrabold leading-none tracking-[-0.04em] ${size !== "lg" ? "gap-0 text-[0.86em]" : "gap-1 text-[0.52em] sm:text-[0.48em]"}`}>
        {letters.map((letter, index) => (
          <span key={`${letter}-${index}`}>
            {letter}
            {index < letters.length - 1 ? <span className="mx-0.5 opacity-45">/</span> : null}
          </span>
        ))}
      </div>
      {showValue && inlineValue && values.length > 0 ? <ChoiceValueBadge values={values} size={size} variant={variant} /> : null}
    </div>
  );
}
