import { v } from "convex/values";
import { query } from "./_generated/server";

function getInitials(name?: string): string {
  const safe = name?.trim();
  if (!safe) return "??";
  const parts = safe.split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export const getPeriodRecords = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    type RecordCard = {
      word?: string;
      score?: number;
      amount?: number;
      wins?: number;
      playerName: string;
      playerInitials: string;
      roomTitle?: string;
      how?: string;
      ongoing?: boolean;
    };

    let longestWord: RecordCard | null = null;
    let biggestPot: RecordCard | null = null;
    let hotStreak: RecordCard | null = null;

    // Build player name lookup
    const allPlayers = await ctx.db.query("players").collect();
    const playerMap = new Map<string, { name: string }>();
    for (const p of allPlayers) {
      playerMap.set(String(p._id), { name: p.name });
    }

    function resolvePlayerName(playerId: string): string {
      const player = playerMap.get(playerId);
      if (player) return player.name;
      return "Unknown";
    }

    // ── 1. Longest word from stats cache ────────────────────────
    const cacheKey = `all:days:${days}`;
    const cached = await ctx.db
      .query("statsSnapshot")
      .withIndex("by_key", (q) => q.eq("cacheKey", cacheKey))
      .first();

    if (cached && !cached.computing) {
      try {
        const rows = JSON.parse(cached.stats) as Array<{
          identity: { type: string; name: string };
          longestWord: string | null;
          bestWordScore: number;
        }>;
        for (const row of rows) {
          if (row.identity.type !== "human") continue;
          if (!row.longestWord) continue;
          const len = row.longestWord.length;
          if (!longestWord || len > (longestWord.word?.length ?? 0)) {
            longestWord = {
              word: row.longestWord,
              score: row.bestWordScore,
              playerName: row.identity.name,
              playerInitials: getInitials(row.identity.name),
            };
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    // Fallback: if no cached data, scan wordSubmissions directly
    if (!longestWord) {
      const recentSubs = await ctx.db
        .query("wordSubmissions")
        .filter((q) =>
          q.and(q.gt(q.field("score"), 0), q.gte(q.field("createdAt"), cutoff)),
        )
        .order("desc")
        .take(500);
      for (const sub of recentSubs) {
        const name = resolvePlayerName(sub.playerId);
        const initials = getInitials(name);
        if (!longestWord || sub.word.length > (longestWord.word?.length ?? 0)) {
          longestWord = {
            word: sub.word,
            score: sub.score,
            playerName: name,
            playerInitials: initials,
          };
        }
      }
    }

    // ── 2. Biggest pot won ──────────────────────────────────────
    const completedGames = await ctx.db
      .query("games")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("createdAt"), cutoff),
        ),
      )
      .order("desc")
      .take(300);

    for (const game of completedGames) {
      if (!game.winnerId || !game.pot) continue;
      if (game.pot <= (biggestPot?.amount ?? 0)) continue;

      // Verify it's a human winner by checking player hands
      const hands = await ctx.db
        .query("playerHands")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .collect();
      const isHumanWinner = hands.some(
        (h) => h.playerId === game.winnerId && playerMap.has(h.playerId),
      );
      if (!isHumanWinner) continue;

      const room =
        typeof game.roomId === "string"
          ? await ctx.db.query("rooms").withIndex("code", (q) => q.eq("code", game.roomId)).first()
          : null;
      const roomTitle = room?.title ?? room?.code ?? "Unknown Room";

      biggestPot = {
        amount: game.pot,
        playerName: resolvePlayerName(game.winnerId),
        playerInitials: getInitials(resolvePlayerName(game.winnerId)),
        roomTitle,
        how: "all-in",
      };
    }

    // ── 3. Hot streak (longest consecutive human wins) ──────────
    const streakGames = await ctx.db
      .query("games")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("createdAt"), cutoff),
        ),
      )
      .order("asc")
      .take(500);

    const streaks = new Map<
      string,
      { current: number; max: number; lastRoomId: string }
    >();

    for (const game of streakGames) {
      if (!game.winnerId) continue;

      // Check if winner is a human
      const winnerHands = await ctx.db
        .query("playerHands")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .collect();
      const isHuman = winnerHands.some(
        (h) => h.playerId === game.winnerId && playerMap.has(h.playerId),
      );
      if (!isHuman) continue;

      // Get or init streak for this player
      let streak = streaks.get(game.winnerId);
      if (!streak) {
        streak = { current: 0, max: 0, lastRoomId: "" };
        streaks.set(game.winnerId, streak);
      }

      // Increment winner's streak
      streak.current++;
      streak.max = Math.max(streak.max, streak.current);
      streak.lastRoomId = String(game.roomId ?? "");

      // Reset all other players' current streak
      for (const [otherId, otherStreak] of streaks) {
        if (otherId !== game.winnerId) {
          otherStreak.current = 0;
        }
      }
    }

    // Find the best streak
    for (const [playerId, streak] of streaks) {
      if (streak.max > (hotStreak?.wins ?? 0)) {
        const room = streak.lastRoomId
          ? await ctx.db.query("rooms").withIndex("code", (q) => q.eq("code", streak.lastRoomId)).first()
          : null;
        hotStreak = {
          wins: streak.max,
          playerName: resolvePlayerName(playerId),
          playerInitials: getInitials(resolvePlayerName(playerId)),
          roomTitle: room?.title ?? room?.code ?? undefined,
          ongoing: streak.current === streak.max,
        };
      }
    }

    // Don't show streaks of 1
    if (hotStreak && (hotStreak.wins ?? 0) < 2) {
      hotStreak = null;
    }

    return {
      longestWord,
      biggestPot,
      hotStreak,
    };
  },
});
