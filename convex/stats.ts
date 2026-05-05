import { query } from "./_generated/server";

export const getTodayStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayTimestamp = startOfDay.getTime();

    // Get all word submissions from today
    const todaySubmissions = await ctx.db
      .query("wordSubmissions")
      .filter((q) => q.gte(q.field("createdAt"), startOfDayTimestamp))
      .collect();

    // Filter for valid words (score > 0)
    const validSubmissions = todaySubmissions.filter((s) => s.score > 0);

    // Find longest word
    let longestWord = "";
    if (validSubmissions.length > 0) {
      const longest = validSubmissions.reduce((prev, current) =>
        current.word.length > prev.word.length ? current : prev
      );
      longestWord = longest.word;
    }

    // Find biggest winner (highest single word score)
    let biggestWinner = "";
    let highestScore = 0;
    if (validSubmissions.length > 0) {
      const winner = validSubmissions.reduce((prev, current) =>
        current.score > prev.score ? current : prev
      );

      // Get player name from playerId string
      try {
        const player = await ctx.db.get(winner.playerId as any);
        if (player && "name" in player) {
          biggestWinner = player.name as string;
        }
      } catch {
        // If playerId is not a valid ID, it might be the AI dealer
        biggestWinner = winner.playerId === "ai_dealer" ? "AI Dealer" : "Unknown Player";
      }

      highestScore = winner.score;
    }

    return {
      longestWord: longestWord || "No words yet",
      biggestWinner: biggestWinner || "No winner yet",
      biggestWinnerScore: highestScore,
      totalWordsToday: validSubmissions.length,
    };
  },
});

export const getAllTimeStats = query({
  args: {},
  handler: async (ctx) => {
    // Default to last 30 days to avoid 16 MB read limit
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const allSubmissions = await ctx.db.query("wordSubmissions").collect();
    const validSubmissions = allSubmissions.filter(
      (s) => s.score > 0 && s.createdAt >= cutoff,
    );

    // Find longest word ever
    let longestWord = "";
    if (validSubmissions.length > 0) {
      const longest = validSubmissions.reduce((prev, current) =>
        current.word.length > prev.word.length ? current : prev
      );
      longestWord = longest.word;
    }

    // Find all-time biggest winner
    let biggestWinner = "";
    let highestScore = 0;
    if (validSubmissions.length > 0) {
      const winner = validSubmissions.reduce((prev, current) =>
        current.score > prev.score ? current : prev
      );

      // Try to get player name
      try {
        const player = await ctx.db.get(winner.playerId as any);
        if (player && "name" in player) {
          biggestWinner = player.name as string;
        }
      } catch {
        // If playerId is not a valid ID, it might be the AI dealer
        biggestWinner = winner.playerId === "ai_dealer" ? "AI Dealer" : "Unknown Player";
      }

      highestScore = winner.score;
    }

    // Find highest scoring word
    let highestScoringWord = "";
    let highestWordScore = 0;
    if (validSubmissions.length > 0) {
      const highestScoring = validSubmissions.reduce((prev, current) =>
        current.score > prev.score ? current : prev
      );
      highestScoringWord = highestScoring.word;
      highestWordScore = highestScoring.score;
    }

    return {
      longestWord: longestWord || "No words yet",
      biggestWinner: biggestWinner || "No winner yet",
      biggestWinnerScore: highestScore,
      highestScoringWord: highestScoringWord || "No words yet",
      highestWordScore: highestWordScore,
      totalWordsAllTime: validSubmissions.length,
    };
  },
});
