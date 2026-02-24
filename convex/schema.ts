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
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("code", ["code"])
    .index("status_lastActiveAt", ["status", "lastActiveAt"]),
  players: defineTable({
    roomId: v.id("rooms"),
    authUserId: v.optional(v.id("user")),
    name: v.string(),
    seatIndex: v.number(),
    playerToken: v.string(),
    isHost: v.boolean(),
    status: v.union(v.literal("active"), v.literal("left")),
    lastSeenAt: v.number(),
  })
    .index("roomId", ["roomId"])
    .index("roomId_status", ["roomId", "status"])
    .index("roomId_seatIndex", ["roomId", "seatIndex"])
    .index("authUserId_status", ["authUserId", "status"])
    .index("playerToken", ["playerToken"]),
  messages: defineTable({
    roomId: v.id("rooms"),
    playerId: v.id("players"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("roomId_createdAt", ["roomId", "createdAt"])
    .index("playerId", ["playerId"]),
  games: defineTable({
    roomId: v.string(),
    stage: gameStageValidator,
    communityTiles: v.array(gameTileValidator),
    deck: v.array(gameDeckTileValidator),
    pot: v.number(),
    currentBet: v.number(),
    currentPlayerIndex: v.number(),
    status: gameStatusValidator,
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"]),
};

export const tables = {
  ...authTables,
  ...appTables,
};

const schema = defineSchema(tables);

export default schema;
