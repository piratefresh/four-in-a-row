/**
 * AI Decision-Making Actions for Word Poker
 *
 * Betting decisions use tool-calling LLM with prompt registry.
 * Showdown word generation uses LLM-first with deterministic solver fallback.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { ANTE_AMOUNT, type GameStage } from "./gameState";
import {
  calculatePotOdds,
  calculateRateOfReturn,
  estimateHandStrengthDetailed,
  getProbabilisticBettingAction,
  type ProbabilisticBetResult,
} from "./gameRules";
import {
  type AIPersonality,
  type AIDifficulty,
  AI_DIFFICULTY,
  AI_PERSONALITIES,
  getModelForDifficulty,
  shouldBluff,
  AI_SHOWDOWN_MODE,
  SHOWDOWN_MODE,
} from "./aiStrategy";
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
  tryBuildWordFromAvailableTiles,
} from "./showdownSolver";
import { isValidCsw24Word } from "./csw24";
import { PROMPT_BETTING_TOOLUSE, PROMPT_SHOWDOWN_TOOLUSE, getShowdownStrategyHint } from "./aiPrompts";
import {
  BETTING_TOOLS,
  SHOWDOWN_TOOLS,
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

type FallbackBettingDecision = AIBettingDecision & {
  probabilisticResult: ProbabilisticBetResult;
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

function finiteTraceNumber(value: number): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

function serializeProbabilisticResultForTrace(result: ProbabilisticBetResult) {
  return {
    ...result,
    debug: {
      ...result.debug,
      rateOfReturn: Number.isFinite(result.debug.rateOfReturn)
        ? result.debug.rateOfReturn
        : "Infinity",
    },
  };
}

function toAIBettingDecision(decision: AIBettingDecision): AIBettingDecision {
  return {
    action: decision.action,
    raiseAmount: decision.raiseAmount,
    reasoning: decision.reasoning,
    confidence: decision.confidence,
  };
}

async function insertAITrace(
  ctx: any,
  args: {
    gameId?: any;
    roomId?: any;
    playerId?: string;
    playerName?: string;
    characterId?: string;
    category: "ai_betting" | "ai_showdown";
    action?: string;
    executedAction?: string;
    actionOverrideReason?: string;
    stage?: string;
    raiseAmount?: number;
    wordSubmitted?: string;
    wordScore?: number;
    model?: string;
    provider?: string;
    latencyMs?: number;
    promptTemplate?: string;
    decisionSource?: string;
    cacheStatus?: string;
    qualityFlags?: string[];
    difficulty?: string;
    personality?: string;
    handStrength?: number;
    rateOfReturn?: number;
    potOdds?: number;
    chipRisk?: number;
    probabilisticAction?: string;
    fcrBucket?: string;
    actionCacheHit?: boolean;
    isBluffing?: boolean;
    bluffDetected?: boolean;
    believesPlayer?: boolean | null;
    llmWord?: string;
    validationResult?: string;
    fallbackReason?: string;
    inputPrompt?: string;
    outputRaw?: string;
    outputParsed?: string;
    usedFallback?: boolean;
    success?: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (!args.gameId) return;
  await ctx.runMutation((internal as typeof internal).aiTracing.insertGameTrace, {
    gameId: args.gameId,
    roomId: args.roomId,
    playerId: args.playerId,
    playerName: args.playerName,
    characterId: args.characterId,
    isBot: true,
    category: args.category,
    component: args.category === "ai_showdown" ? "showdown" : "ai",
    operation: args.category === "ai_showdown" ? "submit_word" : "decide_bet",
    decisionSource: args.decisionSource,
    latencyMs: args.latencyMs,
    provider: args.provider,
    promptTemplate: args.promptTemplate,
    cacheStatus: args.cacheStatus,
    qualityFlags: args.qualityFlags,
    action: args.action,
    executedAction: args.executedAction,
    actionOverrideReason: args.actionOverrideReason,
    stage: args.stage,
    raiseAmount: args.raiseAmount,
    wordSubmitted: args.wordSubmitted,
    wordScore: args.wordScore,
    model: args.model,
    difficulty: args.difficulty,
    personality: args.personality,
    handStrength: args.handStrength,
    rateOfReturn: args.rateOfReturn,
    potOdds: args.potOdds,
    chipRisk: args.chipRisk,
    probabilisticAction: args.probabilisticAction,
    fcrBucket: args.fcrBucket,
    actionCacheHit: args.actionCacheHit,
    isBluffing: args.isBluffing,
    bluffDetected: args.bluffDetected,
    believesPlayer: args.believesPlayer,
    llmWord: args.llmWord,
    validationResult: args.validationResult,
    fallbackReason: args.fallbackReason,
    inputPrompt: args.inputPrompt,
    outputRaw: args.outputRaw,
    outputParsed: args.outputParsed,
    usedFallback: args.usedFallback,
    success: args.success ?? true,
    error: args.error,
    metadata: args.metadata,
  });
}

/**
 * Internal action: AI decides how to bet
 */
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
  handler: async (ctx, args): Promise<AIBettingDecision> => {
    const difficulty = (args.difficulty as AIDifficulty) || AI_DIFFICULTY.MEDIUM;
    const personality =
      (args.personality as AIPersonality | undefined) || AI_PERSONALITIES.BALANCED;
    const timeoutMs = normalizeAiTimeoutMs(args.timeoutMs);
    const believesPlayer = (args.believesPlayer as boolean | null) ?? null;

    if (!isOpenRouterConfigured()) {
      console.warn("OPENROUTER_API_KEY not set, using fallback strategy");
      logAIDebug("betting", "OpenRouter not configured, using fallback strategy", {
        difficulty,
        personality,
        stage: args.stage,
        currentBet: args.currentBet,
        chips: args.chips,
        pot: args.pot,
        currentRaises: args.currentRaises,
        timeoutMs,
      });
      const decision = fallbackBettingDecision(args, personality, difficulty);
      const probabilisticDebug = decision.probabilisticResult.debug;
      await insertAITrace(ctx, {
        ...args,
        category: "ai_betting",
        action: decision.action,
        executedAction: decision.action,
        raiseAmount: decision.raiseAmount,
        difficulty,
        personality,
        provider: "deterministic",
        promptTemplate: "betting_tooluse",
        decisionSource: "fallback",
        fallbackReason: "openrouter_not_configured",
        handStrength: decision.confidence,
        rateOfReturn: finiteTraceNumber(probabilisticDebug.rateOfReturn),
        potOdds: probabilisticDebug.potOdds,
        chipRisk: probabilisticDebug.chipRisk,
        probabilisticAction: decision.probabilisticResult.action,
        fcrBucket: probabilisticDebug.fcrBucket,
        actionCacheHit: false,
        bluffDetected: args.bluffDetected,
        believesPlayer,
        outputParsed: JSON.stringify(toAIBettingDecision(decision)),
        usedFallback: true,
        metadata: {
          reason: "openrouter_not_configured",
          probabilisticRecommendation: serializeProbabilisticResultForTrace(decision.probabilisticResult),
        },
      });
      return toAIBettingDecision(decision);
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

      const handStrengthBreakdown = estimateHandStrengthDetailed(simplifiedHand, revealedCommunity);
      const handStrength = handStrengthBreakdown.strength;
      const potOdds = calculatePotOdds(args.currentBet, args.pot);
      const rateOfReturn = calculateRateOfReturn(handStrength, potOdds);
      const chipRisk = args.chips > 0 ? args.currentBet / args.chips : 0;
      const probabilisticResult = getProbabilisticBettingAction(
        handStrength,
        args.currentBet,
        args.chips,
        args.pot,
        ANTE_AMOUNT,
        args.stage as GameStage,
        personality,
        difficulty,
        args.raiseLadder,
      );

      // Check if AI should bluff
      const isBluffing = shouldBluff(difficulty) && handStrength < 0.5;

      const fcrRecommendation = `fold ${probabilisticResult.debug.finalPct.fold.toFixed(1)}%, call ${probabilisticResult.debug.finalPct.call.toFixed(1)}%, raise ${probabilisticResult.debug.finalPct.raise.toFixed(1)}% (${probabilisticResult.debug.fcrBucket})`;

      logAIDebug("betting", "prepared betting prompt inputs", {
        difficulty,
        model,
        handStrength,
        potOdds,
        rateOfReturn,
        chipRisk,
        handStrengthBreakdown,
        isBluffing,
        recommendedAction: probabilisticResult.action,
        fcrRecommendation,
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
        personality,
        personalityDescription: `A ${personality} Word Poker player`,
        handStrength,
        potOdds,
        rateOfReturn: rateOfReturn === Infinity ? "Infinity" : rateOfReturn,
        recommendedAction: probabilisticResult.action,
        fcrRecommendation,
        isBluffing,
        believesPlayer,
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

      const { content: response, latencyMs } = await callOpenRouterChat({
        model,
        prompt: fullPrompt,
        timeoutMs,
      });

      logAIDebug("betting", "received raw betting response", {
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
        action: probabilisticResult.action,
        raiseAmount: probabilisticResult.raiseAmount,
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

      const decision = {
        action,
        raiseAmount,
        reasoning: rawDecision.reasoning,
        confidence: rawDecision.confidence,
      };

      await insertAITrace(ctx, {
        ...args,
        category: "ai_betting",
        action,
        executedAction: action,
        raiseAmount,
        difficulty,
        personality,
        model,
        provider: "openrouter",
        latencyMs,
        promptTemplate: "betting_tooluse",
        decisionSource: "llm",
        handStrength,
        rateOfReturn: finiteTraceNumber(probabilisticResult.debug.rateOfReturn),
        potOdds: probabilisticResult.debug.potOdds,
        chipRisk: probabilisticResult.debug.chipRisk,
        probabilisticAction: probabilisticResult.action,
        fcrBucket: probabilisticResult.debug.fcrBucket,
        actionCacheHit: false,
        isBluffing,
        bluffDetected: args.bluffDetected,
        believesPlayer,
        inputPrompt: fullPrompt,
        outputRaw: response,
        outputParsed: JSON.stringify(toAIBettingDecision(decision)),
        usedFallback: false,
        metadata: {
          latencyMs,
          potOdds,
          rateOfReturn,
          chipRisk,
          handStrengthBreakdown,
          probabilisticRecommendation: serializeProbabilisticResultForTrace(probabilisticResult),
          toolCall,
          currentRaises: args.currentRaises,
        },
      });

      return decision;
    } catch (error) {
      console.error("AI betting decision error:", error);
      const decision = fallbackBettingDecision(args, personality, difficulty);
      const probabilisticDebug = decision.probabilisticResult.debug;
      await insertAITrace(ctx, {
        ...args,
        category: "ai_betting",
        action: decision.action,
        executedAction: decision.action,
        raiseAmount: decision.raiseAmount,
        difficulty,
        personality,
        provider: "deterministic",
        promptTemplate: "betting_tooluse",
        decisionSource: "fallback",
        fallbackReason: "llm_error",
        handStrength: decision.confidence,
        rateOfReturn: finiteTraceNumber(probabilisticDebug.rateOfReturn),
        potOdds: probabilisticDebug.potOdds,
        chipRisk: probabilisticDebug.chipRisk,
        probabilisticAction: decision.probabilisticResult.action,
        fcrBucket: probabilisticDebug.fcrBucket,
        actionCacheHit: false,
        bluffDetected: args.bluffDetected,
        believesPlayer,
        outputParsed: JSON.stringify(toAIBettingDecision(decision)),
        usedFallback: true,
        success: false,
        error: String(error),
        metadata: {
          probabilisticRecommendation: serializeProbabilisticResultForTrace(decision.probabilisticResult),
        },
      });
      return toAIBettingDecision(decision);
    }
  },
});

/**
 * Fallback betting decision (if OpenRouter fails)
 */
function fallbackBettingDecision(
  args: any,
  personality: AIPersonality,
  difficulty: AIDifficulty,
): FallbackBettingDecision {
  const handStrength = estimateHandStrengthDetailed(
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
  ).strength;

  const probabilisticResult = getProbabilisticBettingAction(
    handStrength,
    args.currentBet,
    args.chips,
    args.pot,
    ANTE_AMOUNT,
    args.stage as GameStage,
    personality,
    difficulty,
    args.raiseLadder,
  );

  logAIDebug("betting", "computed fallback betting decision", {
    action: probabilisticResult.action,
    raiseAmount: probabilisticResult.raiseAmount,
    handStrength,
    personality,
    difficulty,
    probabilisticDebug: probabilisticResult.debug,
    currentBet: args.currentBet,
    chips: args.chips,
    pot: args.pot,
    stage: args.stage,
  });

  return {
    action: probabilisticResult.action,
    raiseAmount: probabilisticResult.raiseAmount,
    reasoning: probabilisticResult.reasoning,
    confidence: handStrength,
    probabilisticResult,
  };
}

/**
 * Internal action: AI builds best word during showdown
 *
 * LLM-first approach: the LLM picks a word, which is then validated
 * against the CSW24 dictionary and available tiles. If the LLM's word
 * is invalid, the deterministic solver is used as a fallback.
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
    bluffDetected: v.optional(v.boolean()),
    believesPlayer: v.optional(v.union(v.literal(true), v.literal(false), v.null())),
    gameId: v.optional(v.id("games")),
    roomId: v.optional(v.id("rooms")),
    playerId: v.optional(v.string()),
    playerName: v.optional(v.string()),
    characterId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AIWordResult> => {
    const difficulty = (args.difficulty as AIDifficulty) || AI_DIFFICULTY.MEDIUM;
    const personality =
      (args.personality as AIPersonality | undefined) || AI_PERSONALITIES.BALANCED;
    const timeoutMs = normalizeAiTimeoutMs(args.timeoutMs);
    const believesPlayer = (args.believesPlayer as boolean | null) ?? null;

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

    if (SHOWDOWN_MODE === AI_SHOWDOWN_MODE.DETERMINISTIC || !isOpenRouterConfigured()) {
      const result = useDeterministicShowdown(
        difficulty,
        personality,
        args.handTiles as SolveShowdownHandTile[],
        args.communityTiles as SolveShowdownCommunityTile[],
        availableShowdownTiles,
      );
      await insertAITrace(ctx, {
        ...args,
        category: "ai_showdown",
        difficulty,
        personality,
        provider: "deterministic",
        promptTemplate: "showdown_tooluse",
        decisionSource: "fallback",
        fallbackReason:
          SHOWDOWN_MODE === AI_SHOWDOWN_MODE.DETERMINISTIC
            ? "deterministic_mode"
            : "openrouter_not_configured",
        wordSubmitted: result.word,
        wordScore: result.estimatedScore,
        bluffDetected: args.bluffDetected,
        believesPlayer,
        outputParsed: JSON.stringify(result),
        usedFallback: true,
        metadata: {
          reason:
            SHOWDOWN_MODE === AI_SHOWDOWN_MODE.DETERMINISTIC
              ? "deterministic_mode"
              : "openrouter_not_configured",
        },
      });
      return result;
    }

    try {
      const model = getModelForDifficulty(difficulty);
      const strategyHint = getShowdownStrategyHint(difficulty);

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

      const allAvailableDescription = serializeAvailableShowdownTiles(availableShowdownTiles)
        .map((t) => `${t.choices.map((c) => c.letter).join("/")}${t.choices[0]?.baseValue ? `(${t.choices[0].baseValue})` : ""}`)
        .join(", ");

      const prompt = PROMPT_SHOWDOWN_TOOLUSE.build({
        handTiles: handDescription,
        communityTilesRevealed: communityDescription || "None yet",
        allTilesAvailable: allAvailableDescription,
        difficulty,
        personality,
        personalityDescription: `A ${personality} player who ${personality === "cautious" ? "prefers safe, common words" : personality === "aggressive" ? "goes for high-scoring words" : personality === "creative" ? "enjoys unusual and creative words" : "finds balanced, solid words"}. ${believesPlayer === true ? "You are distracted by the player's bold claims and might not find your best word." : ""}`,
        strategyHint,
        believesPlayer,
      });

      const toolsJson = JSON.stringify(SHOWDOWN_TOOLS);
      const toolInstructions = `You have access to the following tools. Choose exactly one tool to call based on the available tiles.

Available tools:
- submit_word: Submit your chosen word (provide the "word" parameter)

Respond by calling one of these tools. For example: {"name": "submit_word", "arguments": {"word": "HELLO", "reasoning": "Good use of high-value tiles"}}`;

      const fullPrompt = `${prompt}

${toolInstructions}

Tool definitions:
${toolsJson}`;

      const { content: response, latencyMs } = await callOpenRouterChat({
        model,
        prompt: fullPrompt,
        timeoutMs,
      });

      logAIDebug("showdown", "received LLM showdown response", {
        model,
        responseLength: response.length,
      });

      let toolCall: ToolCallResult | null = null;

      try {
        const jsonMatch = response.match(/\{[\s\S]*"name"\s*:\s*"submit_word"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          toolCall = { name: parsed.name, arguments: parsed.arguments || parsed.params || {} };
        }
      } catch {
        // Not valid JSON, try structured text
      }

      if (!toolCall) {
        toolCall = parseStructuredTextResponse(response);
      }

      const llmWord = (toolCall?.arguments as Record<string, unknown> | undefined)?.word as string | undefined;

      if (llmWord && typeof llmWord === "string") {
        const validated = validateLlmWord(
          llmWord,
          availableShowdownTiles,
        );

        if (validated) {
          logAIDebug("showdown", "LLM word validated successfully", {
            word: llmWord,
            tileCount: validated.tiles.length,
            estimatedScore: validated.estimatedScore,
          });

          const result = {
            word: validated.word,
            tiles: validated.tiles,
            choiceResolutions: validated.choiceResolutions,
            reasoning: validated.reasoning,
            estimatedScore: validated.estimatedScore,
          };
          await insertAITrace(ctx, {
            ...args,
            category: "ai_showdown",
            difficulty,
            personality,
            model,
            wordSubmitted: result.word,
            wordScore: result.estimatedScore,
            inputPrompt: fullPrompt,
            outputRaw: response,
            outputParsed: JSON.stringify(result),
            provider: "openrouter",
            latencyMs,
            promptTemplate: "showdown_tooluse",
            decisionSource: "llm",
            llmWord,
            validationResult: "valid",
            bluffDetected: args.bluffDetected,
            believesPlayer,
            usedFallback: false,
            metadata: { latencyMs, llmWord },
          });
          return result;
        }

        logAIDebug("showdown", "LLM word failed validation, falling back to deterministic", {
          word: llmWord,
        });
      }

      const result = useDeterministicShowdown(
        difficulty,
        personality,
        args.handTiles as SolveShowdownHandTile[],
        args.communityTiles as SolveShowdownCommunityTile[],
        availableShowdownTiles,
      );
      await insertAITrace(ctx, {
        ...args,
        category: "ai_showdown",
        difficulty,
        personality,
        model,
        wordSubmitted: result.word,
        wordScore: result.estimatedScore,
        provider: "deterministic",
        latencyMs,
        promptTemplate: "showdown_tooluse",
        decisionSource: "fallback",
        llmWord,
        validationResult: llmWord ? "invalid" : "missing",
        fallbackReason: "llm_word_failed_validation",
        bluffDetected: args.bluffDetected,
        believesPlayer,
        inputPrompt: fullPrompt,
        outputRaw: response,
        outputParsed: JSON.stringify(result),
        usedFallback: true,
        metadata: { latencyMs, reason: "llm_word_failed_validation", llmWord },
      });
      return result;
    } catch (error) {
      console.error("AI showdown LLM error, falling back to deterministic:", error);
      const result = useDeterministicShowdown(
        difficulty,
        personality,
        args.handTiles as SolveShowdownHandTile[],
        args.communityTiles as SolveShowdownCommunityTile[],
        buildAvailableShowdownTiles(
          args.handTiles as SolveShowdownHandTile[],
          args.communityTiles as SolveShowdownCommunityTile[],
        ),
      );
      await insertAITrace(ctx, {
        ...args,
        category: "ai_showdown",
        difficulty,
        personality,
        provider: "deterministic",
        promptTemplate: "showdown_tooluse",
        decisionSource: "fallback",
        fallbackReason: "llm_error",
        wordSubmitted: result.word,
        wordScore: result.estimatedScore,
        bluffDetected: args.bluffDetected,
        believesPlayer,
        outputParsed: JSON.stringify(result),
        usedFallback: true,
        success: false,
        error: String(error),
      });
      return result;
    }
  },
});

function validateLlmWord(
  word: string,
  availableTiles: ReturnType<typeof buildAvailableShowdownTiles>,
): {
  word: string;
  tiles: Array<{ letter: string; baseValue: number; multiplier?: "2L" | "3L"; source: "hand" | "community"; cardIndex?: number; wasChoice?: boolean }>;
  choiceResolutions?: { hand?: Record<string, string>; community?: Record<string, string> };
  reasoning: string;
  estimatedScore: number;
} | null {
  const normalized = word.trim().toUpperCase();
  if (normalized.length < 2 || normalized.length > 7) return null;
  if (!isValidCsw24Word(normalized)) return null;

  const reconstruction = tryBuildWordFromAvailableTiles(normalized, availableTiles, [], {});
  if (!reconstruction) return null;

  const score = calculateShowdownScore(reconstruction.tiles);

  return {
    word: normalized,
    tiles: reconstruction.tiles.map((t) => ({
      letter: t.letter,
      baseValue: t.baseValue,
      multiplier: t.multiplier,
      source: t.source,
      cardIndex: t.cardIndex,
      wasChoice: t.wasChoice,
    })),
    choiceResolutions: reconstruction.choiceResolutions
      ? {
          hand: reconstruction.choiceResolutions.hand,
          community: reconstruction.choiceResolutions.community,
        }
      : undefined,
    reasoning: `LLM selected "${normalized}" and it passed dictionary + tile validation.`,
    estimatedScore: score,
  };
}

function calculateShowdownScore(tiles: Array<{ baseValue: number; multiplier?: "2L" | "3L" }>): number {
  let total = 0;
  for (const tile of tiles) {
    total += tile.baseValue;
    if (tile.multiplier === "2L") total += tile.baseValue;
    if (tile.multiplier === "3L") total += tile.baseValue * 2;
  }
  return total;
}

function useDeterministicShowdown(
  difficulty: AIDifficulty,
  personality: AIPersonality,
  handTiles: SolveShowdownHandTile[],
  communityTiles: SolveShowdownCommunityTile[],
  availableTiles: ReturnType<typeof buildAvailableShowdownTiles>,
): AIWordResult {
  const selection = solveDeterministicShowdownWord({
    difficulty,
    personality,
    handTiles,
    communityTiles,
  });

  if (!selection) {
    logAIDebug("showdown", "deterministic showdown solver found no valid candidates", {
      difficulty,
      personality,
      availableTiles: serializeAvailableShowdownTiles(availableTiles),
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
}
