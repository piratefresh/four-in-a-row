/**
 * AI Decision-Making Actions for Word Poker
 *
 * Betting decisions use tool-calling LLM with prompt registry.
 * Showdown word generation uses a deterministic solver (fallback planned for LLM).
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import type { GameStage } from "./gameState";
import {
  estimateHandStrength,
  getQuickRecommendation,
} from "./gameRules";
import {
  type AIPersonality,
  type AIDifficulty,
  AI_DIFFICULTY,
  AI_PERSONALITIES,
  AI_PROVIDER,
  getModelForDifficulty,
  getConfiguredAIProvider,
  shouldBluff,
} from "./aiStrategy";
import {
  callNvidiaNimChat,
  isNvidiaNimConfigured,
} from "./aiClient";
import {
  callOpenRouterChat,
  isOpenRouterConfigured,
} from "./openRouterClient";
import {
  buildAvailableShowdownTiles,
  type SolveShowdownCommunityTile,
  type SolveShowdownHandTile,
  serializeAvailableShowdownTiles,
  solveDeterministicShowdownWord,
} from "./showdownSolver";
import { PROMPT_BETTING_TOOLUSE } from "./aiPrompts";
import {
  BETTING_TOOLS,
  type ToolCallResult,
  isBettingToolName,
  parseBettingToolCall,
  parseStructuredTextResponse,
  fixActionForBetState,
} from "./aiTools";

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

    // Determine which AI provider to use
    const provider = getConfiguredAIProvider();
    const useOpenRouter = provider === AI_PROVIDER.OPENROUTER;

    // Check if the selected provider is configured
    const isProviderConfigured = useOpenRouter
      ? isOpenRouterConfigured()
      : isNvidiaNimConfigured();

    if (!isProviderConfigured) {
      const providerName = useOpenRouter ? "OpenRouter" : "NVIDIA NIM";
      const apiKeyName = useOpenRouter ? "OPENROUTER_API_KEY" : "NVIDIA_NIM_API_KEY";
      console.warn(`${apiKeyName} not set, using fallback strategy`);
      logAIDebug("betting", `${providerName} not configured, using fallback strategy`, {
        provider,
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
      const model = getModelForDifficulty(difficulty, provider);
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
        provider,
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

      const nextRaiseStep = args.raiseLadder.find((amt) => amt > args.currentBet);

      const prompt = PROMPT_BETTING_TOOLUSE.build({
        handTiles: handDescription,
        communityTilesRevealed: communityDescription || "None yet",
        stage: args.stage as GameStage,
        currentBet: args.currentBet,
        chips: args.chips,
        pot: args.pot,
        currentRaises: args.currentRaises,
        maxRaises: args.maxRaises,
        raiseLadderNext: nextRaiseStep ? String(nextRaiseStep) : "MAX",
        personality: difficulty,
        personalityDescription: `A ${difficulty} difficulty Word Poker player`,
        handStrength,
        quickRecommendation: quickRec,
        isBluffing,
      });

      const toolsJson = JSON.stringify(BETTING_TOOLS);
      const toolInstructions = `You have access to the following tools. Choose exactly one tool to call based on the game state.

Available tools:
- check: Pass without betting (only when no bet is owed)
- call: Match the current bet to stay in
- raise: Increase the bet (provide the amount parameter)
- fold: Exit the round and forfeit bets

Respond by calling one of these tools. For example, to call: {"name": "call", "arguments": {}}`;

      const fullPrompt = `${prompt}

${toolInstructions}

Tool definitions:
${toolsJson}`;

      // Call the appropriate AI provider
      const response = useOpenRouter
        ? await callOpenRouterChat({
            model,
            prompt: fullPrompt,
            timeoutMs,
          })
        : await callNvidiaNimChat({
            model,
            prompt: fullPrompt,
            timeoutMs,
          });

      logAIDebug("betting", "received raw betting response", {
        provider,
        model,
        timeoutMs,
        responseLength: response.length,
      });

      let toolCall: ToolCallResult | null = null;

      // Try to parse as tool call (JSON response)
      try {
        const jsonMatch = response.match(/\{[\s\S]*"name"\s*:\s*"(check|call|raise|fold)"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          toolCall = { name: parsed.name, arguments: parsed.arguments || parsed.params || {} };
        }
      } catch {
        // Not valid JSON, try structured text
      }

      // Fall back to structured text parsing
      if (!toolCall || !isBettingToolName(toolCall.name)) {
        toolCall = parseStructuredTextResponse(response);
      }

      const fallbackDecision: AIBettingDecision = {
        action: quickRec,
        raiseAmount: quickRec === "raise"
          ? args.raiseLadder.find((amt) => amt > args.currentBet)
          : undefined,
        reasoning: "Fallback strategy (API parsing failed)",
        confidence: handStrength,
      };

      const rawDecision = parseBettingToolCall(toolCall, fallbackDecision, args.currentBet, args.raiseLadder);

      // Fix check/call mismatches
      const action = fixActionForBetState(rawDecision.action, args.currentBet);
      const raiseAmount = action === "raise" ? rawDecision.raiseAmount : undefined;

      logAIDebug("betting", "parsed betting response", {
        rawAction: rawDecision.action,
        action,
        raiseAmount,
        confidence: rawDecision.confidence,
        reasoning: rawDecision.reasoning,
        toolCallUsed: toolCall !== null,
      });

      return {
        action,
        raiseAmount,
        reasoning: rawDecision.reasoning,
        confidence: rawDecision.confidence,
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
