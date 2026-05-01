type CountdownTimerProps = {
  label?: string;
  timeRemainingMs: number | null;
  variant?: "default" | "action";
  size?: "compact" | "large";
};

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function CountdownTimer({
  label = "Timer",
  timeRemainingMs,
  variant = "default",
  size = "compact",
}: CountdownTimerProps) {
  if (timeRemainingMs === null) return null;

  const tone = getTimerTone(timeRemainingMs, variant);
  const sizeClassName =
    size === "large"
      ? "min-h-[4.25rem] min-w-[7.5rem] px-4 py-2 sm:min-h-[5rem] sm:min-w-[9rem] sm:px-5 sm:py-1"
      : "min-h-[2.75rem] min-w-[4.75rem] px-2.5 py-0";
  const labelClassName =
    size === "large" ? "text-[10px] sm:text-xs" : "text-[9px]";
  const timeClassName =
    size === "large" ? "text-2xl sm:text-3xl" : "text-sm sm:text-base";

  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded-[10px] border tabular-nums shadow-[0_0_14px_rgba(0,0,0,0.28)] ${sizeClassName} ${tone.containerClassName}`}
    >
      <div
        className={`font-medium uppercase tracking-[0.18em] ${labelClassName} ${tone.labelClassName}`}
      >
        {label}
      </div>
      <div
        className={`font-semibold leading-none ${timeClassName} ${tone.timeClassName}`}
      >
        {formatCountdown(timeRemainingMs)}
      </div>
    </div>
  );
}

function getTimerTone(
  timeRemainingMs: number,
  variant: CountdownTimerProps["variant"],
) {
  if (variant !== "action") {
    return {
      containerClassName:
        "border-[var(--gold,#d4aa32)] bg-[var(--ink,#1e1e1e)]/90",
      labelClassName: "text-[var(--gold,#d4aa32)]",
      timeClassName: "text-white",
    };
  }

  if (timeRemainingMs > 15_000) {
    return {
      containerClassName: "border-emerald-300/70 bg-emerald-950/90",
      labelClassName: "text-emerald-200",
      timeClassName: "text-emerald-50",
    };
  }

  if (timeRemainingMs > 5_000) {
    return {
      containerClassName: "border-amber-300/75 bg-amber-950/90",
      labelClassName: "text-amber-200",
      timeClassName: "text-amber-50",
    };
  }

  return {
    containerClassName: "border-red-300/80 bg-red-950/90",
    labelClassName: "text-red-200",
    timeClassName: "text-red-50",
  };
}
