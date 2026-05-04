import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { DEV_BOT_AUTH_PREFIX, INITIAL_CHIPS } from "./games/gamesShared";

const AI_DEALER_PLAYER_ID = "ai_dealer";

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

type PlayerIdentity = {
  authUserId: string;
  name: string;
  isBot: boolean;
  characterId?: string;
};

// ── On-the-fly stats query ────────────────────────────────────────

const recentWordsLimit = 50;

export const getAllStats = query({
  args: {
    filter: v.optional(
      v.union(v.literal("all"), v.literal("players"), v.literal("bots")),
    ),
    days: v.optional(v.number()),
    dateRange: v.optional(v.object({ start: v.number(), end: v.number() })),
  },
  handler: async (ctx, args) => {
    // 1. Build player identity map from all players
    const allPlayers = await ctx.db.query("players").collect();
    const playerMap = new Map<string, PlayerIdentity>();

    for (const p of allPlayers) {
      const isBot = isBotAuthUserId(p.authUserId);
      const characterId = isBot ? extractCharacterId(p.authUserId) : undefined;
      playerMap.set(String(p._id), {
        authUserId: p.authUserId,
        name: p.name,
        isBot,
        characterId,
      });
    }

    // 2. Get completed games, optionally time-filtered
    const allGames = await ctx.db.query("games").collect();
    const completedGames = allGames.filter((g) => g.status === "completed");

    let games = completedGames;
    const now = Date.now();
    if (args.dateRange) {
      games = games.filter(
        (g) =>
          g.createdAt >= args.dateRange!.start &&
          g.createdAt <= args.dateRange!.end,
      );
    } else if (args.days) {
      const cutoff = now - args.days * 24 * 60 * 60 * 1000;
      games = games.filter((g) => g.createdAt >= cutoff);
    }

    if (games.length === 0) return [];

    // 3. Batch-query all hands, submissions, traces for matching games
    const handsPromises = games.map((g) =>
      ctx.db
        .query("playerHands")
        .withIndex("by_game", (q) => q.eq("gameId", g._id))
        .collect(),
    );
    const subsPromises = games.map((g) =>
      ctx.db
        .query("wordSubmissions")
        .withIndex("by_game", (q) => q.eq("gameId", g._id))
        .collect(),
    );
    const tracesPromises = games.map((g) =>
      ctx.db
        .query("gameTraces")
        .withIndex("by_gameId_createdAt", (q) => q.eq("gameId", g._id))
        .collect(),
    );

    const [handResults, subResults, traceResults] = await Promise.all([
      Promise.all(handsPromises),
      Promise.all(subsPromises),
      Promise.all(tracesPromises),
    ]);

    // 4. Build game-indexed maps
    const handsByGame = new Map<string, Doc<"playerHands">[]>();
    const subsByGame = new Map<string, Doc<"wordSubmissions">[]>();
    const tracesByGame = new Map<string, Doc<"gameTraces">[]>();

    for (let i = 0; i < games.length; i++) {
      const gameId = games[i]._id;
      handsByGame.set(gameId, handResults[i]);
      subsByGame.set(gameId, subResults[i]);
      tracesByGame.set(gameId, traceResults[i]);
    }

    // 5. Accumulate stats per identity
    const accumulators = new Map<string, StatsAccumulator>();

    function getAccumulator(identity: PlayerIdentity): StatsAccumulator {
      // Group bots by characterId, humans by authUserId
      const key = identity.isBot
        ? `bot:${identity.characterId}`
        : `human:${identity.authUserId}`;

      let acc = accumulators.get(key);
      if (!acc) {
        acc = {
          identity: {
            type: identity.isBot ? "bot" : "human",
            authUserId: identity.isBot ? undefined : identity.authUserId,
            characterId: identity.characterId,
            name: identity.name,
          },
          gamesPlayed: 0,
          gamesWon: 0,
          totalChipsWon: 0,
          totalChipsLost: 0,
          bestChipFinish: 0,
          showdownsReached: 0,
          showdownsWon: 0,
          totalChecks: 0,
          totalCalls: 0,
          totalRaises: 0,
          totalFolds: 0,
          foldsByStage: { preflop: 0, flop: 0, turn: 0, final: 0 },
          survivingPreflop: 0,
          allWords: [],
          totalAiDecisions: 0,
          totalAiSuccesses: 0,
          totalAiFailures: 0,
          totalBluffs: 0,
          totalFallbacks: 0,
          latencyTotal: 0,
          latencySamples: 0,
          handStrengthTotal: 0,
          handStrengthSamples: 0,
          lastGameAt: 0,
        };
        accumulators.set(key, acc);
      }
      return acc;
    }

    // Process hands
    for (const game of games) {
      const hands = handsByGame.get(game._id) ?? [];
      const winnerId = game.winnerId;
      const gameTime = game.createdAt;

      for (const hand of hands) {
        if (hand.playerId === AI_DEALER_PLAYER_ID) continue;

        const playerInfo = playerMap.get(hand.playerId);
        if (!playerInfo) continue;

        const acc = getAccumulator(playerInfo);

        acc.gamesPlayed++;
        if (gameTime > acc.lastGameAt) acc.lastGameAt = gameTime;

        const won = hand.playerId === winnerId;
        if (won) acc.gamesWon++;

        const chipsDelta = hand.chips + hand.totalBet - INITIAL_CHIPS;
        if (chipsDelta > 0) acc.totalChipsWon += chipsDelta;
        else if (chipsDelta < 0) acc.totalChipsLost += Math.abs(chipsDelta);
        if (hand.chips > acc.bestChipFinish) acc.bestChipFinish = hand.chips;
      }

      // Process word submissions
      const subs = subsByGame.get(game._id) ?? [];
      for (const sub of subs) {
        const playerInfo = playerMap.get(sub.playerId);
        if (!playerInfo) continue;
        const acc = getAccumulator(playerInfo);

        // Count showdowns reached/won
        const hand = hands.find((h) => h.playerId === sub.playerId);
        if (hand && !hand.hasFolded) {
          // They're in showdown if they haven't folded and submitted a word
          // But we can't dedupe per-game here simply. Let's handle with a set.
        }

        acc.allWords.push({
          word: sub.word,
          score: sub.score,
          gameId: game._id,
          createdAt: sub.createdAt,
        });
      }

      // Process traces
      const traces = tracesByGame.get(game._id) ?? [];
      const tracesByPlayer = new Map<string, Doc<"gameTraces">[]>();
      for (const trace of traces) {
        const pid = trace.playerId;
        if (!pid) continue;
        if (!tracesByPlayer.has(pid)) tracesByPlayer.set(pid, []);
        tracesByPlayer.get(pid)!.push(trace);
      }

      for (const hand of hands) {
        if (hand.playerId === AI_DEALER_PLAYER_ID) continue;
        const playerInfo = playerMap.get(hand.playerId);
        if (!playerInfo) continue;
        const acc = getAccumulator(playerInfo);
        const playerTraces = tracesByPlayer.get(hand.playerId) ?? [];

        // Showdowns
        if (!hand.hasFolded) {
          acc.showdownsReached++;
          if (hand.playerId === winnerId) {
            acc.showdownsWon++;
          }
        }

        // Count betting actions
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
            // Track fold by stage
            const stage = trace.stage;
            if (stage === "preflop") {
              acc.foldsByStage.preflop++;
              foldedPreflop = true;
            } else if (stage === "flop") acc.foldsByStage.flop++;
            else if (stage === "turn") acc.foldsByStage.turn++;
            else if (stage === "final") acc.foldsByStage.final++;
          }
        }

        // If hand hasFolded but no fold trace, still count it
        if (hand.hasFolded && !foldedThisGame) {
          acc.totalFolds++;
          // Can't determine stage, count as preflop as closest guess
          acc.foldsByStage.preflop++;
          foldedPreflop = true;
        }

        if (!foldedPreflop) acc.survivingPreflop++;

        // AI traces
        for (const trace of playerTraces) {
          if (!trace.category.startsWith("ai_")) continue;

          acc.totalAiDecisions++;
          if (trace.success) acc.totalAiSuccesses++;
          else acc.totalAiFailures++;
          if (trace.isBluffing) acc.totalBluffs++;
          if (trace.usedFallback) acc.totalFallbacks++;

          if (
            typeof trace.latencyMs === "number" &&
            Number.isFinite(trace.latencyMs)
          ) {
            acc.latencyTotal += trace.latencyMs;
            acc.latencySamples++;
          }
          if (
            typeof trace.handStrength === "number" &&
            Number.isFinite(trace.handStrength)
          ) {
            acc.handStrengthTotal += trace.handStrength;
            acc.handStrengthSamples++;
          }
        }
      }
    }

    // 6. Compute derived stats and build result
    const result: StatsRow[] = [];

    for (const acc of accumulators.values()) {
      // Skip if filter doesn't match
      if (args.filter === "players" && acc.identity.type === "bot") continue;
      if (args.filter === "bots" && acc.identity.type === "human") continue;

      const {
        gamesPlayed,
        gamesWon,
        totalChipsWon,
        totalChipsLost,
        totalChecks,
        totalCalls,
        totalRaises,
        totalFolds,
        survivingPreflop,
        allWords,
        totalAiDecisions,
        totalAiSuccesses,
        totalAiFailures,
        totalBluffs,
        totalFallbacks,
      } = acc;

      const winRate = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0;
      const netChips = totalChipsWon - totalChipsLost;
      const totalActions = totalChecks + totalCalls + totalRaises + totalFolds;

      // Word stats
      const sortedWords = [...allWords].sort(
        (a, b) => b.createdAt - a.createdAt,
      );
      const recentWords = sortedWords.slice(0, recentWordsLimit);
      const totalWordScore = allWords.reduce((s, w) => s + w.score, 0);
      const avgWordScore =
        allWords.length > 0 ? totalWordScore / allWords.length : 0;
      let bestWord: string | null = null;
      let bestWordScore = 0;
      let longestWord: string | null = null;
      for (const w of allWords) {
        if (w.score > bestWordScore) {
          bestWordScore = w.score;
          bestWord = w.word;
        }
        if (!longestWord || w.word.length > longestWord.length) {
          longestWord = w.word;
        }
      }

      // VPIP
      const vpip = gamesPlayed > 0 ? survivingPreflop / gamesPlayed : 0;

      // Aggression factor
      const aggressionFactor =
        totalCalls > 0 ? totalRaises / totalCalls : totalRaises;

      // Fold %
      const foldPercent = totalActions > 0 ? totalFolds / totalActions : 0;

      // AI derived stats
      const bluffRate =
        totalAiDecisions > 0 ? totalBluffs / totalAiDecisions : undefined;
      const fallbackRate =
        totalAiDecisions > 0 ? totalFallbacks / totalAiDecisions : undefined;
      const avgLatencyMs =
        acc.latencySamples > 0
          ? acc.latencyTotal / acc.latencySamples
          : undefined;
      const avgHandStrength =
        acc.handStrengthSamples > 0
          ? acc.handStrengthTotal / acc.handStrengthSamples
          : undefined;

      result.push({
        identity: acc.identity,
        gamesPlayed,
        gamesWon,
        winRate,
        netChips,
        totalChipsWon,
        totalChipsLost,
        bestChipFinish: acc.bestChipFinish,
        showdownsReached: acc.showdownsReached,
        showdownsWon: acc.showdownsWon,
        totalWords: allWords.length,
        avgWordScore,
        bestWord,
        bestWordScore,
        longestWord,
        recentWords: recentWords.map((w) => ({
          word: w.word,
          score: w.score,
          createdAt: w.createdAt,
        })),
        totalChecks,
        totalCalls,
        totalRaises,
        totalFolds,
        foldPercent,
        vpip,
        aggressionFactor,
        foldsByStage: acc.foldsByStage,
        totalBluffs: acc.identity.type === "bot" ? totalBluffs : undefined,
        totalFallbacks:
          acc.identity.type === "bot" ? totalFallbacks : undefined,
        bluffRate,
        fallbackRate,
        avgLatencyMs,
        avgHandStrength,
        totalAiDecisions:
          acc.identity.type === "bot" ? totalAiDecisions : undefined,
        totalAiSuccesses:
          acc.identity.type === "bot" ? totalAiSuccesses : undefined,
        totalAiFailures:
          acc.identity.type === "bot" ? totalAiFailures : undefined,
        lastGameAt: acc.lastGameAt,
      });
    }

    // Sort by games played descending (same as old leaderboard)
    result.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    return result;
  },
});


// ── Internal types ─────────────────────────────────────────────────

interface StatsRow {
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

interface StatsAccumulator {
  identity: StatsRow["identity"];
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
  allWords: Array<{
    word: string;
    score: number;
    gameId: string;
    createdAt: number;
  }>;
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
