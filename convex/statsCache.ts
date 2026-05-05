import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { DEV_BOT_AUTH_PREFIX, INITIAL_CHIPS } from "./games/gamesShared";

const AI_DEALER_PLAYER_ID = "ai_dealer";
const CHUNK_SIZE = 12;
const recentWordsLimit = 50;

// ── Identity helpers ──────────────────────────────────────────────

function isBotAuthUserId(authUserId: string): boolean {
  return authUserId.startsWith(DEV_BOT_AUTH_PREFIX);
}

function extractCharacterId(authUserId: string): string | undefined {
  if (!isBotAuthUserId(authUserId)) return undefined;
  const encoded = authUserId.slice(DEV_BOT_AUTH_PREFIX.length);
  const [characterId] = encoded.split(":");
  return characterId;
}

// ── Serializable accumulator (subset used between chunks) ─────────

interface ChunkAccumulator {
  identity: { type: "human" | "bot"; authUserId?: string; characterId?: string; name: string };
  gamesPlayed: number;
  gamesWon: number;
  totalChipsWon: number;
  totalChipsLost: number;
  bestChipFinish: number;
  showdownsReached: number;
  showdownsWon: number;
  totalChecks: number;
  totalCalls: number;
  totalRaises: number;
  totalFolds: number;
  foldsByStage: { preflop: number; flop: number; turn: number; final: number };
  survivingPreflop: number;
  recentWords: Array<{ word: string; score: number; createdAt: number }>;
  totalAiDecisions: number;
  totalAiSuccesses: number;
  totalAiFailures: number;
  totalBluffs: number;
  totalFallbacks: number;
  latencyTotal: number;
  latencySamples: number;
  handStrengthTotal: number;
  handStrengthSamples: number;
  lastGameAt: number;
}

interface StatsRowResult {
  identity: { type: "human" | "bot"; authUserId?: string; characterId?: string; name: string };
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

// ── Cache key builder ─────────────────────────────────────────────

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

// ── Public: read cached stats ─────────────────────────────────────

export const getCachedStats = query({
  args: {
    filter: v.optional(
      v.union(v.literal("all"), v.literal("players"), v.literal("bots")),
    ),
    days: v.optional(v.number()),
    dateRange: v.optional(v.object({ start: v.number(), end: v.number() })),
  },
  handler: async (ctx, args) => {
    const cacheKey = buildCacheKey(
      args.filter ?? "all",
      args.days,
      args.dateRange,
    );
    const cached = await ctx.db
      .query("statsSnapshot")
      .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
      .first();

    if (!cached) {
      return { stats: null, computing: false, computedAt: 0 };
    }

    return {
      stats: cached.stats ? (JSON.parse(cached.stats) as StatsRowResult[]) : null,
      computing: cached.computing,
      computedAt: cached.computedAt,
    };
  },
});

// ── Public: kick off stats computation ────────────────────────────

export const computeStats = mutation({
  args: {
    filter: v.optional(
      v.union(v.literal("all"), v.literal("players"), v.literal("bots")),
    ),
    days: v.optional(v.number()),
    dateRange: v.optional(v.object({ start: v.number(), end: v.number() })),
  },
  handler: async (ctx, args) => {
    const filter = args.filter ?? "all";
    const now = Date.now();

    let cutoff: number | undefined;
    if (args.dateRange) {
      cutoff = args.dateRange.start;
    } else if (args.days != null) {
      cutoff = now - args.days * 24 * 60 * 60 * 1000;
    } else {
      cutoff = now - 30 * 24 * 60 * 60 * 1000;
    }

    const cacheKey = buildCacheKey(filter, args.days, args.dateRange);

    // Set computing flag
    const existing = await ctx.db
      .query("statsSnapshot")
      .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        computing: true,
        computingStartedAt: now,
      });
    } else {
      await ctx.db.insert("statsSnapshot", {
        cacheKey,
        stats: "",
        computedAt: 0,
        computing: true,
        computingStartedAt: now,
      });
    }

    // Collect game IDs in the time window
    const allGames = await ctx.db.query("games").collect();
    const gameIds: Id<"games">[] = [];
    for (const g of allGames) {
      if (g.status !== "completed") continue;
      if (args.dateRange) {
        if (g.createdAt < args.dateRange.start || g.createdAt > args.dateRange.end) continue;
      } else if (cutoff != null && g.createdAt < cutoff) {
        continue;
      }
      gameIds.push(g._id);
    }

    if (gameIds.length === 0) {
      await ctx.db.patch(
        (await ctx.db.query("statsSnapshot").withIndex("by_key", (q) => q.eq("cacheKey", cacheKey)).first())!._id,
        { stats: "[]", computedAt: now, computing: false, computingStartedAt: undefined },
      );
      return;
    }

    // Chunk and schedule
    const batchId = `${cacheKey}:${now}`;
    const totalChunks = Math.ceil(gameIds.length / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const chunkGameIds = gameIds.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ctx.scheduler.runAfter(0, (internal as any).statsCache.processChunk, {
        batchId,
        chunkIndex: i,
        gameIds: chunkGameIds,
        filter,
        dateRange: args.dateRange ?? undefined,
        days: args.days,
      });
    }

    // Schedule merge after all chunks (slight delay to let them finish)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.scheduler.runAfter(2000, (internal as any).statsCache.mergeChunks, {
      batchId,
      cacheKey,
      filter,
      totalChunks,
    });
  },
});

// ── Internal: process one chunk of games ──────────────────────────

export const processChunk = mutation({
  args: {
    batchId: v.string(),
    chunkIndex: v.number(),
    gameIds: v.array(v.id("games")),
    filter: v.string(),
    dateRange: v.optional(v.object({ start: v.number(), end: v.number() })),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Build identity map locally to avoid exceeding Convex's 1024-field arg limit
    const allPlayers = await ctx.db.query("players").collect();
    const identityMap: Record<string, { authUserId: string; name: string; isBot: boolean; characterId?: string }> = {};
    for (const p of allPlayers) {
      const isBot = isBotAuthUserId(p.authUserId);
      identityMap[String(p._id)] = {
        authUserId: p.authUserId,
        name: p.name,
        isBot,
        characterId: isBot ? extractCharacterId(p.authUserId) : undefined,
      };
    }

    const accumulators = new Map<string, ChunkAccumulator>();

    function getAcc(key: string, identity: ChunkAccumulator["identity"]): ChunkAccumulator {
      let acc = accumulators.get(key);
      if (!acc) {
        acc = {
          identity,
          gamesPlayed: 0, gamesWon: 0,
          totalChipsWon: 0, totalChipsLost: 0, bestChipFinish: 0,
          showdownsReached: 0, showdownsWon: 0,
          totalChecks: 0, totalCalls: 0, totalRaises: 0, totalFolds: 0,
          foldsByStage: { preflop: 0, flop: 0, turn: 0, final: 0 },
          survivingPreflop: 0,
          recentWords: [],
          totalAiDecisions: 0, totalAiSuccesses: 0, totalAiFailures: 0,
          totalBluffs: 0, totalFallbacks: 0,
          latencyTotal: 0, latencySamples: 0,
          handStrengthTotal: 0, handStrengthSamples: 0,
          lastGameAt: 0,
        };
        accumulators.set(key, acc);
      }
      return acc;
    }

    // Read games for this chunk
    const games = await Promise.all(args.gameIds.map((id) => ctx.db.get(id)));
    const gameMap = new Map<string, Doc<"games">>();
    for (const g of games) {
      if (g) gameMap.set(g._id, g);
    }

    for (const gameId of args.gameIds) {
      const game = gameMap.get(gameId);
      if (!game) continue;

      const [hands, subs, traces] = await Promise.all([
        ctx.db.query("playerHands").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect(),
        ctx.db.query("wordSubmissions").withIndex("by_game", (q) => q.eq("gameId", gameId)).collect(),
        ctx.db.query("gameTraces").withIndex("by_gameId_createdAt", (q) => q.eq("gameId", gameId)).collect(),
      ]);

      const winnerId = game.winnerId;
      const gameTime = game.createdAt;

      for (const hand of hands) {
        if (hand.playerId === AI_DEALER_PLAYER_ID) continue;
        const info = identityMap[hand.playerId];
        if (!info) continue;
        const key = info.isBot ? `bot:${info.characterId}` : `human:${info.authUserId}`;
        const acc = getAcc(key, {
          type: info.isBot ? "bot" : "human",
          authUserId: info.isBot ? undefined : info.authUserId,
          characterId: info.characterId,
          name: info.name,
        });

        acc.gamesPlayed++;
        if (gameTime > acc.lastGameAt) acc.lastGameAt = gameTime;
        if (hand.playerId === winnerId) acc.gamesWon++;
        const chipsDelta = hand.chips + hand.totalBet - INITIAL_CHIPS;
        if (chipsDelta > 0) acc.totalChipsWon += chipsDelta;
        else if (chipsDelta < 0) acc.totalChipsLost += Math.abs(chipsDelta);
        if (hand.chips > acc.bestChipFinish) acc.bestChipFinish = hand.chips;
      }

      for (const sub of subs) {
        const info = identityMap[sub.playerId];
        if (!info) continue;
        const key = info.isBot ? `bot:${info.characterId}` : `human:${info.authUserId}`;
        const acc = getAcc(key, {
          type: info.isBot ? "bot" : "human",
          authUserId: info.isBot ? undefined : info.authUserId,
          characterId: info.characterId,
          name: info.name,
        });
        acc.recentWords.push({ word: sub.word, score: sub.score, createdAt: sub.createdAt });
        acc.recentWords.sort((a, b) => b.createdAt - a.createdAt);
        if (acc.recentWords.length > recentWordsLimit) {
          acc.recentWords = acc.recentWords.slice(0, recentWordsLimit);
        }
      }

      const tracesByPlayer = new Map<string, Doc<"gameTraces">[]>();
      for (const trace of traces) {
        const pid = trace.playerId;
        if (!pid) continue;
        if (!tracesByPlayer.has(pid)) tracesByPlayer.set(pid, []);
        tracesByPlayer.get(pid)!.push(trace);
      }

      for (const hand of hands) {
        if (hand.playerId === AI_DEALER_PLAYER_ID) continue;
        const info = identityMap[hand.playerId];
        if (!info) continue;
        const key = info.isBot ? `bot:${info.characterId}` : `human:${info.authUserId}`;
        const acc = getAcc(key, {
          type: info.isBot ? "bot" : "human",
          authUserId: info.isBot ? undefined : info.authUserId,
          characterId: info.characterId,
          name: info.name,
        });
        const playerTraces = tracesByPlayer.get(hand.playerId) ?? [];

        if (!hand.hasFolded) {
          acc.showdownsReached++;
          if (hand.playerId === winnerId) acc.showdownsWon++;
        }

        let foldedThisGame = false;
        let foldedPreflop = false;
        for (const trace of playerTraces) {
          if (trace.category !== "game_action") continue;
          const action = trace.action;
          if (action === "check") acc.totalChecks++;
          else if (action === "call") acc.totalCalls++;
          else if (action === "raise") acc.totalRaises++;
          else if (action === "fold") {
            acc.totalFolds++;
            foldedThisGame = true;
            const stage = trace.stage;
            if (stage === "preflop") { acc.foldsByStage.preflop++; foldedPreflop = true; }
            else if (stage === "flop") acc.foldsByStage.flop++;
            else if (stage === "turn") acc.foldsByStage.turn++;
            else if (stage === "final") acc.foldsByStage.final++;
          }
        }
        if (hand.hasFolded && !foldedThisGame) {
          acc.totalFolds++;
          acc.foldsByStage.preflop++;
          foldedPreflop = true;
        }
        if (!foldedPreflop) acc.survivingPreflop++;

        for (const trace of playerTraces) {
          if (!trace.category.startsWith("ai_")) continue;
          acc.totalAiDecisions++;
          if (trace.success) acc.totalAiSuccesses++;
          else acc.totalAiFailures++;
          if (trace.isBluffing) acc.totalBluffs++;
          if (trace.usedFallback) acc.totalFallbacks++;
          if (typeof trace.latencyMs === "number" && Number.isFinite(trace.latencyMs)) {
            acc.latencyTotal += trace.latencyMs;
            acc.latencySamples++;
          }
          if (typeof trace.handStrength === "number" && Number.isFinite(trace.handStrength)) {
            acc.handStrengthTotal += trace.handStrength;
            acc.handStrengthSamples++;
          }
        }
      }
    }

    // Serialize accumulators Map → JSON-safe object
    const data: Record<string, ChunkAccumulator> = {};
    for (const [key, acc] of accumulators) {
      data[key] = acc;
    }

    await ctx.db.insert("statsChunks", {
      batchId: args.batchId,
      chunkIndex: args.chunkIndex,
      data: JSON.stringify(data),
    });
  },
});

// ── Internal: merge all chunks into final stats ───────────────────

export const mergeChunks = mutation({
  args: {
    batchId: v.string(),
    cacheKey: v.string(),
    filter: v.string(),
    totalChunks: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Read all chunks for this batch
    const chunkRows = await ctx.db
      .query("statsChunks")
      .withIndex("by_batch", (q) => q.eq("batchId", args.batchId))
      .collect();

    if (chunkRows.length < args.totalChunks) {
      // Not all chunks done yet — reschedule
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ctx.scheduler.runAfter(1000, (internal as any).statsCache.mergeChunks, {
        batchId: args.batchId,
        cacheKey: args.cacheKey,
        filter: args.filter,
        totalChunks: args.totalChunks,
      });
      return;
    }

    // Merge all partial accumulators by key
    const merged = new Map<string, ChunkAccumulator>();

    for (const row of chunkRows) {
      const data = JSON.parse(row.data) as Record<string, ChunkAccumulator>;
      for (const [key, partial] of Object.entries(data)) {
        let acc = merged.get(key);
        if (!acc) {
          acc = { ...partial, recentWords: [...partial.recentWords] };
          merged.set(key, acc);
        } else {
          acc.gamesPlayed += partial.gamesPlayed;
          acc.gamesWon += partial.gamesWon;
          acc.totalChipsWon += partial.totalChipsWon;
          acc.totalChipsLost += partial.totalChipsLost;
          if (partial.bestChipFinish > acc.bestChipFinish) acc.bestChipFinish = partial.bestChipFinish;
          acc.showdownsReached += partial.showdownsReached;
          acc.showdownsWon += partial.showdownsWon;
          acc.totalChecks += partial.totalChecks;
          acc.totalCalls += partial.totalCalls;
          acc.totalRaises += partial.totalRaises;
          acc.totalFolds += partial.totalFolds;
          acc.foldsByStage.preflop += partial.foldsByStage.preflop;
          acc.foldsByStage.flop += partial.foldsByStage.flop;
          acc.foldsByStage.turn += partial.foldsByStage.turn;
          acc.foldsByStage.final += partial.foldsByStage.final;
          acc.survivingPreflop += partial.survivingPreflop;
          acc.totalAiDecisions += partial.totalAiDecisions;
          acc.totalAiSuccesses += partial.totalAiSuccesses;
          acc.totalAiFailures += partial.totalAiFailures;
          acc.totalBluffs += partial.totalBluffs;
          acc.totalFallbacks += partial.totalFallbacks;
          acc.latencyTotal += partial.latencyTotal;
          acc.latencySamples += partial.latencySamples;
          acc.handStrengthTotal += partial.handStrengthTotal;
          acc.handStrengthSamples += partial.handStrengthSamples;
          if (partial.lastGameAt > acc.lastGameAt) acc.lastGameAt = partial.lastGameAt;
          // Merge word lists
          const wordMap = new Map<string, { word: string; score: number; createdAt: number }>();
          for (const w of acc.recentWords) wordMap.set(`${w.word}:${w.createdAt}`, w);
          for (const w of partial.recentWords) wordMap.set(`${w.word}:${w.createdAt}`, w);
          acc.recentWords = [...wordMap.values()]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, recentWordsLimit);
        }
      }
    }

    // Compute final StatsRow[] from merged accumulators
    const result: StatsRowResult[] = [];

    for (const acc of merged.values()) {
      if (args.filter === "players" && acc.identity.type === "bot") continue;
      if (args.filter === "bots" && acc.identity.type === "human") continue;

      const gamesPlayed = acc.gamesPlayed;
      const gamesWon = acc.gamesWon;
      const totalActions = acc.totalChecks + acc.totalCalls + acc.totalRaises + acc.totalFolds;
      const allWords = acc.recentWords;

      const totalWordScore = allWords.reduce((s, w) => s + w.score, 0);
      let bestWord: string | null = null;
      let bestWordScore = 0;
      let longestWord: string | null = null;
      for (const w of allWords) {
        if (w.score > bestWordScore) { bestWordScore = w.score; bestWord = w.word; }
        if (!longestWord || w.word.length > longestWord.length) longestWord = w.word;
      }

      const isBot = acc.identity.type === "bot";

      result.push({
        identity: acc.identity,
        gamesPlayed,
        gamesWon,
        winRate: gamesPlayed > 0 ? gamesWon / gamesPlayed : 0,
        netChips: acc.totalChipsWon - acc.totalChipsLost,
        totalChipsWon: acc.totalChipsWon,
        totalChipsLost: acc.totalChipsLost,
        bestChipFinish: acc.bestChipFinish,
        showdownsReached: acc.showdownsReached,
        showdownsWon: acc.showdownsWon,
        totalWords: allWords.length,
        avgWordScore: allWords.length > 0 ? totalWordScore / allWords.length : 0,
        bestWord,
        bestWordScore,
        longestWord,
        recentWords: allWords,
        totalChecks: acc.totalChecks,
        totalCalls: acc.totalCalls,
        totalRaises: acc.totalRaises,
        totalFolds: acc.totalFolds,
        foldPercent: totalActions > 0 ? acc.totalFolds / totalActions : 0,
        vpip: gamesPlayed > 0 ? acc.survivingPreflop / gamesPlayed : 0,
        aggressionFactor: acc.totalCalls > 0 ? acc.totalRaises / acc.totalCalls : acc.totalRaises,
        foldsByStage: acc.foldsByStage,
        totalBluffs: isBot ? acc.totalBluffs : undefined,
        totalFallbacks: isBot ? acc.totalFallbacks : undefined,
        bluffRate: acc.totalAiDecisions > 0 ? acc.totalBluffs / acc.totalAiDecisions : undefined,
        fallbackRate: acc.totalAiDecisions > 0 ? acc.totalFallbacks / acc.totalAiDecisions : undefined,
        avgLatencyMs: acc.latencySamples > 0 ? acc.latencyTotal / acc.latencySamples : undefined,
        avgHandStrength: acc.handStrengthSamples > 0 ? acc.handStrengthTotal / acc.handStrengthSamples : undefined,
        totalAiDecisions: isBot ? acc.totalAiDecisions : undefined,
        totalAiSuccesses: isBot ? acc.totalAiSuccesses : undefined,
        totalAiFailures: isBot ? acc.totalAiFailures : undefined,
        lastGameAt: acc.lastGameAt,
      });
    }

    result.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    // Save to snapshot
    const snapshot = await ctx.db
      .query("statsSnapshot")
      .withIndex("by_key", (q) => q.eq("cacheKey", args.cacheKey))
      .first();

    if (snapshot) {
      await ctx.db.patch(snapshot._id, {
        stats: JSON.stringify(result),
        computedAt: now,
        computing: false,
        computingStartedAt: undefined,
      });
    } else {
      await ctx.db.insert("statsSnapshot", {
        cacheKey: args.cacheKey,
        stats: JSON.stringify(result),
        computedAt: now,
        computing: false,
        computingStartedAt: undefined,
      });
    }

    // Clean up chunks
    for (const row of chunkRows) {
      await ctx.db.delete(row._id);
    }
  },
});


// ── Exported types ────────────────────────────────────────────────

export type { StatsRowResult };
