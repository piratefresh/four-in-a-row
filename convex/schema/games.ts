import { defineTable } from "convex/server";
import { v } from "convex/values";
import { resolvedGameConfigValidator } from "../gameConfig";
import {
  gameDeckTileValidator,
  gameStageValidator,
  gameStatusValidator,
  gameTileValidator,
} from "../gameState";

export const gameTables = {
  games: defineTable({
    roomId: v.string(),
    stage: gameStageValidator,
    communityTiles: v.array(gameTileValidator),
    deck: v.array(gameDeckTileValidator),
    pot: v.number(),
    currentBet: v.number(),
    currentPlayerIndex: v.number(),
    dealerButtonIndex: v.optional(v.number()),
    smallBlindIndex: v.optional(v.number()),
    bigBlindIndex: v.optional(v.number()),
    raisesThisRound: v.optional(v.number()),
    status: gameStatusValidator,
    winnerId: v.optional(v.string()),
    winningWord: v.optional(v.string()),
    winningScore: v.optional(v.number()),
    winningScoreBreakdown: v.optional(
      v.object({
        basePoints: v.number(),
        multiplierBonus: v.number(),
        fullRackBonus: v.number(),
      }),
    ),
    showdownStartedAt: v.optional(v.number()),
    turnStartedAt: v.optional(v.number()),
    turnClockCalledAt: v.optional(v.number()),
    turnClockExpiresAt: v.optional(v.number()),
    turnClockCallerPlayerId: v.optional(v.string()),
    turnClockTargetPlayerId: v.optional(v.string()),
    lastBotTurnScheduledAt: v.optional(v.number()),
    config: v.optional(resolvedGameConfigValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_status", ["roomId", "status"]),
  playerHands: defineTable({
    gameId: v.id("games"),
    playerId: v.string(),
    tiles: v.array(gameDeckTileValidator),
    chips: v.number(),
    betThisRound: v.number(),
    totalBet: v.number(),
    hasActed: v.boolean(),
    hasFolded: v.boolean(),
    lastAction: v.optional(
      v.union(
        v.literal("check"),
        v.literal("call"),
        v.literal("raise"),
        v.literal("fold"),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"]),
  wordSubmissions: defineTable({
    gameId: v.id("games"),
    playerId: v.string(),
    stage: gameStageValidator,
    word: v.string(),
    tiles: v.array(
      v.object({
        letter: v.string(),
        baseValue: v.number(),
        multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
        source: v.union(v.literal("hand"), v.literal("community")),
        cardIndex: v.optional(v.number()),
        wasChoice: v.optional(v.boolean()),
      }),
    ),
    choiceResolutions: v.optional(
      v.object({
        hand: v.optional(v.record(v.string(), v.string())),
        community: v.optional(v.record(v.string(), v.string())),
      }),
    ),
    score: v.number(),
    scoreBreakdown: v.object({
      basePoints: v.number(),
      multiplierBonus: v.number(),
      fullRackBonus: v.number(),
    }),
    createdAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_player", ["gameId", "playerId"])
    .index("by_player", ["playerId"]),
};
