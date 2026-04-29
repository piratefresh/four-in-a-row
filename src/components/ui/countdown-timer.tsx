type CountdownTimerProps = {
  label?: string;
  timeRemainingMs: number | null;
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
}: CountdownTimerProps) {
  if (timeRemainingMs === null) return null;

  return (
    <div className="flex flex-col items-center rounded-[10px] border border-[var(--gold,#d4aa32)] bg-[var(--ink,#1e1e1e)]/90 px-2.5 py-1 shadow-[0_0_10px_rgba(212,175,55,0.3)]">
      <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--gold,#d4aa32)]">
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums text-white sm:text-base">
        {formatCountdown(timeRemainingMs)}
      </div>
    </div>
  );
}