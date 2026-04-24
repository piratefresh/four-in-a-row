import { describe, expect, it } from "vitest";
import {
  BETTING_TOOLS,
  SHOWDOWN_TOOLS,
  isBettingToolName,
  parseBettingToolCall,
  clampRaiseAmount,
  parseStructuredTextResponse,
  isValidActionForBetState,
  fixActionForBetState,
} from "./aiTools";
import { RAISE_LADDER } from "./gameState";
import type { AIBettingDecision } from "./ai";

describe("aiTools", () => {
  const fallbackDecision: AIBettingDecision = {
    action: "fold",
    reasoning: "Fallback",
    confidence: 0.3,
  };

  // ---------------------------------------------------------------------------
  // Tool schema validation
  // ---------------------------------------------------------------------------

  describe("BETTING_TOOLS", () => {
    it("has exactly 4 tools: check, call, raise, fold", () => {
      const names = BETTING_TOOLS.map((t) => t.function.name);
      expect(names).toEqual(["check", "call", "raise", "fold"]);
    });

    it("each tool has a description", () => {
      for (const tool of BETTING_TOOLS) {
        expect(tool.function.description).toBeTruthy();
        expect(typeof tool.function.description).toBe("string");
      }
    });

    it("raise tool requires an amount parameter", () => {
      const raiseTool = BETTING_TOOLS.find((t) => t.function.name === "raise")!;
      const params = raiseTool.function.parameters as { required: string[]; properties: Record<string, { description?: string; type?: string }> };
      expect(params.required).toContain("amount");
      expect(params.properties.amount).toBeDefined();
      expect(params.properties.amount.type).toBe("number");
    });

    it("check and call tools have no required parameters", () => {
      const checkTool = BETTING_TOOLS.find((t) => t.function.name === "check")!;
      const callTool = BETTING_TOOLS.find((t) => t.function.name === "call")!;
      expect(checkTool.function.parameters.required).toEqual([]);
      expect(callTool.function.parameters.required).toEqual([]);
    });
  });

  describe("SHOWDOWN_TOOLS", () => {
    it("has exactly 1 tool: submit_word", () => {
      expect(SHOWDOWN_TOOLS).toHaveLength(1);
      expect(SHOWDOWN_TOOLS[0].function.name).toBe("submit_word");
    });

    it("submit_word requires a word parameter", () => {
      const tool = SHOWDOWN_TOOLS[0];
      expect(tool.function.parameters.required).toContain("word");
      expect(tool.function.parameters.properties.word).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // isBettingToolName
  // ---------------------------------------------------------------------------

  describe("isBettingToolName", () => {
    it("recognizes all valid betting tool names", () => {
      expect(isBettingToolName("check")).toBe(true);
      expect(isBettingToolName("call")).toBe(true);
      expect(isBettingToolName("raise")).toBe(true);
      expect(isBettingToolName("fold")).toBe(true);
    });

    it("rejects invalid names", () => {
      expect(isBettingToolName("bet")).toBe(false);
      expect(isBettingToolName("submit_word")).toBe(false);
      expect(isBettingToolName("")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // parseBettingToolCall
  // ---------------------------------------------------------------------------

  describe("parseBettingToolCall", () => {
    it("parses a check action", () => {
      const result = parseBettingToolCall(
        { name: "check", arguments: {} },
        fallbackDecision,
        0,
      );
      expect(result.action).toBe("check");
      expect(result.confidence).toBe(0.3);
    });

    it("parses a call action", () => {
      const result = parseBettingToolCall(
        { name: "call", arguments: {} },
        fallbackDecision,
        20,
      );
      expect(result.action).toBe("call");
    });

    it("parses a raise action with amount", () => {
      const result = parseBettingToolCall(
        { name: "raise", arguments: { amount: 40 } },
        fallbackDecision,
        20,
      );
      expect(result.action).toBe("raise");
      expect(result.raiseAmount).toBe(40);
    });

    it("parses a raise action with reasoning", () => {
      const result = parseBettingToolCall(
        { name: "raise", arguments: { amount: 60, reasoning: "Strong hand" } },
        fallbackDecision,
        20,
      );
      expect(result.reasoning).toBe("Strong hand");
    });

    it("parses a fold action with reasoning", () => {
      const result = parseBettingToolCall(
        { name: "fold", arguments: { reasoning: "Weak hand" } },
        fallbackDecision,
        40,
      );
      expect(result.action).toBe("fold");
      expect(result.reasoning).toBe("Weak hand");
    });

    it("clamps invalid raise amount to next ladder step", () => {
      const result = parseBettingToolCall(
        { name: "raise", arguments: { amount: 10 } },
        fallbackDecision,
        20,
      );
      expect(result.action).toBe("raise");
      expect(result.raiseAmount).toBe(40); // next step above 20
    });

    it("falls back to fallback when tool call is null", () => {
      const result = parseBettingToolCall(null, fallbackDecision, 0);
      expect(result).toEqual(fallbackDecision);
    });

    it("falls back to fallback for unknown tool name", () => {
      const result = parseBettingToolCall(
        { name: "bet", arguments: {} },
        fallbackDecision,
        0,
      );
      expect(result).toEqual(fallbackDecision);
    });

    it("defaults reasoning for check/call when not provided", () => {
      const checkResult = parseBettingToolCall(
        { name: "check", arguments: {} },
        fallbackDecision,
        0,
      );
      expect(checkResult.reasoning).toBe("AI chose to check");

      const callResult = parseBettingToolCall(
        { name: "call", arguments: {} },
        fallbackDecision,
        20,
      );
      expect(callResult.reasoning).toBe("AI chose to call");
    });
  });

  // ---------------------------------------------------------------------------
  // clampRaiseAmount
  // ---------------------------------------------------------------------------

  describe("clampRaiseAmount", () => {
    it("returns the exact ladder value when valid", () => {
      expect(clampRaiseAmount(40, 20, RAISE_LADDER)).toBe(40);
      expect(clampRaiseAmount(100, 60, RAISE_LADDER)).toBe(100);
    });

    it("snaps up to the next ladder step when between steps", () => {
      expect(clampRaiseAmount(50, 20, RAISE_LADDER)).toBe(60);
      expect(clampRaiseAmount(75, 40, RAISE_LADDER)).toBe(80);
    });

    it("finds next step above current bet when amount is at or below current bet", () => {
      expect(clampRaiseAmount(20, 20, RAISE_LADDER)).toBe(40);
      expect(clampRaiseAmount(10, 20, RAISE_LADDER)).toBe(40);
    });

    it("handles undefined amount", () => {
      expect(clampRaiseAmount(undefined, 20, RAISE_LADDER)).toBe(40);
    });

    it("defaults to currentBet + 20 when ladder is exhausted", () => {
      expect(clampRaiseAmount(500, 200, [20, 40, 60])).toBe(220);
    });
  });

  // ---------------------------------------------------------------------------
  // parseStructuredTextResponse
  // ---------------------------------------------------------------------------

  describe("parseStructuredTextResponse", () => {
    it("parses ACTION: CALL", () => {
      const result = parseStructuredTextResponse("ACTION: CALL\nREASONING: Good hand");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("call");
      expect(result!.arguments.reasoning).toBe("Good hand");
    });

    it("parses ACTION: RAISE with RAISE_AMOUNT", () => {
      const result = parseStructuredTextResponse(
        "ACTION: RAISE\nRAISE_AMOUNT: 60\nREASONING: Strong tiles",
      );
      expect(result).not.toBeNull();
      expect(result!.name).toBe("raise");
      expect(result!.arguments.amount).toBe(60);
      expect(result!.arguments.reasoning).toBe("Strong tiles");
    });

    it("parses ACTION: FOLD", () => {
      const result = parseStructuredTextResponse("ACTION: FOLD");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("fold");
    });

    it("parses ACTION: CHECK", () => {
      const result = parseStructuredTextResponse("ACTION: CHECK");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("check");
    });

    it("returns null for text without ACTION pattern", () => {
      expect(parseStructuredTextResponse("I think I should call")).toBeNull();
      expect(parseStructuredTextResponse("")).toBeNull();
    });

    it("is case-insensitive for action", () => {
      const result = parseStructuredTextResponse("action: call\nreasoning: ok");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("call");
    });
  });

  // ---------------------------------------------------------------------------
  // isValidActionForBetState / fixActionForBetState
  // ---------------------------------------------------------------------------

  describe("isValidActionForBetState", () => {
    it("check is only valid when currentBet is 0", () => {
      expect(isValidActionForBetState("check", 0)).toBe(true);
      expect(isValidActionForBetState("check", 20)).toBe(false);
    });

    it("call is only valid when currentBet is > 0", () => {
      expect(isValidActionForBetState("call", 0)).toBe(false);
      expect(isValidActionForBetState("call", 20)).toBe(true);
    });

    it("raise and fold are always valid", () => {
      expect(isValidActionForBetState("raise", 0)).toBe(true);
      expect(isValidActionForBetState("raise", 20)).toBe(true);
      expect(isValidActionForBetState("fold", 0)).toBe(true);
      expect(isValidActionForBetState("fold", 20)).toBe(true);
    });
  });

  describe("fixActionForBetState", () => {
    it("converts check to call when there is a bet", () => {
      expect(fixActionForBetState("check", 20)).toBe("call");
    });

    it("converts call to check when bet is 0", () => {
      expect(fixActionForBetState("call", 0)).toBe("check");
    });

    it("leaves valid actions unchanged", () => {
      expect(fixActionForBetState("check", 0)).toBe("check");
      expect(fixActionForBetState("call", 20)).toBe("call");
      expect(fixActionForBetState("raise", 20)).toBe("raise");
      expect(fixActionForBetState("fold", 20)).toBe("fold");
    });
  });
});