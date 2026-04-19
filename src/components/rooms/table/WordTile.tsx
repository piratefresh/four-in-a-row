import type { HTMLAttributes } from "react";
import { getLetterValue, getLetterValues } from "../../../lib/letterValues";

type WordTileSize = "xs" | "sm" | "md" | "lg";
type WordTileVariant = "default" | "community" | "hidden";

export type WordTileProps = {
  letter?: string;
  letters?: string[];
  baseValue?: number;
  baseValues?: number[];
  showValue?: boolean;
  size?: WordTileSize;
  variant?: WordTileVariant;
  isChoice?: boolean;
  selectedLetter?: string;
} & HTMLAttributes<HTMLDivElement>;

const sizeClasses: Record<WordTileSize, string> = {
  xs: "h-16 w-16 text-xl",
  sm: "h-18 w-18 text-2xl",
  md: "h-20 w-20 text-2xl",
  lg: "h-28 w-28 text-6xl",
};

const valueClasses: Record<WordTileSize, string> = {
  xs: "bottom-1 right-1 text-sm",
  sm: "bottom-1 right-1.5 text-sm",
  md: "bottom-1 right-2 text-base",
  lg: "bottom-1 right-1 px-0.5 py-px text-[10px] sm:bottom-2 sm:right-2 sm:px-1.5 sm:py-0.5 sm:text-xl",
};

const choiceSummaryClasses: Record<WordTileSize, string> = {
  xs: "bottom-1 left-1 px-1 py-0 text-[9px]",
  sm: "bottom-1 left-1 px-1 py-0 text-[9px]",
  md: "bottom-1.5 left-1.5 px-1 py-0 text-[10px]",
  lg: "bottom-1 left-1 px-1 py-0 text-[9px] sm:bottom-2 sm:left-1.5 sm:px-1 sm:py-0.5 sm:text-[10px]",
};

export function WordTile({
  letter,
  letters,
  baseValue,
  baseValues,
  showValue = true,
  size = "md",
  variant = "default",
  isChoice = false,
  selectedLetter,
  className,
  ...divProps
}: WordTileProps) {
  const styleByVariant: Record<WordTileVariant, string> = {
    default:
      "border-amber-900/60 text-amber-950 shadow-[0_8px_16px_rgba(15,23,42,0.45)]",
    community:
      "border-red-800/70 bg-red-600 text-white shadow-[0_8px_16px_rgba(127,29,29,0.45)]",
    hidden: "bg-[#181818] text-transparent shadow-lg",
  };

  const insetByVariant: Record<WordTileVariant, string> = {
    default: "border-amber-100/50",
    community: "border-red-300/35",
    hidden: "",
  };

  const isChoiceCard = isChoice || (letters && letters.length > 1);
  const displayLetters = isChoiceCard ? (letters ?? []) : letter ? [letter] : [];
  const canonicalValues = isChoiceCard
    ? getLetterValues(displayLetters)
    : getLetterValue(displayLetters[0]) !== undefined
      ? [getLetterValue(displayLetters[0])!]
      : [];
  const displayValues =
    canonicalValues && canonicalValues.length > 0
      ? canonicalValues
      : isChoiceCard
        ? (baseValues ?? [])
        : typeof baseValue === "number"
          ? [baseValue]
          : [];

  const tileContent = (
    <>
      {variant !== "hidden" && (
        <div
          className={`pointer-events-none absolute inset-0.5 rounded-lg border ${insetByVariant[variant]}`}
        />
      )}
      {isChoiceCard ? (
        <div className="relative flex h-full w-full items-center justify-center">
          {selectedLetter ? (
            <>
              <span className="font-bold leading-none tracking-wide">
                {selectedLetter}
              </span>
              <div
                className={`absolute flex items-center gap-0.5 rounded bg-amber-100/60 font-semibold leading-none text-amber-950/80 ${choiceSummaryClasses[size]}`}
              >
                {displayLetters?.map((displayLetter, index) => (
                  <span
                    key={index}
                    className={
                      displayLetter === selectedLetter
                        ? "font-bold text-amber-950"
                        : ""
                    }
                  >
                    {displayLetter}
                    {index < (displayLetters?.length ?? 0) - 1 && (
                      <span className="mx-px">/</span>
                    )}
                  </span>
                ))}
              </div>
              {showValue && displayValues && (
                <span
                  className={`absolute rounded px-1.5 py-0.5 font-bold leading-none ${valueClasses[size]} ${
                    variant === "community"
                      ? "bg-red-800/80 text-white"
                      : "bg-amber-200/80 text-amber-950"
                  }`}
                >
                  {displayValues[displayLetters?.indexOf(selectedLetter) ?? 0]}
                </span>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 text-base font-bold leading-none">
                {displayLetters?.map((displayLetter, index) => (
                  <span key={index}>
                    {displayLetter}
                    {index < (displayLetters?.length ?? 0) - 1 && (
                      <span className="mx-0.5 opacity-50">/</span>
                    )}
                  </span>
                ))}
              </div>
              {showValue && displayValues && displayValues.length > 0 && (
                <div
                  className={`absolute flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${valueClasses[size]} ${
                    variant === "community"
                      ? "bg-red-800/80 text-white"
                      : "bg-amber-200/90 text-amber-950"
                  }`}
                >
                  {displayValues.map((value, index) => (
                    <span key={index}>
                      {value}
                      {index < displayValues.length - 1 && (
                        <span className="mx-px">/</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <span className="font-bold leading-none tracking-wide">
            {displayLetters[0]}
          </span>
          {showValue && typeof displayValues[0] === "number" && (
            <span
              className={`absolute rounded px-1.5 py-0.5 font-bold leading-none ${valueClasses[size]} ${
                variant === "community"
                  ? "bg-red-800/80 text-white"
                  : "bg-amber-200/80 text-amber-950"
              }`}
            >
              {displayValues[0]}
            </span>
          )}
        </>
      )}
    </>
  );

  // Wrap choice cards with animated border using Tailwind
  if (isChoiceCard && !selectedLetter && variant === "default") {
    return (
      <div
        className={`relative rounded-[6px] border border-transparent ${sizeClasses[size]} ${className ?? ""}`}
        style={{
          background:
            "linear-gradient(145deg, #f7e8c5 0%, #ecd7aa 45%, #d9be85 100%) padding-box, conic-gradient(from var(--border-angle), theme(colors.amber.600/.48) 80%, theme(colors.amber.400) 86%, theme(colors.amber.200) 90%, theme(colors.amber.400) 94%, theme(colors.amber.600/.48)) border-box",
          animation: "border 4s linear infinite",
        }}
        {...divProps}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          {tileContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center ${variant === "hidden" ? "rounded-2xl" : "rounded-[6px] border"} ${styleByVariant[variant]} ${sizeClasses[size]} ${className ?? ""}`}
      style={
        variant === "default"
          ? {
              background:
                "linear-gradient(145deg, #f7e8c5 0%, #ecd7aa 45%, #d9be85 100%)",
            }
          : variant === "hidden"
            ? {
                width: "45px",
                height: "60px",
              }
            : undefined
      }
      {...divProps}
    >
      {tileContent}
    </div>
  );
}
