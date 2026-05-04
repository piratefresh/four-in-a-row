/**
 * AI Decision-Making Actions for Word Poker
 *
 * Thin aggregator — implementations live in ai/aiBetting.ts and ai/aiShowdown.ts.
 * Shared types and utilities live in ai/aiShared.ts.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { aiDecideBetHandler } from "./ai/aiBetting";
import { aiSubmitWordHandler } from "./ai/aiShowdown";

// Re-export types for backward compatibility
export type { AIBettingDecision, AIWordResult } from "./ai/aiShared";

export const aiDecideBet = internalAction({
  args: {
    difficulty: v.optional(v.string()),
    personality: v.optional(v.string()),
    handTiles: v.array(
      v.union(
        v.object({
          kind: v.literal("single"),
          letter: v.string(),
          baseValue: v.number(),
          multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
        }),
        v.object({
          kind: v.literal("choice"),
          options: v.array(v.string()),
          baseValues: v.array(v.number()),
          multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
        })
      )
    ),
    communityTiles: v.array(
      v.union(
        v.object({
          kind: v.literal("single"),
          letter: v.string(),
          baseValue: v.number(),
          multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
          revealed: v.boolean(),
        }),
        v.object({
          kind: v.literal("choice"),
          options: v.array(v.string()),
          baseValues: v.array(v.number()),
          multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
          revealed: v.boolean(),
        })
      )
    ),
    stage: v.string(),
    currentBet: v.number(),
    chips: v.number(),
    pot: v.number(),
    raiseLadder: v.array(v.number()),
    maxRaises: v.number(),
    currentRaises: v.number(),
    timeoutMs: v.optional(v.number()),
    bluffDetected: v.optional(v.boolean()),
    believesPlayer: v.optional(v.union(v.literal(true), v.literal(false), v.null())),
    gameId: v.optional(v.id("games")),
    roomId: v.optional(v.id("rooms")),
    playerId: v.optional(v.string()),
    playerName: v.optional(v.string()),
    characterId: v.optional(v.string()),
  },
  handler: aiDecideBetHandler,
});

export const aiSubmitWord = internalAction({
  args: {
    difficulty: v.optional(v.string()),
    personality: v.optional(v.string()),
    handTiles: v.array(
      v.union(
        v.object({
          kind: v.literal("single"),
          letter: v.string(),
          baseValue: v.number(),
          multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
        }),
        v.object({
          kind: v.literal("choice"),
          options: v.array(v.string()),
          baseValues: v.array(v.number()),
          multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
        })
      )
    ),
    communityTiles: v.array(
      v.union(
        v.object({
          kind: v.literal("single"),
          letter: v.string(),
          baseValue: v.number(),
          multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
          revealed: v.boolean(),
        }),
        v.object({
          kind: v.literal("choice"),
          options: v.array(v.string()),
          baseValues: v.array(v.number()),
          multiplier: v.optional(v.union(v.literal("2L"), v.literal("3L"))),
          revealed: v.boolean(),
        })
      )
    ),
    timeoutMs: v.optional(v.number()),
    bluffDetected: v.optional(v.boolean()),
    believesPlayer: v.optional(v.union(v.literal(true), v.literal(false), v.null())),
    gameId: v.optional(v.id("games")),
    roomId: v.optional(v.id("rooms")),
    playerId: v.optional(v.string()),
    playerName: v.optional(v.string()),
    characterId: v.optional(v.string()),
  },
  handler: aiSubmitWordHandler,
});
