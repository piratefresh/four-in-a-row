import type { CSSProperties, HTMLAttributes } from "react";
import { getLetterValue, getLetterValues } from "../../../lib/letterValues";

export type WordTileSize = "xs" | "sm" | "md" | "lg";
type WordTileVariant = "default" | "community" | "hidden";

export type WordTileProps = {
  letter?: string;
  letters?: string[];
  baseValue?: number;
  baseValues?: number[];
  multiplier?: "2L" | "3L";
  showValue?: boolean;
  size?: WordTileSize;
  variant?: WordTileVariant;
  isChoice?: boolean;
  selectedLetter?: string;
  disabled?: boolean;
} & HTMLAttributes<HTMLDivElement>;

const sizeClasses: Record<WordTileSize, string> = {
  xs: "h-16 w-16 text-xl",
  sm: "h-12 w-12 text-2xl",
  md: "h-[52px] w-[52px] text-2xl",
  lg: "h-[90px] w-[90px] text-[48px]",
};

const valueClasses: Record<WordTileSize, string> = {
  xs: "",
  sm: "",
  md: "",
  lg: "bottom-1 right-1 px-0.5 py-px text-[11px] sm:bottom-2 sm:right-2 sm:px-1.5 sm:py-0.5 sm:text-[1.35rem]",
};

const choiceSummaryClasses: Record<WordTileSize, string> = {
  xs: "px-1 py-0 text-[8px] whitespace-nowrap",
  sm: "px-1 py-0 text-[8px] whitespace-nowrap",
  md: "px-1 py-0 text-[9px] whitespace-nowrap",
  lg: "bottom-1 left-1 px-1 py-0 text-[9px] sm:bottom-2 sm:left-1.5 sm:px-1 sm:py-0.5 sm:text-[10px]",
};

const defaultTileBackground =
  "linear-gradient(145deg, #f7e8c5 0%, #ecd7aa 45%, #d9be85 100%)";

const communityTileBackground =
  "linear-gradient(145deg, #2a3d52 0%, #1f2e40 48%, #1a2332 100%)";

const variantShellClasses: Record<WordTileVariant, string> = {
  default:
    "border-amber-900/60 text-amber-950 shadow-[0_8px_16px_rgba(15,23,42,0.45)]",
  community:
    "border-teal-950/70 text-[#f3fffc] shadow-[0_10px_20px_rgba(15,118,110,0.35)]",
  hidden: "bg-[#181818] text-transparent shadow-lg",
};

const insetClasses: Record<WordTileVariant, string> = {
  default: "border-amber-100/50",
  community: "border-white/15",
  hidden: "",
};

const valueBadgeClasses: Record<WordTileVariant, string> = {
  default: "bg-black/45 text-white ring-1 ring-white/10",
  community: "bg-slate-950/60 text-[#f3fffc] ring-1 ring-white/10",
  hidden: "",
};

const choiceSummaryBadgeClasses: Record<WordTileVariant, string> = {
  default: "bg-amber-100/60 text-amber-950/80",
  community: "bg-slate-950/45 text-[#d9fff7]/90 ring-1 ring-white/10",
  hidden: "",
};

const choiceTextClasses: Record<WordTileVariant, string> = {
  default: "text-amber-950",
  community: "text-[#f3fffc]",
  hidden: "",
};

const selectedChoiceTextClasses: Record<WordTileVariant, string> = {
  default: "text-amber-950",
  community: "text-white",
  hidden: "",
};

const inlineCompactValueClasses: Record<Exclude<WordTileSize, "lg">, string> = {
  xs: "mt-0.5 rounded px-1 py-0 text-[10px]",
  sm: "mt-0.5 rounded px-1 py-0 text-[10px]",
  md: "mt-0.5 rounded px-1 py-0 text-[11px]",
};

const inlineCompactChoiceLetterClasses: Record<
  Exclude<WordTileSize, "lg">,
  string
> = {
  xs: "gap-0 text-[0.9em]",
  sm: "gap-0 text-[0.9em]",
  md: "gap-0.5 text-[0.82em]",
};

const inlineCompactChoiceValueClasses: Record<
  Exclude<WordTileSize, "lg">,
  string
> = {
  xs: "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px]",
  sm: "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px]",
  md: "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px]",
};

const compactMetadataSlotClasses: Record<
  Exclude<WordTileSize, "lg">,
  string
> = {
  xs: "mt-0.5 h-[22px]",
  sm: "mt-0.5 h-[22px]",
  md: "mt-0.5 h-[24px]",
};

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
  disabled = false,
  className,
  ...divProps
}: WordTileProps) {
  const isChoiceCard = isChoice || (letters && letters.length > 1);
  const displayLetters = isChoiceCard
    ? (letters ?? [])
    : letter
      ? [letter]
      : [];
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
  const variantStyle: CSSProperties | undefined =
    variant === "default"
      ? { background: defaultTileBackground }
      : variant === "community"
        ? { background: communityTileBackground }
        : undefined;
  const usesInlineCompactValue = size !== "lg";
  const inlineValueClass =
    size === "lg" ? null : inlineCompactValueClasses[size];
  const inlineChoiceLetterClass =
    size === "lg" ? null : inlineCompactChoiceLetterClasses[size];
  const inlineChoiceValueClass =
    size === "lg" ? null : inlineCompactChoiceValueClasses[size];

  const tileContent = (
    <>
      {variant !== "hidden" && (
        <div
          className={`pointer-events-none absolute inset-0.5 rounded-lg border ${insetClasses[variant]}`}
        />
      )}
      {isChoiceCard ? (
        <div className="relative flex h-full w-full items-center justify-center">
          {selectedLetter ? (
            <>
              <div className="flex flex-col items-center justify-center leading-none">
                <span
                  className={`font-bold leading-none tracking-wide ${
                    usesInlineCompactValue ? "translate-y-[2px]" : ""
                  }`}
                >
                  {selectedLetter}
                </span>
              </div>
              {!usesInlineCompactValue ? (
                <div
                  className={`absolute flex items-center gap-0.5 rounded font-semibold leading-none ${choiceSummaryBadgeClasses[variant]} ${choiceSummaryClasses[size]}`}
                >
                  {displayLetters?.map((displayLetter, index) => (
                    <span
                      key={index}
                      className={
                        displayLetter === selectedLetter
                          ? `font-bold ${selectedChoiceTextClasses[variant]}`
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
              ) : null}
              {showValue && displayValues && !usesInlineCompactValue ? (
                <span
                  className={`absolute rounded px-1.5 py-0.5 font-bold leading-none ${valueClasses[size]} ${valueBadgeClasses[variant]}`}
                >
                  {displayValues[displayLetters?.indexOf(selectedLetter) ?? 0]}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center gap-0.5 leading-none">
                <div
                  className={`flex items-center font-bold leading-none ${usesInlineCompactValue ? (inlineChoiceLetterClass ?? "") : "gap-1 text-[1.35rem] sm:text-[1.55rem]"} ${choiceTextClasses[variant]}`}
                >
                  {displayLetters?.map((displayLetter, index) => (
                    <span key={index}>
                      {displayLetter}
                      {index < (displayLetters?.length ?? 0) - 1 && (
                        <span className="mx-0.5 opacity-50">/</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {showValue &&
              displayValues &&
              displayValues.length > 0 &&
              !usesInlineCompactValue ? (
                <div
                  className={`absolute flex items-center gap-1 font-bold leading-none ${valueClasses[size]} ${valueBadgeClasses[variant]}`}
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
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="font-bold leading-none tracking-wide">
            {displayLetters[0]}
          </span>
          {showValue &&
          typeof displayValues[0] === "number" &&
          !usesInlineCompactValue ? (
            <span
              className={`absolute rounded px-1.5 py-0.5 font-bold leading-none ${valueClasses[size]} ${valueBadgeClasses[variant]}`}
            >
              {displayValues[0]}
            </span>
          ) : null}
        </div>
      )}
    </>
  );

  const tileElement =
    multiplier && variant !== "hidden" ? (
      multiplier === "3L" ? (
        <div
          className={`relative flex items-center justify-center rounded-[6px] ${sizeClasses[size]} ${className ?? ""}`}
          style={{
            padding: "2px",
          }}
          {...divProps}
        >
          <div
            className="absolute inset-0 rounded-[6px] animate-[spin_2s_linear_infinite]"
            style={{
              background:
                "linear-gradient(135deg, #8b5cf6, #ec4899, #f59e0b, #8b5cf6)",
              backgroundSize: "400% 400%",
            }}
          />
          <div
            className={`relative flex h-full w-full items-center justify-center rounded-[4px] border ${variantShellClasses[variant]}`}
            style={variantStyle}
          >
            {tileContent}
          </div>
        </div>
      ) : (
        <div
          className={`relative flex items-center justify-center rounded-[6px] ${sizeClasses[size]} ${className ?? ""}`}
          style={{
            padding: "3px",
          }}
          {...divProps}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            style={{ overflow: "visible" }}
          >
            <rect
              x="1.5"
              y="1.5"
              width="calc(100% - 3px)"
              height="calc(100% - 3px)"
              rx="6"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeDasharray="8 6"
              style={{
                filter: "drop-shadow(0 0 10px rgba(245, 158, 11, 0.5))",
              }}
            />
          </svg>
          <div
            className={`relative flex h-full w-full items-center justify-center rounded-[4px] border ${variantShellClasses[variant]}`}
            style={variantStyle}
          >
            {tileContent}
          </div>
        </div>
      )
    ) : (
      <div
        className={`relative flex items-center justify-center ${variant === "hidden" ? "rounded-[6px]" : "rounded-[6px] border"} ${variantShellClasses[variant]} ${sizeClasses[size]} ${className ?? ""}`}
        style={variantStyle}
        {...divProps}
      >
        {tileContent}
      </div>
    );

  const compactMetadata =
    usesInlineCompactValue && variant !== "hidden" ? (
      <div className="flex flex-col items-center gap-0.5 leading-none">
        {showValue &&
        (selectedLetter
          ? typeof displayValues[
              displayLetters?.indexOf(selectedLetter) ?? 0
            ] === "number"
          : isChoiceCard
            ? displayValues.length > 0
            : typeof displayValues[0] === "number") ? (
          selectedLetter ? (
            <span
              className={`font-bold leading-none ${inlineValueClass ?? ""} ${valueBadgeClasses[variant]}`}
            >
              {displayValues[displayLetters?.indexOf(selectedLetter) ?? 0]}
            </span>
          ) : isChoiceCard ? (
            <div
              className={`${inlineChoiceValueClass ?? ""} font-bold leading-none ${valueBadgeClasses[variant]}`}
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
          ) : (
            <span
              className={`font-bold leading-none ${inlineValueClass ?? ""} ${valueBadgeClasses[variant]}`}
            >
              {displayValues[0]}
            </span>
          )
        ) : null}
        {selectedLetter && isChoiceCard ? (
          <div
            className={`flex items-center gap-0.5 rounded font-semibold leading-none ${choiceSummaryBadgeClasses[variant]} ${choiceSummaryClasses[size]}`}
          >
            {displayLetters?.map((displayLetter, index) => (
              <span
                key={index}
                className={
                  displayLetter === selectedLetter
                    ? `font-bold ${selectedChoiceTextClasses[variant]}`
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
        ) : null}
      </div>
    ) : null;

  let renderedTile = tileElement;

  // Wrap choice cards or disabled tiles with glowing gold border
  if (
    (isChoiceCard && !selectedLetter && variant === "default") ||
    (disabled && variant === "default")
  ) {
    renderedTile = (
      <div
        className={`relative flex items-center justify-center rounded-[6px] border-2 ${sizeClasses[size]} ${disabled ? "cursor-not-allowed" : ""} ${className ?? ""}`}
        style={{
          background: defaultTileBackground,
          borderColor: "#f59e0b",
          boxShadow:
            "0 0 20px rgba(245, 158, 11, 0.6), 0 0 40px rgba(245, 158, 11, 0.3), 0 8px 16px rgba(15,23,42,0.45)",
        }}
        {...divProps}
      >
        <div className="pointer-events-none absolute inset-0.5 rounded-lg border border-amber-100/50" />
        {tileContent}
      </div>
    );
  }

  if (compactMetadata) {
    return (
      <div className="flex flex-col items-center">
        {renderedTile}
        <div
          className={`${size === "lg" ? "" : compactMetadataSlotClasses[size]} flex flex-col items-center justify-start`}
        >
          {compactMetadata}
        </div>
      </div>
    );
  }

  if (usesInlineCompactValue) {
    return (
      <div className="flex flex-col items-center">
        {renderedTile}
        <div className={compactMetadataSlotClasses[size]} />
      </div>
    );
  }

  return renderedTile;
}
