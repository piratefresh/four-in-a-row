import { Slider } from "@/components/ui/slider";

type RaiseAmountSliderProps = {
  value: number;
  options: number[];
  callAmount?: number;
  disabled?: boolean;
  onChange: (amount: number) => void;
};

export function RaiseAmountSlider({
  value,
  options,
  callAmount = 0,
  disabled = false,
  onChange,
}: RaiseAmountSliderProps) {
  if (options.length <= 1) {
    return null;
  }

  const selectedIndex = Math.max(0, options.indexOf(value));
  const maxIndex = options.length - 1;

  return (
    <div className="flex w-full items-center gap-3 sm:px-4 sm:py-3">
      <div className="flex shrink-0 items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#b8b19a]">
        <span>
          {callAmount > 0 ? `To call $${callAmount}` : "Raise amount"}
        </span>
        <span className="text-[#f0cf5a]">${value}</span>
      </div>

      <div className="min-w-0 flex-1 px-1">
        <Slider
          min={0}
          max={maxIndex}
          step={1}
          value={selectedIndex}
          disabled={disabled}
          onValueChange={(nextIndex) => {
            const nextAmount = options[nextIndex];
            if (nextAmount !== undefined) {
              onChange(nextAmount);
            }
          }}
          className="w-full"
          aria-label="Raise amount"
        />

        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-[#8f8876]">
          <span>${options[0]}</span>
          <span>${options[maxIndex]}</span>
        </div>
      </div>
    </div>
  );
}
