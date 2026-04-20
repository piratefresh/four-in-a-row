/**
 * AI Decision-Making Actions for Word Poker
 *
 * Betting decisions use NVIDIA NIM. Showdown word generation is deterministic.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import type { GameStage } from "./gameState";
import {
  getGameRulesForAI,
  getStageStrategy,
  estimateHandStrength,
  getQuickRecommendation,
} from "./gameRules";
import {
  type AIPersonality,
  type AIDifficulty,
  AI_DIFFICULTY,
  AI_PERSONALITIES,
  getModelForDifficulty,
  shouldBluff,
} from "./aiStrategy";
import {
  callNvidiaNimChat,
  isNvidiaNimConfigured,
} from "./aiClient";
import {
  buildAvailableShowdownTiles,
  type SolveShowdownCommunityTile,
  type SolveShowdownHandTile,
  serializeAvailableShowdownTiles,
  solveDeterministicShowdownWord,
} from "./showdownSolver";

/**
 * AI Betting Decision Result
 */
export type AIBettingDecision = {
  action: "fold" | "check" | "call" | "raise";
  raiseAmount?: number;
  reasoning: string;
  confidence: number; // 0-1
};

/**
 * AI Word Building Result
 */
export type AIWordResult = {
  word: string;
  tiles: Array<{
    letter: string;
    baseValue: number;
    multiplier?: "2L" | "3L";
    source: "hand" | "community";
    cardIndex?: number;
    wasChoice?: boolean;
  }>;
  choiceResolutions?: {
    hand?: Record<string, string>;
    community?: Record<string, string>;
  };
  reasoning: string;
  estimatedScore: number;
};

const DEFAULT_AI_REQUEST_TIMEOUT_MS = 15_000;

function normalizeAiTimeoutMs(timeoutMs?: number): number {
  return Math.max(1_000, Math.floor(timeoutMs ?? DEFAULT_AI_REQUEST_TIMEOUT_MS));
}

function logAIDebug(
  scope: "betting" | "showdown",
  message: string,
  details: Record<string, unknown>,
) {
  console.log(`[ai:${scope}] ${message}`, details);
}

/**
 * Internal action: AI decides how to bet
 */
export const aiDecideBet = internalAction({
  args: {
    difficulty: v.optional(v.string()),
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
  },
  handler: async (_ctx, args): Promise<AIBettingDecision> => {
    const difficulty = (args.difficulty as AIDifficulty) || AI_DIFFICULTY.MEDIUM;
    const timeoutMs = normalizeAiTimeoutMs(args.timeoutMs);

    if (!isNvidiaNimConfigured()) {
      console.warn("NVIDIA_NIM_API_KEY not set, using fallback strategy");
      logAIDebug("betting", "NVIDIA_NIM_API_KEY missing, using fallback strategy", {
        difficulty,
        stage: args.stage,
        currentBet: args.currentBet,
        chips: args.chips,
        pot: args.pot,
        currentRaises: args.currentRaises,
        timeoutMs,
      });
      return fallbackBettingDecision(args);
    }

    try {
      const model = getModelForDifficulty(difficulty);
      // Filter revealed community tiles
      const revealedCommunity = args.communityTiles
        .filter((t) => t.revealed)
        .map((t) => {
          if (t.kind === "single") {
            return { letter: t.letter, baseValue: t.baseValue };
          } else {
            // For choice tiles, use average value
            const avgValue = t.baseValues.reduce((a, b) => a + b, 0) / t.baseValues.length;
            return { letter: t.options.join("/"), baseValue: avgValue };
          }
        });

      // Simplify hand tiles for strength calculation
      const simplifiedHand = args.handTiles.map((t) => {
        if (t.kind === "single") {
          return { letter: t.letter, baseValue: t.baseValue };
        } else {
          const avgValue = t.baseValues.reduce((a, b) => a + b, 0) / t.baseValues.length;
          return { letter: t.options.join("/"), baseValue: avgValue };
        }
      });

      // Estimate hand strength
      const handStrength = estimateHandStrength(simplifiedHand, revealedCommunity);

      // Check if AI should bluff
      const isBluffing = shouldBluff(difficulty) && handStrength < 0.5;

      // Get quick recommendation
      const quickRec = getQuickRecommendation(
        handStrength,
        args.currentBet,
        args.chips,
        args.pot,
        args.stage as GameStage
      );

      logAIDebug("betting", "prepared betting prompt inputs", {
        difficulty,
        model,
        handStrength,
        isBluffing,
        quickRecommendation: quickRec,
        stage: args.stage,
        currentBet: args.currentBet,
        chips: args.chips,
        pot: args.pot,
        currentRaises: args.currentRaises,
        timeoutMs,
      });

      // Build prompt for AI
      const gameRules = getGameRulesForAI();
      const stageStrategy = getStageStrategy(args.stage as GameStage);

      const handDescription = args.handTiles
        .map((t) => {
          if (t.kind === "single") {
            return `${t.letter}(${t.baseValue})`;
          } else {
            return `[${t.options.join("/")}](${t.baseValues.join("/")})`;
          }
        })
        .join(", ");

      const communityDescription = args.communityTiles
        .filter((t) => t.revealed)
        .map((t) => {
          if (t.kind === "single") {
            return `${t.letter}(${t.baseValue})`;
          } else {
            return `[${t.options.join("/")}](${t.baseValues.join("/")})`;
          }
        })
        .join(", ");

      const prompt = `${gameRules}

${stageStrategy}

## Current Situation
Your hand (private): ${handDescription}
Community tiles (revealed): ${communityDescription || "None yet"}
Stage: ${args.stage}
Current bet: ${args.currentBet} chips
Your chips: ${args.chips}
Pot size: ${args.pot}
Raises this round: ${args.currentRaises}/${args.maxRaises}

## Your Task
Decide your betting action. Your options:
${args.currentBet === 0 ? "- CHECK (pass, no cost)" : ""}
${args.currentBet > 0 ? `- CALL (pay ${args.currentBet} chips to stay in)` : ""}
${args.currentRaises < args.maxRaises ? `- RAISE (increase bet to next level: ${args.raiseLadder.find((amt) => amt > args.currentBet) || "MAX"})` : ""}
- FOLD (exit round, lose bets already made)

Analyze:
1. Can you form a strong word with these tiles?
2. Is the pot worth competing for?
3. What's your hand strength?
4. Should you fold, call, or raise?

Respond in this EXACT format:
ACTION: [FOLD/CHECK/CALL/RAISE]
RAISE_AMOUNT: [number if ACTION is RAISE, otherwise omit]
CONFIDENCE: [0.0-1.0]
REASONING: [Brief explanation]

Example:
ACTION: CALL
CONFIDENCE: 0.7
REASONING: I have E and A in hand with T and R in community, can likely form RATE or TEAR. Pot odds are good.`;

      const response = await callNvidiaNimChat({
        model,
        prompt,
        timeoutMs,
      });
      logAIDebug("betting", "received raw betting response", {
        model,
        timeoutMs,
        response,
      });

      // Parse AI response
      const actionMatch = response.match(/ACTION:\s*(FOLD|CHECK|CALL|RAISE)/i);
      const raiseMatch = response.match(/RAISE_AMOUNT:\s*(\d+)/i);
      const confidenceMatch = response.match(/CONFIDENCE:\s*([\d.]+)/i);
      const reasoningMatch = response.match(/REASONING:\s*(.+)/i);

      const action = (actionMatch?.[1]?.toLowerCase() || quickRec) as AIBettingDecision["action"];
      const confidence = parseFloat(confidenceMatch?.[1] || "0.5");
      const reasoning = reasoningMatch?.[1]?.trim() || "AI strategic decision";

      let raiseAmount: number | undefined;
      if (action === "raise") {
        raiseAmount = parseInt(raiseMatch?.[1] || "0", 10);
        if (!raiseAmount || raiseAmount <= args.currentBet) {
          // Find next valid raise amount
          raiseAmount = args.raiseLadder.find((amt) => amt > args.currentBet);
        }
      }

      logAIDebug("betting", "parsed betting response", {
        action,
        raiseAmount,
        confidence,
        reasoning,
      });

      return {
        action,
        raiseAmount,
        reasoning,
        confidence,
      };
    } catch (error) {
      console.error("AI betting decision error:", error);
      return fallbackBettingDecision(args);
    }
  },
});

/**
 * Fallback betting decision (if OpenRouter fails)
 */
function fallbackBettingDecision(args: any): AIBettingDecision {
  const handStrength = estimateHandStrength(
    args.handTiles.map((t: any) => ({
      letter: t.kind === "single" ? t.letter : t.options[0],
      baseValue: t.kind === "single" ? t.baseValue : t.baseValues[0],
    })),
    args.communityTiles
      .filter((t: any) => t.revealed)
      .map((t: any) => ({
        letter: t.kind === "single" ? t.letter : t.options[0],
        baseValue: t.kind === "single" ? t.baseValue : t.baseValues[0],
      }))
  );

  const action = getQuickRecommendation(
    handStrength,
    args.currentBet,
    args.chips,
    args.pot,
    args.stage as GameStage
  );

  let raiseAmount: number | undefined;
  if (action === "raise") {
    raiseAmount = args.raiseLadder.find((amt: number) => amt > args.currentBet);
  }

  logAIDebug("betting", "computed fallback betting decision", {
    action,
    raiseAmount,
    handStrength,
    currentBet: args.currentBet,
    chips: args.chips,
    pot: args.pot,
    stage: args.stage,
  });

  return {
    action,
    raiseAmount,
    reasoning: "Fallback strategy (API unavailable)",
    confidence: handStrength,
  };
}

/**
 * Internal action: AI builds best word during showdown
 */
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
  },
  handler: async (_ctx, args): Promise<AIWordResult> => {
    const difficulty = (args.difficulty as AIDifficulty) || AI_DIFFICULTY.MEDIUM;
    const personality =
      (args.personality as AIPersonality | undefined) || AI_PERSONALITIES.BALANCED;
    const timeoutMs = normalizeAiTimeoutMs(args.timeoutMs);
    const availableShowdownTiles = buildAvailableShowdownTiles(
      args.handTiles as SolveShowdownHandTile[],
      args.communityTiles as SolveShowdownCommunityTile[],
    );

    logAIDebug("showdown", "prepared showdown solver inputs", {
      difficulty,
      personality,
      handTileCount: args.handTiles.length,
      revealedCommunityCount: args.communityTiles.filter((tile) => tile.revealed).length,
      timeoutMs,
      availableTiles: serializeAvailableShowdownTiles(availableShowdownTiles),
    });

    const selection = solveDeterministicShowdownWord({
      difficulty,
      personality,
      handTiles: args.handTiles as SolveShowdownHandTile[],
      communityTiles: args.communityTiles as SolveShowdownCommunityTile[],
    });

    if (!selection) {
      logAIDebug("showdown", "deterministic showdown solver found no valid candidates", {
        difficulty,
        personality,
        availableTiles: serializeAvailableShowdownTiles(availableShowdownTiles),
      });

      return {
        word: "",
        tiles: [],
        choiceResolutions: undefined,
        reasoning: "No valid deterministic showdown candidates found",
        estimatedScore: 0,
      };
    }

    logAIDebug("showdown", "deterministic showdown solver selected word", {
      difficulty,
      personality: selection.personality,
      word: selection.word,
      tileCount: selection.tiles.length,
      estimatedScore: selection.estimatedScore,
      candidateCount: selection.evaluation.candidateCount,
      topCandidates: selection.evaluation.topCandidates,
    });

    return {
      word: selection.word,
      tiles: selection.tiles,
      choiceResolutions: selection.choiceResolutions,
      reasoning: selection.reasoning,
      estimatedScore: selection.estimatedScore,
    };
  },
});
