import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useWallet } from "@/components/wallet/useWallet";
import { AchievementCard } from "./AchievementCard";
import type { AchievementWithProgress } from "../../../convex/achievements";

const CATEGORY_LABELS: Record<string, string> = {
  wordcraft: "Wordcraft",
  poker: "Poker Skill",
  progression: "Progression",
  hidden: "Hidden",
};

type Filter = "all" | "unlocked" | "in-progress" | "locked";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unlocked", label: "Unlocked" },
  { key: "in-progress", label: "In Progress" },
  { key: "locked", label: "Locked" },
];

function achStatus(a: AchievementWithProgress): Filter {
  if (a.isCompleted) return "unlocked";
  if (a.completedTiers.length > 0 || a.progress > 0) return "in-progress";
  return "locked";
}

function formatNum(n: number): string {
  return n.toLocaleString();
}

export function AchievementsPage({ sessionUserId }: { sessionUserId: string }) {
  const achievementsData = useQuery(api.achievements.getMyAchievements);
  const { balance } = useWallet(sessionUserId);
  const [filter, setFilter] = useState<Filter>("all");

  if (achievementsData === undefined) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-felt px-6 py-10">
        <p className="text-center text-sm text-game-muted">
          Loading achievements...
        </p>
      </main>
    );
  }

  const {
    achievements,
    totalCoinsEarned,
    totalRarityPoints,
    unlockedCount,
    totalCount,
  } = achievementsData;

  const completionPct =
    totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const filtered = achievements.filter((a) => {
    if (filter === "all") return true;
    return achStatus(a) === filter;
  });

  const counts = {
    all: totalCount,
    unlocked: unlockedCount,
    "in-progress": achievements.filter((a) => achStatus(a) === "in-progress")
      .length,
    locked: achievements.filter((a) => achStatus(a) === "locked").length,
  };

  // Group filtered by category preserving sort order.
  const grouped = new Map<string, AchievementWithProgress[]>();
  for (const a of filtered) {
    const list = grouped.get(a.category) ?? [];
    list.push(a);
    grouped.set(a.category, list);
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-felt text-cream">
      {/* ── Headline + stats ── */}
      <div className="border-b border-white/5 px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-4">
          {/* Headline */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-game-muted">
                ACHIEVEMENTS · UPDATED TODAY
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-gold-bright sm:text-4xl">
                The <em className="italic text-gold">achievements</em> book.
              </h1>
            </div>
            {balance !== null && (
              <div className="flex shrink-0 items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-xs">
                <span className="font-mono text-[11px] font-medium text-gold">
                  {formatNum(balance)}
                </span>
                <span className="text-[10px] text-game-muted">coins</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center divide-x divide-white/10">
            <div className="px-4 first:pl-0">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-game-muted">
                UNLOCKED
              </p>
              <p className="mt-0.5 font-display text-xl font-semibold italic text-[#9ec27a] sm:text-2xl">
                {unlockedCount} / {totalCount}
              </p>
            </div>
            <div className="px-4">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-game-muted">
                COMPLETION
              </p>
              <p className="mt-0.5 font-display text-xl font-semibold italic text-gold sm:text-2xl">
                {completionPct}%
              </p>
            </div>
            <div className="px-4">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-game-muted">
                POINTS
              </p>
              <p className="mt-0.5 font-display text-xl font-semibold italic text-gold-bright sm:text-2xl">
                {formatNum(totalRarityPoints)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters + progress bar ── */}
      <div className="border-b border-white/5 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const on = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    on
                      ? "bg-gold/10 text-gold ring-1 ring-gold/20"
                      : "text-game-muted hover:bg-white/5"
                  }`}
                >
                  {f.label}
                  <span
                    className={`font-mono text-[10px] ${
                      on ? "text-gold" : "text-game-muted/50"
                    }`}
                  >
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Completion bar */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${completionPct}%`,
                  background:
                    "linear-gradient(90deg, rgba(212,165,74,0.3), #d4a54a)",
                }}
              />
            </div>
            <span className="shrink-0 font-mono text-[9px] tracking-[0.1em] text-game-muted">
              {completionPct}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Achievement grid ── */}
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <section key={category} className="mb-8">
              <h2 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-game-muted">
                {CATEGORY_LABELS[category] ?? category}
              </h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    compact
                  />
                ))}
              </div>
            </section>
          ))}

          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-game-muted">
              No achievements match this filter.
            </p>
          )}
        </div>
      </div>

      {/* ── Unlock ticker ── */}
      <div className="border-t border-white/5 bg-black/20 mt-auto">
        <div className="overflow-hidden whitespace-nowrap py-2">
          <div className="flex items-center gap-4 px-4 sm:px-6">
            <div className="flex shrink-0 items-center gap-2 border-r border-white/10 pr-4 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-gold">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gold shadow-[0_0_6px_rgba(212,165,74,0.6)]" />
              JUST UNLOCKED
            </div>
            <span className="whitespace-nowrap font-mono text-[10px] text-game-muted">
              {totalCoinsEarned > 0
                ? `You've earned ${formatNum(totalCoinsEarned)} coins from achievements so far.`
                : "Play games to unlock achievements and earn coin rewards."}
              {" · "}
              Keep playing to climb the rarity ladder: Common → Rare → Epic →
              Legendary.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
