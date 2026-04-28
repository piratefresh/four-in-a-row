import { ChoiceSummaryBadge } from "./TileBadge";
import { compactChoiceValueClasses, compactMetadataSlotClasses, compactValueClasses, valueBadgeClasses } from "./styles";
import type { WordTileSize, WordTileVariant } from "./types";

type CompactMetadataProps = {
  letters: string[];
  values: number[];
  isChoiceCard: boolean;
  selectedLetter?: string;
  showValue: boolean;
  size: Exclude<WordTileSize, "lg">;
  variant: WordTileVariant;
};

function getSelectedValue(letters: string[], values: number[], selectedLetter: string) {
  const selectedIndex = letters.indexOf(selectedLetter);
  return values[selectedIndex >= 0 ? selectedIndex : 0];
}

export function CompactMetadata({ letters, values, isChoiceCard, selectedLetter, showValue, size, variant }: CompactMetadataProps) {
  if (variant === "empty") {
    return <div className={compactMetadataSlotClasses[size]} />;
  }

  const selectedValue = selectedLetter ? getSelectedValue(letters, values, selectedLetter) : undefined;
  const shouldShowSingleValue = showValue && !isChoiceCard && typeof values[0] === "number";
  const shouldShowSelectedValue = showValue && isChoiceCard && selectedLetter && typeof selectedValue === "number";
  const shouldShowChoiceValues = showValue && isChoiceCard && !selectedLetter && values.length > 0;
  const outsideValueClass = "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]";

  return (
    <div className={`${compactMetadataSlotClasses[size]} flex flex-col items-center justify-start`}>
      <div className="flex flex-col items-center gap-0.5 leading-none">
        {shouldShowSelectedValue ? (
          <span className={`font-mono font-bold leading-none ${compactValueClasses[size]} ${outsideValueClass}`}>
            {selectedValue}
          </span>
        ) : shouldShowChoiceValues ? (
          <div className={`${compactChoiceValueClasses[size]} font-mono font-bold leading-none ${outsideValueClass}`}>
            {values.map((value, index) => (
              <span key={`${value}-${index}`}>
                {value}
                {index < values.length - 1 ? <span className="mx-px opacity-50">/</span> : null}
              </span>
            ))}
          </div>
        ) : shouldShowSingleValue ? (
          <span className={`font-mono font-bold leading-none ${compactValueClasses[size]} ${outsideValueClass}`}>
            {values[0]}
          </span>
        ) : null}
        {selectedLetter && isChoiceCard ? (
          <ChoiceSummaryBadge letters={letters} selectedLetter={selectedLetter} size={size} variant={variant} compact />
        ) : null}
      </div>
    </div>
  );
}
