/**
 * Shared AI types and utilities.
 * Used by both aiBetting and aiShowdown modules.
 */

import type { ProbabilisticBetResult } from "../gameRules";
import { internal } from "../_generated/api";

/**
 * AI Betting Decision Result
 */
export type AIBettingDecision = {
  action: "fold" | "check" | "call" | "raise";
  raiseAmount?: number;
  reasoning: string;
  confidence: number;
};

export type FallbackBettingDecision = AIBettingDecision & {
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

export const DEFAULT_AI_REQUEST_TIMEOUT_MS = 15_000;

export function normalizeAiTimeoutMs(timeoutMs?: number): number {
  return Math.max(1_000, Math.floor(timeoutMs ?? DEFAULT_AI_REQUEST_TIMEOUT_MS));
}

export function logAIDebug(
  scope: "betting" | "showdown",
  message: string,
  details: Record<string, unknown>,
) {
  console.log(`[ai:${scope}] ${message}`, details);
}

export function finiteTraceNumber(value: number): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

export function serializeProbabilisticResultForTrace(result: ProbabilisticBetResult) {
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

export function toAIBettingDecision(decision: AIBettingDecision): AIBettingDecision {
  return {
    action: decision.action,
    raiseAmount: decision.raiseAmount,
    reasoning: decision.reasoning,
    confidence: decision.confidence,
  };
}

export async function insertAITrace(
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
