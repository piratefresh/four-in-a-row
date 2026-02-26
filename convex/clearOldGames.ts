import { mutation } from "./_generated/server";

// Helper mutation to clear all old games and start fresh
export const clearAllGames = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all games
    const games = await ctx.db.query("games").collect();
    for (const game of games) {
      await ctx.db.delete(game._id);
    }

    // Delete all player hands
    const hands = await ctx.db.query("playerHands").collect();
    for (const hand of hands) {
      await ctx.db.delete(hand._id);
    }

    // Delete all word submissions
    const submissions = await ctx.db.query("wordSubmissions").collect();
    for (const submission of submissions) {
      await ctx.db.delete(submission._id);
    }

    // Optionally clear rooms too (uncomment if you want to start completely fresh)
    const rooms = await ctx.db.query("rooms").collect();
    for (const room of rooms) {
      await ctx.db.delete(room._id);
    }

    return {
      deletedGames: games.length,
      deletedHands: hands.length,
      deletedSubmissions: submissions.length,
      deletedRooms: rooms.length,
      message: "All games, hands, submissions, and rooms cleared. Create a new room to start fresh!",
    };
  },
});
