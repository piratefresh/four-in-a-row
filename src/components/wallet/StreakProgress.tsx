import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Coins, Flame } from "lucide-react";

// Matches convex/loginStreaks.ts getStreakCoinAmount
const DAILY_REWARDS = [0, 100, 150, 200, 300, 500, 750, 1000];


export function StreakProgress() {
  const streakData = useQuery(api.loginStreaks.getMyStreak);

  if (streakData === undefined) {
    return (
      <section className="rounded-2xl border border-cream/10 bg-felt-light/30 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-cream/10" />
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 w-10 rounded-full bg-cream/10" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const currentStreak = streakData.currentStreak;
  const isActive = currentStreak > 0;

  return (
    <section className="rounded-2xl border border-gold/20 bg-felt-light/30 p-5 shadow-[0_0_24px_rgba(212,165,74,0.06)]">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15">
          <Flame className="h-4 w-4 text-gold-bright" />
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cream">
            Daily Login Streak
          </h2>
          <p className="text-xs text-game-muted">
            {isActive
              ? `Day ${currentStreak} — Keep it going!`
              : "Log in daily to earn bonus coins"}
          </p>
        </div>
      </div>

      {/* Day tracker dots */}
      <div className="mb-3 flex items-center justify-between gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = i + 1;
          const isCompleted = currentStreak > day;
          const isCurrent = currentStreak === day;
          const reward = DAILY_REWARDS[day];

          return (
            <div
              key={day}
              className="relative flex flex-1 flex-col items-center gap-1"
            >
              {/* Day circle */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isCompleted
                    ? "bg-gold text-felt-deep shadow-[0_0_12px_rgba(212,165,74,0.3)]"
                    : isCurrent
                      ? "border-2 border-gold-bright bg-gold/20 text-gold-bright shadow-[0_0_16px_rgba(245,199,106,0.25)]"
                      : "border border-cream/15 bg-felt-deep/60 text-game-muted"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  day
                )}
              </div>
              {/* Reward label */}
              <span
                className={`text-[10px] font-medium tabular-nums ${
                  isCompleted || isCurrent
                    ? "text-gold-bright"
                    : "text-game-muted"
                }`}
              >
                +{reward.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Next reward info */}
      {isActive && currentStreak < 7 && (
        <div className="flex items-center justify-between rounded-xl border border-gold/15 bg-felt-deep/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-gold" />
            <span className="text-xs text-cream/80">Tomorrow's reward</span>
          </div>
          <span className="font-mono text-sm font-bold text-gold-bright">
            +{DAILY_REWARDS[currentStreak + 1].toLocaleString()}
          </span>
        </div>
      )}

      {currentStreak >= 7 && (
        <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-gold-bright" />
            <span className="text-xs text-cream/80">Max streak bonus!</span>
          </div>
          <span className="font-mono text-sm font-bold text-gold-bright">
            +1,000 daily
          </span>
        </div>
      )}
    </section>
  );
}
