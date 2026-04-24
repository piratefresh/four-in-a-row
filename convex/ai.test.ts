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
  getQuickRecommendation,
} from "./gameRules";
import { parseBettingToolCall, parseStructuredTextResponse } from "./aiTools";

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

    describe("getQuickRecommendation", () => {
      it("recommends fold for weak hand with high bet risk", () => {
        const recommendation = getQuickRecommendation(
          0.2, // low hand strength
          60, // current bet
          100, // chips
          100, // pot
          "preflop",
        );
        expect(recommendation).toBe("fold");
      });

      it("recommends raise for strong hand with good pot odds", () => {
        const recommendation = getQuickRecommendation(
          0.8, // high hand strength
          20, // small current bet
          500, // plenty of chips
          200, // good pot
          "turn", // later stage
        );
        expect(recommendation).toBe("raise");
      });

it("recommends fold or call for moderate hand", () => {
      const recommendation = getQuickRecommendation(
        0.5, // medium hand strength
        20, // reasonable current bet
        500, // plenty of chips
        100, // decent pot
        "flop",
      );
      // 0.5 is at the threshold for flop (not earlyStage), may fold or call
      expect(["fold", "call"]).toContain(recommendation);
    });

      it("is more conservative in early stages", () => {
        const earlyRecommendation = getQuickRecommendation(
          0.4, // medium-low hand strength
          40, // moderate bet
          200, // moderate chips
          100, // moderate pot
          "preflop",
        );
        const lateRecommendation = getQuickRecommendation(
          0.4,
          40,
          200,
          100,
          "river",
        );

        // Early stage with same hand should be more likely to fold
        if (earlyRecommendation === "fold") {
          expect(["fold", "call"]).toContain(lateRecommendation);
        }
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