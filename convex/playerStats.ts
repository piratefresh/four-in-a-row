import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { DEV_BOT_AUTH_PREFIX } from "./games/gamesShared";
import { getBotCharacterForAuthUserId } from "./aiStrategy";

const AI_DEALER_PLAYER_ID = "ai_dealer";

function isBotAuthUserId(authUserId: string | undefined): boolean {
  return !!authUserId?.startsWith(DEV_BOT_AUTH_PREFIX);
}

function extractCharacterId(authUserId: string | undefined): string | undefined {
  if (!isBotAuthUserId(authUserId)) return undefined;
  const encoded = authUserId!.slice(DEV_BOT_AUTH_PREFIX.length);
  const [characterId] = encoded.split(":");
  return characterId;
}

function extractPlayerName(authUserId: string | undefined, fallbackName: string): string {
  if (isBotAuthUserId(authUserId)) {
    const character = getBotCharacterForAuthUserId(authUserId);
    return character ? `${character.name}` : fallbackName;
  }
  return fallbackName;
}

export const updatePlayerStats = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "completed") return;

    const existingRollup = await ctx.db
      .query("playerStatRollups")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .unique();
    if (existingRollup) return;

    const now = Date.now();
    await ctx.db.insert("playerStatRollups", {
      gameId: args.gameId,
      createdAt: now,
    });

    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const submissions = await ctx.db
      .query("wordSubmissions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const traces = await ctx.db
      .query("gameTraces")
      .withIndex("by_gameId_createdAt", (q) => q.eq("gameId", args.gameId))
      .collect();

    const winnerId = game.winnerId;

    for (const hand of hands) {
      if (hand.playerId === AI_DEALER_PLAYER_ID) continue;

      const player = await getPlayerById(ctx, hand.playerId);
      const authUserId = player?.authUserId;
      const isBot = isBotAuthUserId(authUserId);
      const characterId = extractCharacterId(authUserId);
      const playerName = extractPlayerName(authUserId, player?.name ?? "Unknown");

      const existingStats = await findOrCreateStats(ctx, {
        authUserId,
        characterId,
        playerName,
        isBot,
      });

      const won = hand.playerId === winnerId;
      const chipsDelta = hand.chips - (1000 - hand.totalBet);
      const chipsWon = chipsDelta > 0 ? chipsDelta : 0;
      const chipsLost = chipsDelta < 0 ? Math.abs(chipsDelta) : 0;

      const playerSubmissions = submissions.filter(
        (s) => s.playerId === hand.playerId,
      );
      const reachedShowdown = playerSubmissions.length > 0 || !hand.hasFolded;
      const wonShowdown = won && reachedShowdown && playerSubmissions.length > 0;

      const newWordsSubmitted = existingStats.wordsSubmitted + playerSubmissions.length;
      const allScores = playerSubmissions.map((s) => s.score);
      const existingTotalScore = existingStats.avgWordScore * existingStats.wordsSubmitted;
      const newTotalScore = existingTotalScore + allScores.reduce((a, b) => a + b, 0);
      const newAvgWordScore = newWordsSubmitted > 0 ? newTotalScore / newWordsSubmitted : 0;

      let bestWord = existingStats.bestWord;
      let bestWordScore = existingStats.bestWordScore;
      let longestWord = existingStats.longestWord;

      for (const sub of playerSubmissions) {
        if (!bestWordScore || sub.score > bestWordScore) {
          bestWord = sub.word;
          bestWordScore = sub.score;
        }
        if (!longestWord || sub.word.length > longestWord.length) {
          longestWord = sub.word;
        }
      }

      const actionCounts = countTraceActions(traces, hand.playerId);
      if (hand.hasFolded && actionCounts.fold === 0) {
        actionCounts.fold = 1;
      }
      const aiTraceStats = getAiTraceStats(traces, {
        playerId: hand.playerId,
        characterId,
      });

      const newGamesPlayed = existingStats.gamesPlayed + 1;
      const newGamesWon = existingStats.gamesWon + (won ? 1 : 0);
      const newWinRate = newGamesPlayed > 0 ? newGamesWon / newGamesPlayed : 0;
      const existingAiDecisions = existingStats.totalAiDecisions ?? 0;
      const newAiDecisions = existingAiDecisions + aiTraceStats.totalAiDecisions;
      const newAiSuccesses = (existingStats.totalAiSuccesses ?? 0) + aiTraceStats.totalAiSuccesses;
      const newAiFailures = (existingStats.totalAiFailures ?? 0) + aiTraceStats.totalAiFailures;
      const newLatencySamples =
        (existingStats.totalAiLatencySamples ?? 0) + aiTraceStats.latencySamples;
      const newHandStrengthSamples =
        (existingStats.totalHandStrengthSamples ?? 0) + aiTraceStats.handStrengthSamples;
      const newAvgLatencyMs = mergeAverage({
        currentAverage: existingStats.avgLatencyMs ?? 0,
        currentCount: existingStats.totalAiLatencySamples ?? 0,
        addedTotal: aiTraceStats.latencyTotal,
        addedCount: aiTraceStats.latencySamples,
      });
      const newAvgHandStrength = mergeAverage({
        currentAverage: existingStats.avgHandStrength ?? 0,
        currentCount: existingStats.totalHandStrengthSamples ?? 0,
        addedTotal: aiTraceStats.handStrengthTotal,
        addedCount: aiTraceStats.handStrengthSamples,
      });

      await ctx.db.patch(existingStats._id, {
        gamesPlayed: newGamesPlayed,
        gamesWon: newGamesWon,
        winRate: newWinRate,
        totalChipsWon: existingStats.totalChipsWon + chipsWon,
        totalChipsLost: existingStats.totalChipsLost + chipsLost,
        bestChipFinish: Math.max(existingStats.bestChipFinish, hand.chips),
        showdownsReached: existingStats.showdownsReached + (reachedShowdown ? 1 : 0),
        showdownsWon: existingStats.showdownsWon + (wonShowdown ? 1 : 0),
        wordsSubmitted: newWordsSubmitted,
        avgWordScore: newAvgWordScore,
        bestWord,
        bestWordScore,
        longestWord,
        totalChecks: existingStats.totalChecks + actionCounts.check,
        totalCalls: existingStats.totalCalls + actionCounts.call,
        totalRaises: existingStats.totalRaises + actionCounts.raise,
        totalFolds: existingStats.totalFolds + actionCounts.fold,
        totalBluffs: (existingStats.totalBluffs ?? 0) + aiTraceStats.totalBluffs,
        totalFallbacks: (existingStats.totalFallbacks ?? 0) + aiTraceStats.totalFallbacks,
        avgHandStrength: newAvgHandStrength,
        totalAiDecisions: newAiDecisions,
        totalAiSuccesses: newAiSuccesses,
        totalAiFailures: newAiFailures,
        avgLatencyMs: newAvgLatencyMs,
        totalAiLatencySamples: newLatencySamples,
        totalHandStrengthSamples: newHandStrengthSamples,
        playerName,
        lastGameAt: now,
        updatedAt: now,
      });
    }
  },
});

async function getPlayerById(ctx: MutationCtx, playerId: string) {
  if (playerId === AI_DEALER_PLAYER_ID) return null;
  const normalizedId = ctx.db.normalizeId("players", playerId);
  if (!normalizedId) return null;
  return await ctx.db.get(normalizedId);
}

async function findOrCreateStats(
  ctx: MutationCtx,
  params: {
    authUserId: string | undefined;
    characterId: string | undefined;
    playerName: string;
    isBot: boolean;
  },
): Promise<Doc<"playerStats">> {
  let existing: Doc<"playerStats"> | null = null;

  if (params.isBot && params.characterId) {
    [existing] = await ctx.db
      .query("playerStats")
      .withIndex("by_characterId", (q) => q.eq("characterId", params.characterId))
      .collect();
  } else if (params.authUserId) {
    [existing] = await ctx.db
      .query("playerStats")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", params.authUserId))
      .collect();
  }

  if (existing) return existing;

  const now = Date.now();
  const newId = await ctx.db.insert("playerStats", {
    authUserId: params.authUserId,
    characterId: params.characterId,
    playerName: params.playerName,
    isBot: params.isBot,
    gamesPlayed: 0,
    gamesWon: 0,
    winRate: 0,
    totalChipsWon: 0,
    totalChipsLost: 0,
    bestChipFinish: 0,
    showdownsReached: 0,
    showdownsWon: 0,
    wordsSubmitted: 0,
    avgWordScore: 0,
    totalChecks: 0,
    totalCalls: 0,
    totalRaises: 0,
    totalFolds: 0,
    totalAiDecisions: 0,
    totalAiSuccesses: 0,
    totalAiFailures: 0,
    avgLatencyMs: 0,
    totalAiLatencySamples: 0,
    totalHandStrengthSamples: 0,
    lastGameAt: now,
    updatedAt: now,
  });

  const created = await ctx.db.get(newId);
  if (!created) {
    throw new Error("Failed to create player stats document.");
  }
  return created;
}

function countTraceActions(
  traces: Doc<"gameTraces">[],
  playerId: string,
) {
  const counts = { check: 0, call: 0, raise: 0, fold: 0 };
  for (const trace of traces) {
    if (trace.category !== "game_action" || trace.playerId !== playerId) continue;
    if (
      trace.action === "check" ||
      trace.action === "call" ||
      trace.action === "raise" ||
      trace.action === "fold"
    ) {
      counts[trace.action] += 1;
    }
  }
  return counts;
}

function getAiTraceStats(
  traces: Doc<"gameTraces">[],
  player: { playerId: string; characterId?: string },
) {
  const stats = {
    totalAiDecisions: 0,
    totalAiSuccesses: 0,
    totalAiFailures: 0,
    totalBluffs: 0,
    totalFallbacks: 0,
    latencyTotal: 0,
    latencySamples: 0,
    handStrengthTotal: 0,
    handStrengthSamples: 0,
  };

  for (const trace of traces) {
    if (!trace.category.startsWith("ai_")) continue;
    const matchesPlayer =
      trace.playerId === player.playerId ||
      (!!player.characterId && trace.characterId === player.characterId);
    if (!matchesPlayer) continue;

    stats.totalAiDecisions += 1;
    if (trace.success) {
      stats.totalAiSuccesses += 1;
    } else {
      stats.totalAiFailures += 1;
    }
    if (trace.isBluffing) stats.totalBluffs += 1;
    if (trace.usedFallback) stats.totalFallbacks += 1;
    if (typeof trace.latencyMs === "number" && Number.isFinite(trace.latencyMs)) {
      stats.latencyTotal += trace.latencyMs;
      stats.latencySamples += 1;
    }
    if (
      typeof trace.handStrength === "number" &&
      Number.isFinite(trace.handStrength)
    ) {
      stats.handStrengthTotal += trace.handStrength;
      stats.handStrengthSamples += 1;
    }
  }

  return stats;
}

function mergeAverage(args: {
  currentAverage: number;
  currentCount: number;
  addedTotal: number;
  addedCount: number;
}) {
  const nextCount = args.currentCount + args.addedCount;
  if (nextCount === 0) return args.currentAverage;
  return (args.currentAverage * args.currentCount + args.addedTotal) / nextCount;
}

export const getPlayerStats = query({
  args: { authUserId: v.string() },
  handler: async (ctx, args) => {
    const [stats] = await ctx.db
      .query("playerStats")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .collect();
    return stats ?? null;
  },
});

export const getCharacterStats = query({
  args: { characterId: v.string() },
  handler: async (ctx, args) => {
    const [stats] = await ctx.db
      .query("playerStats")
      .withIndex("by_characterId", (q) => q.eq("characterId", args.characterId))
      .collect();
    return stats ?? null;
  },
});

export const getLeaderboard = query({
  args: { sortBy: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const allStats = await ctx.db.query("playerStats").collect();

    const sortBy = args.sortBy ?? "winRate";

    const sorted = allStats.sort((a, b) => {
      const aVal = (a as any)[sortBy] ?? 0;
      const bVal = (b as any)[sortBy] ?? 0;
      return bVal - aVal;
    });

    return sorted;
  },
});

export const getAICharacterComparison = query({
  args: {},
  handler: async (ctx) => {
    const characterIds = ["nora", "ellis", "jax", "mira"];
    const results: Array<{
      characterId: string;
      stats: Doc<"playerStats"> | null;
    }> = [];

    for (const characterId of characterIds) {
      const [stats] = await ctx.db
        .query("playerStats")
        .withIndex("by_characterId", (q) => q.eq("characterId", characterId))
        .collect();
      results.push({ characterId, stats: stats ?? null });
    }

    return results;
  },
});

export const getAllStats = query({
  args: { filter: v.optional(v.union(v.literal("all"), v.literal("players"), v.literal("bots"))) },
  handler: async (ctx, args) => {
    const allStats = await ctx.db.query("playerStats").collect();

    if (args.filter === "players") {
      return allStats.filter((s) => !s.isBot);
    }
    if (args.filter === "bots") {
      return allStats.filter((s) => s.isBot);
    }

    return allStats;
  },
});
