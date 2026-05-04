/**
 * AI Showdown Word Selection Handler
 *
 * LLM-first approach: the LLM picks a word, which is then validated
 * against the CSW24 dictionary and available tiles. If invalid, the
 * deterministic solver is used as a fallback.
 */

import {
  type AIPersonality,
  type AIDifficulty,
  AI_DIFFICULTY,
  AI_PERSONALITIES,
  AI_SHOWDOWN_MODE,
  SHOWDOWN_MODE,
  getModelForDifficulty,
} from "../aiStrategy";
import {
  callOpenRouterChat,
  isOpenRouterConfigured,
} from "../openRouterClient";
import {
  buildAvailableShowdownTiles,
  type SolveShowdownCommunityTile,
  type SolveShowdownHandTile,
  serializeAvailableShowdownTiles,
  solveDeterministicShowdownWord,
  tryBuildWordFromAvailableTiles,
} from "../showdownSolver";
import { isValidCsw24Word } from "../csw24";
import { PROMPT_SHOWDOWN_TOOLUSE, getShowdownStrategyHint } from "../aiPrompts";
import {
  SHOWDOWN_TOOLS,
  type ToolCallResult,
  parseStructuredTextResponse,
} from "../aiTools";
import {
  type AIWordResult,
  normalizeAiTimeoutMs,
  insertAITrace,
} from "./aiShared";

function calculateShowdownScore(tiles: Array<{ baseValue: number; multiplier?: "2L" | "3L" }>): number {
  let total = 0;
  for (const tile of tiles) {
    total += tile.baseValue;
    if (tile.multiplier === "2L") total += tile.baseValue;
    if (tile.multiplier === "3L") total += tile.baseValue * 2;
  }
  return total;
}

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
      ? { hand: reconstruction.choiceResolutions.hand, community: reconstruction.choiceResolutions.community }
      : undefined,
    reasoning: `LLM selected "${normalized}" and it passed dictionary + tile validation.`,
    estimatedScore: score,
  };
}

function useDeterministicShowdown(
  difficulty: AIDifficulty,
  personality: AIPersonality,
  handTiles: SolveShowdownHandTile[],
  communityTiles: SolveShowdownCommunityTile[],
): AIWordResult {
  const selection = solveDeterministicShowdownWord({ difficulty, personality, handTiles, communityTiles });
  if (!selection) {
    return {
      word: "",
      tiles: [],
      choiceResolutions: undefined,
      reasoning: "No valid deterministic showdown candidates found",
      estimatedScore: 0,
    };
  }
  return {
    word: selection.word,
    tiles: selection.tiles,
    choiceResolutions: selection.choiceResolutions,
    reasoning: selection.reasoning,
    estimatedScore: selection.estimatedScore,
  };
}

export async function aiSubmitWordHandler(
  ctx: any,
  args: {
    difficulty?: string;
    personality?: string;
    handTiles: any[];
    communityTiles: any[];
    timeoutMs?: number;
    bluffDetected?: boolean;
    believesPlayer?: boolean | null;
    gameId?: any;
    roomId?: any;
    playerId?: string;
    playerName?: string;
    characterId?: string;
  },
): Promise<AIWordResult> {
  const difficulty = (args.difficulty as AIDifficulty) || AI_DIFFICULTY.MEDIUM;
  const personality =
    (args.personality as AIPersonality | undefined) || AI_PERSONALITIES.BALANCED;
  const timeoutMs = normalizeAiTimeoutMs(args.timeoutMs);
  const believesPlayer = (args.believesPlayer as boolean | null) ?? null;

  const availableShowdownTiles = buildAvailableShowdownTiles(
    args.handTiles as SolveShowdownHandTile[],
    args.communityTiles as SolveShowdownCommunityTile[],
  );

  if (SHOWDOWN_MODE === AI_SHOWDOWN_MODE.DETERMINISTIC || !isOpenRouterConfigured()) {
    const result = useDeterministicShowdown(
      difficulty, personality,
      args.handTiles as SolveShowdownHandTile[],
      args.communityTiles as SolveShowdownCommunityTile[],
    );
    await insertAITrace(ctx, {
      ...args,
      category: "ai_showdown",
      difficulty,
      personality,
      provider: "deterministic",
      promptTemplate: "showdown_tooluse",
      decisionSource: "fallback",
      fallbackReason: SHOWDOWN_MODE === AI_SHOWDOWN_MODE.DETERMINISTIC ? "deterministic_mode" : "openrouter_not_configured",
      wordSubmitted: result.word,
      wordScore: result.estimatedScore,
      bluffDetected: args.bluffDetected,
      believesPlayer,
      outputParsed: JSON.stringify(result),
      usedFallback: true,
      metadata: { reason: SHOWDOWN_MODE === AI_SHOWDOWN_MODE.DETERMINISTIC ? "deterministic_mode" : "openrouter_not_configured" },
    });
    return result;
  }

  try {
    const model = getModelForDifficulty(difficulty);
    const strategyHint = getShowdownStrategyHint(difficulty);

    const handDescription = args.handTiles.map((t: any) => {
      if (t.kind === "single") return `${t.letter}(${t.baseValue})`;
      return `[${t.options.join("/")}](${t.baseValues.join("/")})`;
    }).join(", ");

    const communityDescription = args.communityTiles
      .filter((t: any) => t.revealed)
      .map((t: any) => {
        if (t.kind === "single") return `${t.letter}(${t.baseValue})`;
        return `[${t.options.join("/")}](${t.baseValues.join("/")})`;
      }).join(", ");

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

Respond by calling one of these tools.`;

    const fullPrompt = `${prompt}\n\n${toolInstructions}\n\nTool definitions:\n${toolsJson}`;

    const { content: response, latencyMs } = await callOpenRouterChat({
      model,
      prompt: fullPrompt,
      timeoutMs,
    });

    let toolCall: ToolCallResult | null = null;
    try {
      const jsonMatch = response.match(/\{[\s\S]*"name"\s*:\s*"submit_word"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        toolCall = { name: parsed.name, arguments: parsed.arguments || parsed.params || {} };
      }
    } catch { /* not JSON */ }

    if (!toolCall) {
      toolCall = parseStructuredTextResponse(response);
    }

    const llmWord = (toolCall?.arguments as Record<string, unknown> | undefined)?.word as string | undefined;

    if (llmWord && typeof llmWord === "string") {
      const validated = validateLlmWord(llmWord, availableShowdownTiles);
      if (validated) {
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
          difficulty, personality, model,
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
    }

    const result = useDeterministicShowdown(
      difficulty, personality,
      args.handTiles as SolveShowdownHandTile[],
      args.communityTiles as SolveShowdownCommunityTile[],
    );
    await insertAITrace(ctx, {
      ...args,
      category: "ai_showdown",
      difficulty, personality, model,
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
    const result = useDeterministicShowdown(difficulty, personality,
      args.handTiles as SolveShowdownHandTile[],
      args.communityTiles as SolveShowdownCommunityTile[],
    );
    await insertAITrace(ctx, {
      ...args,
      category: "ai_showdown",
      difficulty, personality,
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
}
