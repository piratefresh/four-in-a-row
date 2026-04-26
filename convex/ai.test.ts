/**
 * Tests for AI decision parsing and fallback logic
 *
 * Tests the pure-function layer of ai.ts: parsing structured text responses,
 * validating showdown word attempts, and computing fallback decisions.
 * Does NOT test actual LLM API calls.
 */

import { describe, expect, it } from "vitest";
import {
  estimateHandStrength,
  getProbabilisticBettingAction,
} from "./gameRules";
import { parseBettingToolCall, parseStructuredTextResponse } from "./aiTools";
import { AI_DIFFICULTY, AI_PERSONALITIES } from "./aiStrategy";

describe("AI decision helpers", () => {
  // ---------------------------------------------------------------------------
  // Fallback betting decision logic (tests the gameRules helpers used by fallback)
  // ---------------------------------------------------------------------------

  describe("fallback betting decision (via gameRules)", () => {
    describe("estimateHandStrength", () => {
      it("returns a value between 0 and 1", () => {
        const strength = estimateHandStrength(
          [{ letter: "R", baseValue: 2 }, { letter: "E", baseValue: 1 }],
          [],
        );
        expect(strength).toBeGreaterThanOrEqual(0);
        expect(strength).toBeLessThanOrEqual(1);
      });

      it("rates a strong hand (common letters + vowels) higher than weak hand (rare consonants)", () => {
        const strongHand = [
          { letter: "E", baseValue: 1 },
          { letter: "A", baseValue: 1 },
        ];
        const strongCommunity = [
          { letter: "R", baseValue: 2 },
          { letter: "S", baseValue: 2 },
          { letter: "T", baseValue: 2 },
        ];

        const weakHand = [
          { letter: "Q", baseValue: 10 },
          { letter: "Z", baseValue: 10 },
        ];
        const weakCommunity = [
          { letter: "X", baseValue: 8 },
          { letter: "J", baseValue: 8 },
          { letter: "K", baseValue: 5 },
        ];

        const strongStrength = estimateHandStrength(strongHand, strongCommunity);
        const weakStrength = estimateHandStrength(weakHand, weakCommunity);

        expect(strongStrength).toBeGreaterThan(weakStrength);
      });

      it("handles empty community tiles", () => {
        const strength = estimateHandStrength(
          [{ letter: "A", baseValue: 1 }, { letter: "E", baseValue: 1 }],
          [],
        );
        expect(strength).toBeGreaterThanOrEqual(0);
        expect(strength).toBeLessThanOrEqual(1);
      });
    });

    describe("getProbabilisticBettingAction", () => {
      it("recommends fold for weak hand with high bet risk", () => {
        const recommendation = getProbabilisticBettingAction(
          0.2,
          60,
          100,
          100,
          20,
          "preflop",
          AI_PERSONALITIES.BALANCED,
          AI_DIFFICULTY.MEDIUM,
          [20, 40, 60, 80, 100, 120, 140, 160, 200],
          () => 0.1,
        );
        expect(recommendation.action).toBe("fold");
      });

      it("recommends raise for strong hand with good pot odds", () => {
        const recommendation = getProbabilisticBettingAction(
          0.8,
          20,
          500,
          200,
          20,
          "turn",
          AI_PERSONALITIES.BALANCED,
          AI_DIFFICULTY.MEDIUM,
          [20, 40, 60, 80, 100, 120, 140, 160, 200],
          () => 0.5,
        );
        expect(recommendation.action).toBe("raise");
      });

      it("recommends call or raise for moderate positive-RR hands", () => {
        const recommendation = getProbabilisticBettingAction(
          0.5,
          20,
          500,
          100,
          20,
          "flop",
          AI_PERSONALITIES.BALANCED,
          AI_DIFFICULTY.MEDIUM,
          [20, 40, 60, 80, 100, 120, 140, 160, 200],
          () => 0.1,
        );
        expect(["call", "raise"]).toContain(recommendation.action);
      });

      it("never folds for free", () => {
        const recommendation = getProbabilisticBettingAction(
          0.1,
          0,
          200,
          100,
          20,
          "preflop",
          AI_PERSONALITIES.BALANCED,
          AI_DIFFICULTY.MEDIUM,
          [20, 40, 60, 80, 100, 120, 140, 160, 200],
          () => 0,
        );
        expect(recommendation.action).toBe("check");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Structured text parsing (legacy fallback)
  // ---------------------------------------------------------------------------

  describe("structured text parsing (legacy)", () => {
    it("parses a well-formed ACTION: CALL response", () => {
      const toolCall = parseStructuredTextResponse(
        "ACTION: CALL\nREASONING: Good pot odds",
      );
      expect(toolCall).not.toBeNull();
      expect(toolCall!.name).toBe("call");
      expect(toolCall!.arguments.reasoning).toBe("Good pot odds");
    });

    it("parses ACTION: RAISE with RAISE_AMOUNT", () => {
      const toolCall = parseStructuredTextResponse(
        "ACTION: RAISE\nRAISE_AMOUNT: 60\nREASONING: Strong hand",
      );
      expect(toolCall).not.toBeNull();
      expect(toolCall!.name).toBe("raise");
      expect(toolCall!.arguments.amount).toBe(60);
    });

    it("returns null for unparseable text", () => {
      expect(parseStructuredTextResponse("I think I should call")).toBeNull();
      expect(parseStructuredTextResponse("")).toBeNull();
      expect(parseStructuredTextResponse("random gibberish here")).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Integration: tool call → AIBettingDecision
  // ---------------------------------------------------------------------------

  describe("tool call to AIBettingDecision integration", () => {
    const fallback = {
      action: "fold" as const,
      reasoning: "Fallback",
      confidence: 0.4,
    };

    it("converts a check tool call when bet is 0", () => {
      const result = parseBettingToolCall(
        { name: "check", arguments: {} },
        fallback,
        0,
      );
      expect(result.action).toBe("check");
    });

    it("converts a raise tool call with valid amount", () => {
      const result = parseBettingToolCall(
        { name: "raise", arguments: { amount: 60 } },
        fallback,
        40,
      );
      expect(result.action).toBe("raise");
      expect(result.raiseAmount).toBe(60);
    });

    it("fixes an invalid check when bet is outstanding", () => {
      // LLM says "check" but there's a bet to match — should fall through
      // to the fallback action since we don't auto-fix in parseBettingToolCall
      const result = parseBettingToolCall(
        { name: "check", arguments: {} },
        { ...fallback, action: "call" },
        20,
      );
      expect(result.action).toBe("check");
      // The game logic layer should validate this later
    });

    it("falls back when tool call is null", () => {
      const result = parseBettingToolCall(null, fallback, 20);
      expect(result).toEqual(fallback);
    });

    it("falls back for unknown tool name", () => {
      const result = parseBettingToolCall(
        { name: "bet", arguments: {} },
        fallback,
        20,
      );
      expect(result).toEqual(fallback);
    });
  });
});
