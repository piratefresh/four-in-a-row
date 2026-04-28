import { getLetterValue, getLetterValues } from "../../../../lib/letterValues";
import { CompactMetadata } from "./CompactMetadata";
import { TileContent } from "./TileContent";
import { TileMultiplier } from "./TileMultiplier";
import { TileShell } from "./TileShell";
import type { WordTileProps } from "./types";

function getDisplayLetters(letter?: string, letters?: string[], isChoiceCard?: boolean) {
  if (isChoiceCard) return letters ?? [];
  return letter ? [letter] : [];
}

function getDisplayValues(displayLetters: string[], isChoiceCard: boolean, baseValue?: number, baseValues?: number[]) {
  if (isChoiceCard) {
    const canonicalValues = getLetterValues(displayLetters);
    return canonicalValues.length > 0 ? canonicalValues : baseValues ?? [];
  }

  const canonicalValue = getLetterValue(displayLetters[0]);
  if (typeof canonicalValue === "number") return [canonicalValue];
  return typeof baseValue === "number" ? [baseValue] : [];
}

export function WordTile({
  letter,
  letters,
  baseValue,
  baseValues,
  multiplier,
  showValue = true,
  size = "md",
  variant = "default",
  isChoice = false,
  selectedLetter,
  inlineValue = true,
  isNew = false,
  isDragging = false,
  disabled = false,
  className,
  ...divProps
}: WordTileProps) {
  const isChoiceCard = isChoice || Boolean(letters && letters.length > 1);
  const displayLetters = getDisplayLetters(letter, letters, isChoiceCard);
  const displayValues = getDisplayValues(displayLetters, isChoiceCard, baseValue, baseValues);
  const useCompactMetadata = size !== "lg" && !inlineValue;
  const isChoiceHighlight = isChoiceCard && !selectedLetter && variant === "default";

  const tile = (
    <TileShell
      className={multiplier && variant !== "empty" ? undefined : className}
      disabled={disabled}
      isChoiceHighlight={isChoiceHighlight}
      isDragging={isDragging}
      isNew={isNew}
      size={size}
      variant={variant}
      {...(multiplier && variant !== "empty" ? {} : divProps)}
    >
      <TileContent
        letters={displayLetters}
        values={displayValues}
        isChoiceCard={isChoiceCard}
        selectedLetter={selectedLetter}
        showValue={showValue}
        inlineValue={inlineValue}
        size={size}
        variant={variant}
      />
    </TileShell>
  );

  const renderedTile = multiplier && variant !== "empty" ? (
    <TileMultiplier className={className} multiplier={multiplier} size={size} variant={variant} {...divProps}>
      {tile}
    </TileMultiplier>
  ) : tile;

  if (!useCompactMetadata) return renderedTile;

  return (
    <div className="flex flex-col items-center">
      {renderedTile}
      <CompactMetadata
        letters={displayLetters}
        values={displayValues}
        isChoiceCard={isChoiceCard}
        selectedLetter={selectedLetter}
        showValue={showValue}
        size={size}
        variant={variant}
      />
    </div>
  );
}
