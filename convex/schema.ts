import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "./schema.auth";
import {
  gameDeckTileValidator,
  gameStageValidator,
  gameStatusValidator,
  gameTileValidator,
} from "./gameState";

export const appTables = {
  rooms: defineTable({
    code: v.string(),
    status: v.union(v.literal("open"), v.literal("closed")),
    maxPlayers: v.number(),
    hostPlayerId: v.optional(v.id("players")),
    nextRoomId: v.optional(v.id("rooms")),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("code", ["code"])
    .index("status_lastActiveAt", ["status", "lastActiveAt"]),
  players: defineTable({
    roomId: v.id("rooms"),
    authUserId: v.string(),
    name: v.string(),
    seatIndex: v.number(),
    isHost: v.boolean(),
    status: v.union(v.literal("active"), v.literal("left")),
    readyStatus: v.optional(v.boolean()),
    lastSeenAt: v.number(),
  })
    .index("roomId", ["roomId"])
    .index("roomId_status", ["roomId", "status"])
    .index("roomId_seatIndex", ["roomId", "seatIndex"])
    .index("authUserId_status", ["authUserId", "status"]),
  messages: defineTable({
    roomId: v.id("rooms"),
    playerId: v.optional(v.id("players")),
    senderAuthUserId: v.optional(v.string()),
    senderName: v.string(),
    text: v.string(),
    type: v.union(v.literal("player"), v.literal("ai"), v.literal("system")),
    createdAt: v.number(),
  })
    .index("roomId_createdAt", ["roomId", "createdAt"]),
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
      })
    ),
    showdownStartedAt: v.optional(v.number()),
    turnStartedAt: v.optional(v.number()),
    turnClockCalledAt: v.optional(v.number()),
    turnClockExpiresAt: v.optional(v.number()),
    turnClockCallerPlayerId: v.optional(v.string()),
    turnClockTargetPlayerId: v.optional(v.string()),
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
        // For resolved choice cards - which card index and which option was chosen
        cardIndex: v.optional(v.number()),
        wasChoice: v.optional(v.boolean()),
      })
    ),
    // Map of card indices to selected letter choices (for choice cards used in submission)
    choiceResolutions: v.optional(
      v.object({
        hand: v.optional(v.record(v.string(), v.string())), // handCardIndex -> selectedLetter
        community: v.optional(v.record(v.string(), v.string())), // communityCardIndex -> selectedLetter
      })
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

export const tables = {
  ...authTables,
  ...appTables,
};

const schema = defineSchema(tables);

export default schema;
