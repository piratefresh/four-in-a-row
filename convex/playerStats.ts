import { v } from "convex/values";
import { query } from "./_generated/server";

// ── Cache key builder (mirrored from statsCache.ts) ────────────────

function buildCacheKey(
  filter: string,
  days?: number,
  dateRange?: { start: number; end: number },
): string {
  if (dateRange) {
    return `${filter}:range:${dateRange.start}:${dateRange.end}`;
  }
  const d = days ?? 30;
  return `${filter}:days:${d}`;
}

// ── Read cached stats from statsSnapshot (populated by statsCache.computeStats) ─

export const getAllStats = query({
  args: {
    filter: v.optional(
      v.union(v.literal("all"), v.literal("players"), v.literal("bots")),
    ),
    days: v.optional(v.number()),
    dateRange: v.optional(v.object({ start: v.number(), end: v.number() })),
  },
  handler: async (ctx, args) => {
    // Always read from the "all" cache so a single cron job covers all filters
    const cacheKey = buildCacheKey("all", args.days, args.dateRange);
    const cached = await ctx.db
      .query("statsSnapshot")
      .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
      .first();

    if (!cached || cached.computing) return [];

    try {
      const allRows = JSON.parse(cached.stats) as StatsRow[];
      const filter = args.filter ?? "all";
      if (filter === "all") return allRows;
      return allRows.filter(
        (r) => r.identity.type === (filter === "players" ? "human" : "bot"),
      );
    } catch {
      return [];
    }
  },
});


// ── Internal types ─────────────────────────────────────────────────

export interface StatsRow {
  identity: {
    type: "human" | "bot";
    authUserId?: string;
    characterId?: string;
    name: string;
  };
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  netChips: number;
  totalChipsWon: number;
  totalChipsLost: number;
  bestChipFinish: number;
  showdownsReached: number;
  showdownsWon: number;
  totalWords: number;
  avgWordScore: number;
  bestWord: string | null;
  bestWordScore: number;
  longestWord: string | null;
  recentWords: Array<{ word: string; score: number; createdAt: number }>;
  totalChecks: number;
  totalCalls: number;
  totalRaises: number;
  totalFolds: number;
  foldPercent: number;
  vpip: number;
  aggressionFactor: number;
  foldsByStage: { preflop: number; flop: number; turn: number; final: number };
  totalBluffs?: number;
  totalFallbacks?: number;
  bluffRate?: number;
  fallbackRate?: number;
  avgLatencyMs?: number;
  avgHandStrength?: number;
  totalAiDecisions?: number;
  totalAiSuccesses?: number;
  totalAiFailures?: number;
  lastGameAt: number;
}
