/**
 * AI Tool Definitions for Word Poker
 *
 * Defines the tool schemas used when calling LLMs with function/tool calling.
 * The LLM selects a tool (check, call, raise, fold) instead of generating
 * freeform text, which makes parsing reliable and reduces hallucination.
 *
 * Also provides pure functions for parsing tool-call responses into
 * AIBettingDecision objects, with fallback handling for invalid responses.
 */

import type { AIBettingDecision } from "./ai";
import { RAISE_LADDER } from "./gameState";

// ---------------------------------------------------------------------------
// Tool definitions (OpenAI function-calling format)
// ---------------------------------------------------------------------------

export const BETTING_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "check",
      description:
        "Pass without betting. Only available when no bet is currently owed (currentBet is 0).",
      parameters: {
        type: "object",
        properties: {},
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "call",
      description:
        "Match the current bet to stay in the round. Costs currentBet chips.",
      parameters: {
        type: "object",
        properties: {},
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "raise",
      description:
        "Increase the bet to a higher rung on the raise ladder. Specify the total bet amount.",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description:
              "The total bet amount to raise to. Must be a value on the raise ladder: 20, 40, 60, 80, 100, 120, 140, 160, 200.",
          },
          reasoning: {
            type: "string",
            description: "Brief explanation of why you are raising.",
          },
        },
        required: ["amount"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fold",
      description:
        "Exit the round and forfeit all bets made so far. Choose this when your hand is weak and continuing is not worth the cost.",
      parameters: {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Brief explanation of why you are folding.",
          },
        },
        required: [] as string[],
      },
    },
  },
] as const;

export const SHOWDOWN_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "submit_word",
      description:
        "Submit your chosen word for the showdown. The word must be 2-7 letters, use only available tiles, and be a valid English word.",
      parameters: {
        type: "object",
        properties: {
          word: {
            type: "string",
            description:
              "The word you want to submit. Must be a valid CSW24 English word, 2-7 letters.",
          },
          reasoning: {
            type: "string",
            description: "Brief explanation of your word choice.",
          },
        },
        required: ["word"],
      },
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Tool name type
// ---------------------------------------------------------------------------

export type BettingToolName = "check" | "call" | "raise" | "fold";

export function isBettingToolName(name: string): name is BettingToolName {
  return ["check", "call", "raise", "fold"].includes(name);
}

// ---------------------------------------------------------------------------
// Parse tool-call response into AIBettingDecision
// ---------------------------------------------------------------------------

export interface ToolCallResult {
  name: string;
  arguments: Record<string, unknown>;
}

export function parseBettingToolCall(
  toolCall: ToolCallResult | null | undefined,
  fallback: AIBettingDecision,
  currentBet: number,
  raiseLadder: readonly number[] = RAISE_LADDER,
): AIBettingDecision {
  if (!toolCall || !isBettingToolName(toolCall.name)) {
    return fallback;
  }

  switch (toolCall.name) {
    case "check":
      return {
        action: "check",
        reasoning: "AI chose to check",
        confidence: fallback.confidence,
      };

    case "call":
      return {
        action: "call",
        reasoning: "AI chose to call",
        confidence: fallback.confidence,
      };

    case "raise": {
      const rawAmount = toolCall.arguments.amount as number | undefined;
      const raiseAmount = clampRaiseAmount(
        rawAmount,
        currentBet,
        raiseLadder,
      );
      return {
        action: "raise",
        raiseAmount,
        reasoning:
          (toolCall.arguments.reasoning as string) || "AI chose to raise",
        confidence: fallback.confidence,
      };
    }

    case "fold":
      return {
        action: "fold",
        reasoning:
          (toolCall.arguments.reasoning as string) || "AI chose to fold",
        confidence: fallback.confidence,
      };

    default:
      return fallback;
  }
}

/**
 * Clamp and validate a raise amount to the nearest valid ladder value
 * that is greater than the current bet.
 */
export function clampRaiseAmount(
  rawAmount: number | undefined,
  currentBet: number,
  raiseLadder: readonly number[] = RAISE_LADDER,
): number {
  if (typeof rawAmount !== "number" || rawAmount <= currentBet) {
    return raiseLadder.find((amt) => amt > currentBet) ?? currentBet + 20;
  }

  const validStep = raiseLadder.find((amt) => amt >= rawAmount);
  if (validStep && validStep > currentBet) {
    return validStep;
  }

  const nextStep = raiseLadder.find((amt) => amt > currentBet);
  return nextStep ?? currentBet + 20;
}

/**
 * Normalise a freeform LLM text response into a tool-call-like result.
 * This is used as a fallback when the LLM doesn't use tool calling properly
 * and instead returns structured text like "ACTION: CALL".
 */
export function parseStructuredTextResponse(
  text: string,
): ToolCallResult | null {
  const actionMatch = text.match(/ACTION:\s*(FOLD|CHECK|CALL|RAISE)/i);
  if (!actionMatch) {
    return null;
  }

  const action = actionMatch[1].toLowerCase();
  const result: ToolCallResult = { name: action, arguments: {} };

  if (action === "raise") {
    const raiseMatch = text.match(/RAISE_AMOUNT:\s*(\d+)/i);
    result.arguments.amount = raiseMatch ? parseInt(raiseMatch[1], 10) : undefined;
  }

  const reasoningMatch = text.match(/REASONING:\s*(.+)/i);
  if (reasoningMatch) {
    result.arguments.reasoning = reasoningMatch[1].trim();
  }

  return result;
}

/**
 * Determine whether a tool name is a valid given the current bet state.
 * - "check" is only valid when currentBet === 0
 * - "call" is only valid when currentBet > 0
 * - "raise" is always valid (provided raises remain)
 * - "fold" is always valid
 */
export function isValidActionForBetState(
  action: BettingToolName,
  currentBet: number,
): boolean {
  if (action === "check" && currentBet > 0) return false;
  if (action === "call" && currentBet === 0) return false;
  return true;
}

/**
 * Fix an invalid action given the bet state, converting check→call
 * or call→check as appropriate.
 */
export function fixActionForBetState(
  action: BettingToolName,
  currentBet: number,
): BettingToolName {
  if (action === "check" && currentBet > 0) return "call";
  if (action === "call" && currentBet === 0) return "check";
  return action;
}