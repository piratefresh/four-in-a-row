import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { gameDeckTileValidator } from "./gameState";
import {
  callHandler,
  checkHandler,
  foldHandler,
  internalProcessBotTurnHandler,
  internalResolveExpiredTurnClockHandler,
  raiseHandler,
} from "./games/gamesBetting";
import { createGameForRoomHandler, internalRedealGameForRoomHandler, internalStartGameHandler, redealGameForRoomHandler, startGameHandler } from "./games/gamesSetup";
import { getGameByRoomHandler, getPlayerHandsHandler, internalGetGameRuntimeStateHandler } from "./games/gamesRuntime";
import { forfeitShowdownHandler, getShowdownResultsHandler, getWordSubmissionsHandler, internalProcessBotShowdownHandler, internalResolveExpiredShowdownHandler, resolveShowdownHandler, submitWordHandler, submitWordInternalHandler } from "./games/gamesShowdown";

const submitWordTileValidator = v.object({
  letter: v.string(),
  baseValue: v.number(),
  multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
  source: v.union(v.literal("hand"), v.literal("community")),
  cardIndex: v.optional(v.number()),
  wasChoice: v.optional(v.boolean()),
});

const choiceResolutionsValidator = v.object({
  hand: v.optional(v.record(v.string(), v.string())),
  community: v.optional(v.record(v.string(), v.string())),
});

export const createGameForRoom = mutation({
  args: { roomId: v.string(), deck: v.optional(v.array(gameDeckTileValidator)) },
  handler: createGameForRoomHandler,
});

export const startGame = mutation({
  args: { gameId: v.id("games") },
  handler: startGameHandler,
});

export const redealGameForRoom = mutation({
  args: { roomId: v.string() },
  handler: redealGameForRoomHandler,
});

export const internalStartGame = internalMutation({
  args: { gameId: v.id("games") },
  handler: internalStartGameHandler,
});

export const internalRedealGameForRoom = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: internalRedealGameForRoomHandler,
});

export const internalProcessBotTurn = internalAction({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
    expectedStage: v.optional(v.string()),
    expectedCurrentPlayerIndex: v.optional(v.number()),
    expectedTurnStartedAt: v.optional(v.number()),
  },
  handler: internalProcessBotTurnHandler,
});

export const getGameByRoom = query({
  args: { roomId: v.string() },
  handler: getGameByRoomHandler,
});

export const getPlayerHands = query({
  args: { gameId: v.id("games") },
  handler: getPlayerHandsHandler,
});

export const internalGetGameRuntimeState = internalQuery({
  args: { gameId: v.id("games") },
  handler: internalGetGameRuntimeStateHandler,
});

export const check = mutation({
  args: { gameId: v.id("games"), playerId: v.string() },
  handler: checkHandler,
});

export const call = mutation({
  args: { gameId: v.id("games"), playerId: v.string() },
  handler: callHandler,
});

export const raise = mutation({
  args: { gameId: v.id("games"), playerId: v.string(), raiseToAmount: v.number() },
  handler: raiseHandler,
});

export const fold = mutation({
  args: { gameId: v.id("games"), playerId: v.string() },
  handler: foldHandler,
});

export const internalResolveExpiredTurnClock = internalMutation({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
    turnClockExpiresAt: v.number(),
  },
  handler: internalResolveExpiredTurnClockHandler,
});

export const submitWordInternal = internalMutation({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
    word: v.string(),
    tiles: v.array(submitWordTileValidator),
    choiceResolutions: v.optional(choiceResolutionsValidator),
    invalidWord: v.optional(v.boolean()),
  },
  handler: submitWordInternalHandler,
});

export const forfeitShowdown = mutation({
  args: { gameId: v.id("games"), playerId: v.string() },
  handler: forfeitShowdownHandler,
});

export const submitWord = action({
  args: {
    gameId: v.id("games"),
    playerId: v.string(),
    word: v.string(),
    tiles: v.array(submitWordTileValidator),
    choiceResolutions: v.optional(choiceResolutionsValidator),
  },
  handler: submitWordHandler,
});

export const resolveShowdown = mutation({
  args: { gameId: v.id("games") },
  handler: resolveShowdownHandler,
});

export const internalResolveExpiredShowdown = internalMutation({
  args: { gameId: v.id("games"), showdownStartedAt: v.number() },
  handler: internalResolveExpiredShowdownHandler,
});

export const getWordSubmissions = query({
  args: { gameId: v.id("games") },
  handler: getWordSubmissionsHandler,
});

export const getShowdownResults = query({
  args: { gameId: v.id("games") },
  handler: getShowdownResultsHandler,
});

export const internalProcessBotShowdown = internalAction({
  args: { gameId: v.id("games"), playerId: v.string() },
  handler: internalProcessBotShowdownHandler,
});
