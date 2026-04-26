import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { DEV_BOT_AUTH_PREFIX } from "./games/gamesShared";
import { getBotCharacterForAuthUserId } from "./aiStrategy";

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

    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const submissions = await ctx.db
      .query("wordSubmissions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const winnerId = game.winnerId;
    const now = Date.now();

    for (const hand of hands) {
      if (hand.playerId === "ai_dealer") continue;

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

      const totalActions = playerSubmissions.length > 0
        ? submissions.filter((s) => s.playerId === hand.playerId).length
        : 0;

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

      const lastActionCounts = countLastActions(hands, hand.playerId);

      const newGamesPlayed = existingStats.gamesPlayed + 1;
      const newGamesWon = existingStats.gamesWon + (won ? 1 : 0);
      const newWinRate = newGamesPlayed > 0 ? newGamesWon / newGamesPlayed : 0;

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
        totalChecks: existingStats.totalChecks + lastActionCounts.check,
        totalCalls: existingStats.totalCalls + lastActionCounts.call,
        totalRaises: existingStats.totalRaises + lastActionCounts.raise,
        totalFolds: existingStats.totalFolds + lastActionCounts.fold + (hand.hasFolded && !lastActionCounts.fold ? 1 : 0),
        playerName,
        lastGameAt: now,
        updatedAt: now,
      });
    }

    await updateAIStatsFromTraces(ctx, args.gameId, now);
  },
});

async function getPlayerById(ctx: any, playerId: string) {
  if (playerId === "ai_dealer") return null;
  const normalizedId = ctx.db.normalizeId("players", playerId);
  if (!normalizedId) return null;
  return await ctx.db.get(normalizedId);
}

async function findOrCreateStats(
  ctx: any,
  params: {
    authUserId: string | undefined;
    characterId: string | undefined;
    playerName: string;
    isBot: boolean;
  },
) {
  let existing;

  if (params.isBot && params.characterId) {
    [existing] = await ctx.db
      .query("playerStats")
      .withIndex("by_characterId", (q: any) => q.eq("characterId", params.characterId))
      .collect();
  } else if (params.authUserId) {
    [existing] = await ctx.db
      .query("playerStats")
      .withIndex("by_authUserId", (q: any) => q.eq("authUserId", params.authUserId))
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
    lastGameAt: now,
    updatedAt: now,
  });

  return { ...params, _id: newId };
}

function countLastActions(
  hands: Array<{ playerId: string; lastAction?: string }>,
  playerId: string,
) {
  const hand = hands.find((h) => h.playerId === playerId);
  const counts: Record<string, number> = { check: 0, call: 0, raise: 0, fold: 0 };
  if (hand?.lastAction) {
    counts[hand.lastAction] = 1;
  }
  return counts;
}

async function updateAIStatsFromTraces(
  ctx: any,
  gameId: Id<"games">,
  now: number,
) {
  const aiBettingTraces = await ctx.db
    .query("gameTraces")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("category"), "ai_betting"),
        q.eq(q.field("gameId"), gameId),
      ),
    )
    .collect();

  for (const trace of aiBettingTraces) {
    if (!trace.characterId) continue;

    let stats;
    [stats] = await ctx.db
      .query("playerStats")
      .withIndex("by_characterId", (q: any) =>
        q.eq("characterId", trace.characterId),
      )
      .collect();

    if (!stats) continue;

    const bluffs = trace.isBluffing ? 1 : 0;
    const fallbacks = trace.usedFallback ? 1 : 0;
    const handStrength = trace.handStrength ?? 0;

    const currentBluffs = stats.totalBluffs ?? 0;
    const currentFallbacks = stats.totalFallbacks ?? 0;
    const currentAvgHS = stats.avgHandStrength ?? 0;
    const totalBettingActions = (stats.totalChecks ?? 0) + (stats.totalCalls ?? 0) + (stats.totalRaises ?? 0) + (stats.totalFolds ?? 0);

    const newAvgHS =
      totalBettingActions > 0
        ? (currentAvgHS * (totalBettingActions - 1) + handStrength) / totalBettingActions
        : handStrength;

    await ctx.db.patch(stats._id, {
      totalBluffs: currentBluffs + bluffs,
      totalFallbacks: currentFallbacks + fallbacks,
      avgHandStrength: newAvgHS,
      updatedAt: now,
    });
  }
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
