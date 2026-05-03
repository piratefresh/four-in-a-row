/**
 * AI Betting Decision Handler
 *
 * Uses tool-calling LLM with prompt registry.
 * Falls back to deterministic probabilistic engine.
 * Includes fumble rate for suboptimal play.
 */

import { ANTE_AMOUNT, type GameStage } from "../gameState";
import {
  calculatePotOdds,
  calculateRateOfReturn,
  estimateHandStrengthDetailed,
  getProbabilisticBettingAction,
} from "../gameRules";
import {
  type AIPersonality,
  type AIDifficulty,
  AI_DIFFICULTY,
  AI_PERSONALITIES,
  getModelForDifficulty,
  shouldBluff,
} from "../aiStrategy";
import {
  callOpenRouterChat,
  isOpenRouterConfigured,
} from "../openRouterClient";
import { PROMPT_BETTING_TOOLUSE } from "../aiPrompts";
import {
  BETTING_TOOLS,
  type ToolCallResult,
  isBettingToolName,
  parseBettingToolCall,
  parseStructuredTextResponse,
  fixActionForBetState,
} from "../aiTools";
import {
  type AIBettingDecision,
  type FallbackBettingDecision,
  normalizeAiTimeoutMs,
  logAIDebug,
  finiteTraceNumber,
  serializeProbabilisticResultForTrace,
  toAIBettingDecision,
  insertAITrace,
} from "./aiShared";
import { DIFFICULTY_FUMBLE_RATES } from "../aiBettingConstants";

const FUMBLE_ACTIONS: Array<AIBettingDecision["action"]> = ["fold", "check", "call"];

function applyFumble(
  decision: AIBettingDecision,
  currentBet: number,
  fumbleRate: number,
): AIBettingDecision {
  if (fumbleRate <= 0 || Math.random() >= fumbleRate) return decision;

  // Pick a random action that's worse than the optimal one
  const candidates = FUMBLE_ACTIONS.filter((a) => a !== decision.action);
  // Also avoid fold if bet is 0 (unnatural)
  const filtered = candidates.filter((a) => a !== "fold" || currentBet > 0);
  const suboptimalAction = filtered[Math.floor(Math.random() * filtered.length)];

  if (!suboptimalAction || suboptimalAction === decision.action) return decision;

  return {
    ...decision,
    action: suboptimalAction,
    raiseAmount: undefined,
    reasoning: `${decision.reasoning} (fumbled — made a suboptimal choice)`,
    confidence: decision.confidence * 0.5,
  };
}

export function fallbackBettingDecision(
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
      })),
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

export async function aiDecideBetHandler(
  ctx: any,
  args: {
    difficulty?: string;
    personality?: string;
    handTiles: any[];
    communityTiles: any[];
    stage: string;
    currentBet: number;
    chips: number;
    pot: number;
    raiseLadder: number[];
    maxRaises: number;
    currentRaises: number;
    timeoutMs?: number;
    bluffDetected?: boolean;
    believesPlayer?: boolean | null;
    gameId?: any;
    roomId?: any;
    playerId?: string;
    playerName?: string;
    characterId?: string;
  },
): Promise<AIBettingDecision> {
  const difficulty = (args.difficulty as AIDifficulty) || AI_DIFFICULTY.MEDIUM;
  const personality =
    (args.personality as AIPersonality | undefined) || AI_PERSONALITIES.BALANCED;
  const timeoutMs = normalizeAiTimeoutMs(args.timeoutMs);
  const believesPlayer = (args.believesPlayer as boolean | null) ?? null;
  const fumbleRate = DIFFICULTY_FUMBLE_RATES[difficulty] ?? 0;

  if (!isOpenRouterConfigured()) {
    console.warn("OPENROUTER_API_KEY not set, using fallback strategy");
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
    return applyFumble(toAIBettingDecision(decision), args.currentBet, fumbleRate);
  }

  try {
    const model = getModelForDifficulty(difficulty);
    const revealedCommunity = args.communityTiles
      .filter((t: any) => t.revealed)
      .map((t: any) => {
        if (t.kind === "single") {
          return { letter: t.letter, baseValue: t.baseValue };
        }
        const avgValue = t.baseValues.reduce((a: number, b: number) => a + b, 0) / t.baseValues.length;
        return { letter: t.options.join("/"), baseValue: avgValue };
      });

    const simplifiedHand = args.handTiles.map((t: any) => {
      if (t.kind === "single") {
        return { letter: t.letter, baseValue: t.baseValue };
      }
      const avgValue = t.baseValues.reduce((a: number, b: number) => a + b, 0) / t.baseValues.length;
      return { letter: t.options.join("/"), baseValue: avgValue };
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

    const isBluffing = shouldBluff(difficulty) && handStrength < 0.5;

    const fcrRecommendation = `fold ${probabilisticResult.debug.finalPct.fold.toFixed(1)}%, call ${probabilisticResult.debug.finalPct.call.toFixed(1)}%, raise ${probabilisticResult.debug.finalPct.raise.toFixed(1)}% (${probabilisticResult.debug.fcrBucket})`;

    const handDescription = args.handTiles
      .map((t: any) => {
        if (t.kind === "single") return `${t.letter}(${t.baseValue})`;
        return `[${t.options.join("/")}](${t.baseValues.join("/")})`;
      })
      .join(", ");

    const communityDescription = args.communityTiles
      .filter((t: any) => t.revealed)
      .map((t: any) => {
        if (t.kind === "single") return `${t.letter}(${t.baseValue})`;
        return `[${t.options.join("/")}](${t.baseValues.join("/")})`;
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

Respond by calling one of these tools.`;

    const fullPrompt = `${prompt}\n\n${toolInstructions}\n\nTool definitions:\n${toolsJson}`;

    const { content: response, latencyMs } = await callOpenRouterChat({
      model,
      prompt: fullPrompt,
      timeoutMs,
    });

    let toolCall: ToolCallResult | null = null;
    try {
      const jsonMatch = response.match(/\{[\s\S]*"name"\s*:\s*"(check|call|raise|fold)"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        toolCall = { name: parsed.name, arguments: parsed.arguments || parsed.params || {} };
      }
    } catch { /* not JSON */ }

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
    let action = fixActionForBetState(rawDecision.action, args.currentBet);
    let raiseAmount = action === "raise" ? rawDecision.raiseAmount : undefined;

    let decision: AIBettingDecision = {
      action,
      raiseAmount,
      reasoning: rawDecision.reasoning,
      confidence: rawDecision.confidence,
    };

    decision = applyFumble(decision, args.currentBet, fumbleRate);
    action = decision.action;
    raiseAmount = decision.raiseAmount;

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
        fumbled: decision.action !== rawDecision.action ? true : undefined,
      },
    });

    return decision;
  } catch (error) {
    console.error("AI betting decision error:", error);
    const fallbackDecision = fallbackBettingDecision(args, personality, difficulty);
    const decision = applyFumble(
      toAIBettingDecision(fallbackDecision),
      args.currentBet,
      fumbleRate,
    );
    const probabilisticDebug = fallbackDecision.probabilisticResult.debug;
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
      handStrength: fallbackDecision.confidence,
      rateOfReturn: finiteTraceNumber(probabilisticDebug.rateOfReturn),
      potOdds: probabilisticDebug.potOdds,
      chipRisk: probabilisticDebug.chipRisk,
      probabilisticAction: fallbackDecision.probabilisticResult.action,
      fcrBucket: probabilisticDebug.fcrBucket,
      actionCacheHit: false,
      bluffDetected: args.bluffDetected,
      believesPlayer,
      outputParsed: JSON.stringify(toAIBettingDecision(decision)),
      usedFallback: true,
      success: false,
      error: String(error),
      metadata: {
        probabilisticRecommendation: serializeProbabilisticResultForTrace(fallbackDecision.probabilisticResult),
        fumbled: decision.action !== fallbackDecision.action ? true : undefined,
      },
    });
    return decision;
  }
}
