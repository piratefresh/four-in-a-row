/**
 * Debug utilities for testing bot/AI functionality
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Manually trigger bot turn (for debugging)
 */
export const forceBotTurn = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return { ok: false, error: "Game not found" };
    }

    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    const sortedHands = hands.sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt - b.createdAt;
      }
      return a.playerId.localeCompare(b.playerId);
    });
    const currentTurnHand = sortedHands[game.currentPlayerIndex];
    if (!currentTurnHand) {
      return { ok: false, error: "Current turn hand not found" };
    }

    // Manually trigger bot turn processing
    await ctx.scheduler.runAfter(
      0,
      internal.games.internalProcessBotTurn,
      {
        gameId: args.gameId,
        playerId: currentTurnHand.playerId,
      }
    );

    return {
      ok: true,
      message: "Bot turn scheduled",
      gameStage: game.stage,
      currentPlayerIndex: game.currentPlayerIndex,
    };
  },
});

/**
 * Get current game state for debugging
 */
export const getGameDebugInfo = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return null;
    }

    const hands = await ctx.db
      .query("playerHands")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Sort by turn order (same as game logic)
    const sortedHands = hands.sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt - b.createdAt;
      }
      return a.playerId.localeCompare(b.playerId);
    });

    const currentTurnHand = sortedHands[game.currentPlayerIndex];

    return {
      gameId: game._id,
      status: game.status,
      stage: game.stage,
      currentPlayerIndex: game.currentPlayerIndex,
      currentBet: game.currentBet,
      pot: game.pot,
      currentTurnPlayerId: currentTurnHand?.playerId,
      currentTurnChips: currentTurnHand?.chips,
      currentTurnBet: currentTurnHand?.betThisRound,
      currentTurnFolded: currentTurnHand?.hasFolded,
      currentTurnActed: currentTurnHand?.hasActed,
      allHands: sortedHands.map((h, idx) => ({
        index: idx,
        playerId: h.playerId,
        chips: h.chips,
        betThisRound: h.betThisRound,
        hasActed: h.hasActed,
        hasFolded: h.hasFolded,
        isCurrentTurn: idx === game.currentPlayerIndex,
      })),
    };
  },
});
