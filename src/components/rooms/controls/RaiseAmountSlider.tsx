import { Slider } from "@/components/ui/slider";

type RaiseAmountSliderProps = {
  value: number;
  options: number[];
  callAmount?: number;
  disabled?: boolean;
  onChange: (amount: number) => void;
  orientation?: "horizontal" | "vertical";
};

export function RaiseAmountSlider({
  value,
  options,
  callAmount = 0,
  disabled = false,
  onChange,
  orientation = "horizontal",
}: RaiseAmountSliderProps) {
  if (options.length <= 1) {
    return null;
  }

  const selectedIndex = Math.max(0, options.indexOf(value));
  const maxIndex = options.length - 1;
  const label = callAmount > 0 ? `To call $${callAmount}` : "Raise amount";

  if (orientation === "vertical") {
    return (
      <div className="flex h-full min-h-[144px] w-[58px] shrink-0 flex-col items-center rounded-2xl border border-[#2a2a2a] bg-[linear-gradient(180deg,rgba(18,18,18,0.96)_0%,rgba(10,10,10,0.98)_100%)] px-1.5 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_30px_rgba(0,0,0,0.32)]">
        <div className="text-[8px] font-medium uppercase tracking-[0.12em] text-[#b8b19a]">
          Raise
        </div>
        <div className="mt-1 text-[13px] font-semibold text-[#f0cf5a]">
          ${value}
        </div>
        <div className="mt-2 flex min-h-0 flex-1 flex-col items-center justify-center">
          <span className="mb-1.5 text-[8px] font-medium text-[#8f8876]">
            ${options[maxIndex]}
          </span>
          <Slider
            min={0}
            max={maxIndex}
            step={1}
            value={[selectedIndex]}
            disabled={disabled}
            orientation="vertical"
            onValueChange={(nextIndex) => {
              const resolvedIndex = Array.isArray(nextIndex)
                ? (nextIndex[0] ?? 0)
                : nextIndex;
              const nextAmount = options[resolvedIndex];
              if (nextAmount !== undefined) {
                onChange(nextAmount);
              }
            }}
            className="h-full min-h-[88px]"
            aria-label="Raise amount"
          />
          <span className="mt-1.5 text-[8px] font-medium text-[#8f8876]">
            ${options[0]}
          </span>
        </div>
        <div className="mt-1.5 text-[8px] font-medium uppercase tracking-[0.06em] text-[#b8b19a]">
          {callAmount > 0 ? `Call $${callAmount}` : "Raise"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-2 xs:gap-3 sm:px-4 sm:py-3">
      <div className="flex shrink-0 items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#b8b19a] xs:gap-3 xs:text-[11px] xs:tracking-[0.18em]">
        <span>{label}</span>
        <span className="text-[#f0cf5a]">${value}</span>
      </div>

      <div className="min-w-0 flex-1 px-0.5 xs:px-1">
        <Slider
          min={0}
          max={maxIndex}
          step={1}
          value={[selectedIndex]}
          disabled={disabled}
          onValueChange={(nextIndex) => {
            const resolvedIndex = Array.isArray(nextIndex)
              ? (nextIndex[0] ?? 0)
              : nextIndex;
            const nextAmount = options[resolvedIndex];
            if (nextAmount !== undefined) {
              onChange(nextAmount);
            }
          }}
          className="w-full"
          aria-label="Raise amount"
        />

        <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-[#8f8876] xs:mt-2 xs:text-[11px]">
          <span>${options[0]}</span>
          <span>${options[maxIndex]}</span>
        </div>
      </div>
    </div>
  );
}
