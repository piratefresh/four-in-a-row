/**
 * AI Decision-Making Actions for Word Poker
 *
 * Integrates with OpenRouter API to make intelligent betting and word-building decisions
 */

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { GameStage, GameDeckTile, GameTile } from "./gameState";
import {
  getGameRulesForAI,
  getStageStrategy,
  estimateHandStrength,
  getQuickRecommendation,
} from "./gameRules";
import {
  type AIDifficulty,
  AI_DIFFICULTY,
  getModelForDifficulty,
  getBettingProfile,
  shouldBluff,
} from "./aiStrategy";

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

function normalizeParsedWordTiles(
  word: string,
  tiles: AIWordResult["tiles"],
  choiceResolutions?: AIWordResult["choiceResolutions"],
): {
  word: string;
  tiles: AIWordResult["tiles"];
  choiceResolutions?: AIWordResult["choiceResolutions"];
} {
  const normalizedWord = word.trim().toUpperCase();
  if (!normalizedWord) {
    return { word: "", tiles: [], choiceResolutions: undefined };
  }

  let normalizedTiles = [...tiles];

  if (normalizedTiles.length > normalizedWord.length) {
    normalizedTiles = normalizedTiles.slice(0, normalizedWord.length);
  }

  if (normalizedTiles.length !== normalizedWord.length) {
    return {
      word: normalizedWord,
      tiles: [],
      choiceResolutions: undefined,
    };
  }

  const wordLetters = normalizedWord.split("");
  const tileLetters = normalizedTiles.map((tile) => tile.letter.toUpperCase());
  if (wordLetters.some((letter, index) => tileLetters[index] !== letter)) {
    return {
      word: normalizedWord,
      tiles: [],
      choiceResolutions: undefined,
    };
  }

  if (!choiceResolutions) {
    return {
      word: normalizedWord,
      tiles: normalizedTiles,
      choiceResolutions: undefined,
    };
  }

  const usedHandChoiceIndexes = new Set(
    normalizedTiles
      .filter((tile) => tile.source === "hand" && tile.wasChoice && tile.cardIndex !== undefined)
      .map((tile) => String(tile.cardIndex)),
  );
  const usedCommunityChoiceIndexes = new Set(
    normalizedTiles
      .filter((tile) => tile.source === "community" && tile.wasChoice && tile.cardIndex !== undefined)
      .map((tile) => String(tile.cardIndex)),
  );

  const filteredChoiceResolutions = {
    hand: Object.fromEntries(
      Object.entries(choiceResolutions.hand ?? {}).filter(([index]) =>
        usedHandChoiceIndexes.has(index),
      ),
    ),
    community: Object.fromEntries(
      Object.entries(choiceResolutions.community ?? {}).filter(([index]) =>
        usedCommunityChoiceIndexes.has(index),
      ),
    ),
  };

  return {
    word: normalizedWord,
    tiles: normalizedTiles,
    choiceResolutions:
      Object.keys(filteredChoiceResolutions.hand).length > 0 ||
      Object.keys(filteredChoiceResolutions.community).length > 0
        ? filteredChoiceResolutions
        : undefined,
  };
}

/**
 * Call OpenRouter API for text generation
 */
async function callOpenRouter(
  model: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://word-poker.com",
      "X-Title": "Word Poker AI",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
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
        }),
        v.object({
          kind: v.literal("choice"),
          options: v.array(v.string()),
          baseValues: v.array(v.number()),
        })
      )
    ),
    communityTiles: v.array(
      v.union(
        v.object({
          kind: v.literal("single"),
          letter: v.string(),
          baseValue: v.number(),
          revealed: v.boolean(),
        }),
        v.object({
          kind: v.literal("choice"),
          options: v.array(v.string()),
          baseValues: v.array(v.number()),
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
  },
  handler: async (ctx, args): Promise<AIBettingDecision> => {
    const difficulty = (args.difficulty as AIDifficulty) || AI_DIFFICULTY.MEDIUM;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY not set, using fallback strategy");
      logAIDebug("betting", "OPENROUTER_API_KEY missing, using fallback strategy", {
        difficulty,
        stage: args.stage,
        currentBet: args.currentBet,
        chips: args.chips,
        pot: args.pot,
        currentRaises: args.currentRaises,
      });
      return fallbackBettingDecision(args);
    }

    try {
      const model = getModelForDifficulty(difficulty);
      const bettingProfile = getBettingProfile(difficulty);

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

      const response = await callOpenRouter(model, prompt, apiKey);
      logAIDebug("betting", "received raw betting response", {
        model,
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
    handTiles: v.array(
      v.union(
        v.object({
          kind: v.literal("single"),
          letter: v.string(),
          baseValue: v.number(),
        }),
        v.object({
          kind: v.literal("choice"),
          options: v.array(v.string()),
          baseValues: v.array(v.number()),
        })
      )
    ),
    communityTiles: v.array(
      v.union(
        v.object({
          kind: v.literal("single"),
          letter: v.string(),
          baseValue: v.number(),
          revealed: v.boolean(),
        }),
        v.object({
          kind: v.literal("choice"),
          options: v.array(v.string()),
          baseValues: v.array(v.number()),
          revealed: v.boolean(),
        })
      )
    ),
  },
  handler: async (ctx, args): Promise<AIWordResult> => {
    const difficulty = (args.difficulty as AIDifficulty) || AI_DIFFICULTY.MEDIUM;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY not set, using fallback word generation");
      logAIDebug("showdown", "OPENROUTER_API_KEY missing, using fallback word generation", {
        difficulty,
        handTileCount: args.handTiles.length,
        revealedCommunityCount: args.communityTiles.filter((tile) => tile.revealed).length,
      });
      return fallbackWordGeneration(args);
    }

    try {
      const model = getModelForDifficulty(difficulty);
      logAIDebug("showdown", "prepared showdown prompt inputs", {
        difficulty,
        model,
        handTileCount: args.handTiles.length,
        revealedCommunityCount: args.communityTiles.filter((tile) => tile.revealed).length,
      });

      // Build available tiles description
      const handDescription = args.handTiles
        .map((t, idx) => {
          if (t.kind === "single") {
            return `H${idx}: ${t.letter}(${t.baseValue})`;
          } else {
            return `H${idx}: [${t.options.join("/")}](${t.baseValues.join("/")}) - choice tile`;
          }
        })
        .join(", ");

      const communityDescription = args.communityTiles
        .filter((t) => t.revealed)
        .map((t, idx) => {
          if (t.kind === "single") {
            return `C${idx}: ${t.letter}(${t.baseValue})`;
          } else {
            return `C${idx}: [${t.options.join("/")}](${t.baseValues.join("/")}) - choice tile`;
          }
        })
        .join(", ");

      const prompt = `You are playing Word Poker. Build the highest-scoring valid English word.

## Available Tiles
Hand tiles: ${handDescription}
Community tiles: ${communityDescription}

## Scoring
- Base score: Sum of letter values
- Full rack bonus: +10 if you use all 7 tiles
- Valid word bonus: +5
- Speed bonus: +10 (submit within 10s) or +5 (within 20s)

## Rules
- Word must be 2-7 letters
- Must be valid English dictionary word
- Each tile can only be used once
- For choice tiles, you pick which letter to use

## Strategy
1. Prioritize longer words (more points + chance for full rack bonus)
2. Use high-value letters strategically
3. Verify word is valid (invalid = 0 points!)

Respond in this EXACT format:
WORD: [your word in UPPERCASE]
TILES_USED: [comma-separated list like: H0,C1,H1,C3]
CHOICE_SELECTIONS: [if using choice tiles, specify like: H0=A,C2=T]
ESTIMATED_SCORE: [number]
REASONING: [brief explanation]

Example:
WORD: MASTER
TILES_USED: H0,C1,C2,H1,C3,C4
CHOICE_SELECTIONS: C1=A,C2=S
ESTIMATED_SCORE: 24
REASONING: 6-letter word using high-value M and common letters, scores 19 base + 5 valid word bonus`;

      const response = await callOpenRouter(model, prompt, apiKey);
      logAIDebug("showdown", "received raw showdown response", {
        model,
        response,
      });

      // Parse AI response
      const wordMatch = response.match(/WORD:\s*([A-Z]+)/i);
      const tilesMatch = response.match(/TILES_USED:\s*([^\n]+)/i);
      const choiceMatch = response.match(/CHOICE_SELECTIONS:\s*([^\n]+)/i);
      const scoreMatch = response.match(/ESTIMATED_SCORE:\s*(\d+)/i);
      const reasoningMatch = response.match(/REASONING:\s*(.+)/i);

      const word = wordMatch?.[1]?.toUpperCase() || "";
      const tilesUsedStr = tilesMatch?.[1]?.trim() || "";
      const choiceStr = choiceMatch?.[1]?.trim() || "";
      const estimatedScore = parseInt(scoreMatch?.[1] || "0", 10);
      const reasoning = reasoningMatch?.[1]?.trim() || "AI word generation";

      // Parse tiles used (e.g., "H0,C1,H1,C2")
      const tiles: AIWordResult["tiles"] = [];
      const choiceResolutions: AIWordResult["choiceResolutions"] = { hand: {}, community: {} };

      if (tilesUsedStr) {
        const tileRefs = tilesUsedStr.split(",").map((s) => s.trim());

        for (const ref of tileRefs) {
          const match = ref.match(/([HC])(\d+)/);
          if (!match) continue;

          const source = match[1] === "H" ? "hand" : "community";
          const index = parseInt(match[2], 10);

          const sourceTiles = source === "hand" ? args.handTiles : args.communityTiles.filter(t => t.revealed);
          const tile = sourceTiles[index];

          if (!tile) continue;

          if (tile.kind === "single") {
            tiles.push({
              letter: tile.letter,
              baseValue: tile.baseValue,
              source,
              cardIndex: index,
              wasChoice: false,
            });
          } else {
            // Choice tile - need to determine which letter was chosen
            const choicePattern = new RegExp(`${ref}=([A-Z])`, "i");
            const choiceMatch = choiceStr.match(choicePattern);
            const selectedLetter = choiceMatch?.[1]?.toUpperCase() || tile.options[0];
            const selectedIndex = tile.options.indexOf(selectedLetter);
            const selectedValue = selectedIndex >= 0 ? tile.baseValues[selectedIndex] : tile.baseValues[0];

            tiles.push({
              letter: selectedLetter,
              baseValue: selectedValue,
              source,
              cardIndex: index,
              wasChoice: true,
            });

            if (source === "hand") {
              choiceResolutions.hand![index.toString()] = selectedLetter;
            } else {
              choiceResolutions.community![index.toString()] = selectedLetter;
            }
          }
        }
      }

      const normalizedResult = normalizeParsedWordTiles(
        word,
        tiles,
        Object.keys(choiceResolutions.hand || {}).length > 0 ||
          Object.keys(choiceResolutions.community || {}).length > 0
          ? choiceResolutions
          : undefined,
      );

      logAIDebug("showdown", "parsed showdown response", {
        word: normalizedResult.word,
        tileCount: normalizedResult.tiles.length,
        estimatedScore,
        reasoning,
        hasChoiceResolutions:
          !!normalizedResult.choiceResolutions,
      });

      return {
        word: normalizedResult.word,
        tiles: normalizedResult.tiles,
        choiceResolutions: normalizedResult.choiceResolutions,
        reasoning,
        estimatedScore,
      };
    } catch (error) {
      console.error("AI word generation error:", error);
      return fallbackWordGeneration(args);
    }
  },
});

/**
 * Fallback word generation (simple greedy approach)
 */
function fallbackWordGeneration(args: any): AIWordResult {
  // Simple fallback: pick first 5 single-letter tiles and form a word
  const allTiles: Array<{
    letter: string;
    baseValue: number;
    source: "hand" | "community";
    index: number;
    wasChoice: boolean;
  }> = [];

  args.handTiles.forEach((t: any, idx: number) => {
    if (t.kind === "single") {
      allTiles.push({
        letter: t.letter,
        baseValue: t.baseValue,
        source: "hand",
        index: idx,
        wasChoice: false,
      });
    } else {
      // Pick first option from choice tile
      allTiles.push({
        letter: t.options[0],
        baseValue: t.baseValues[0],
        source: "hand",
        index: idx,
        wasChoice: true,
      });
    }
  });

  args.communityTiles
    .filter((t: any) => t.revealed)
    .forEach((t: any, idx: number) => {
      if (t.kind === "single") {
        allTiles.push({
          letter: t.letter,
          baseValue: t.baseValue,
          source: "community",
          index: idx,
          wasChoice: false,
        });
      } else {
        allTiles.push({
          letter: t.options[0],
          baseValue: t.baseValues[0],
          source: "community",
          index: idx,
          wasChoice: true,
        });
      }
    });

  // Sort by value descending and take up to 5 letters
  allTiles.sort((a, b) => b.baseValue - a.baseValue);
  const selectedTiles = allTiles.slice(0, Math.min(5, allTiles.length));
  const choiceResolutions: {
    hand: Record<string, string>;
    community: Record<string, string>;
  } = {
    hand: {},
    community: {},
  };

  const word = selectedTiles.map((t) => t.letter).join("");
  const tiles = selectedTiles.map((t) => {
    if (t.wasChoice) {
      if (t.source === "hand") {
        choiceResolutions.hand[t.index.toString()] = t.letter;
      } else {
        choiceResolutions.community[t.index.toString()] = t.letter;
      }
    }

    return {
      letter: t.letter,
      baseValue: t.baseValue,
      source: t.source,
      cardIndex: t.index,
      wasChoice: t.wasChoice,
    };
  });

  const estimatedScore = selectedTiles.reduce((sum, t) => sum + t.baseValue, 0) + 5; // +5 for valid word

  return {
    word,
    tiles,
    choiceResolutions:
      Object.keys(choiceResolutions.hand).length > 0 ||
      Object.keys(choiceResolutions.community).length > 0
        ? choiceResolutions
        : undefined,
    reasoning: "Fallback: greedy high-value selection",
    estimatedScore,
  };
}
