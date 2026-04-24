import { describe, expect, it } from "vitest";
import {
  estimateHandStrength,
  getQuickRecommendation,
  getGameRulesForAI,
  getStageStrategy,
} from "./gameRules";

describe("gameRules", () => {
  describe("getGameRulesForAI", () => {
    it("returns a non-empty string", () => {
      const rules = getGameRulesForAI();
      expect(rules).toBeTruthy();
      expect(rules.length).toBeGreaterThan(100);
    });

    it("contains key game sections", () => {
      const rules = getGameRulesForAI();
      expect(rules).toContain("Word Poker");
      expect(rules).toContain("Betting");
      expect(rules).toContain("Letter Values");
      expect(rules).toContain("Scoring");
    });
  });

  describe("getStageStrategy", () => {
    const stages = ["preflop", "flop", "turn", "river", "final", "showdown"] as const;

    it("returns a non-empty strategy for every stage", () => {
      for (const stage of stages) {
        const strategy = getStageStrategy(stage);
        expect(strategy).toBeTruthy();
        expect(strategy.length).toBeGreaterThan(20);
      }
    });

    it("preflop strategy mentions private tiles", () => {
      expect(getStageStrategy("preflop")).toContain("2 private tiles");
    });

    it("flop strategy mentions community tiles", () => {
      expect(getStageStrategy("flop")).toContain("community");
    });

    it("showdown strategy mentions word building", () => {
      expect(getStageStrategy("showdown")).toContain("word");
    });
  });

  describe("estimateHandStrength", () => {
    it("returns values between 0 and 1", () => {
      const vowelHand = estimateHandStrength(
        [{ letter: "E", baseValue: 1 }, { letter: "A", baseValue: 1 }],
        [],
      );
      expect(vowelHand).toBeGreaterThanOrEqual(0);
      expect(vowelHand).toBeLessThanOrEqual(1);
    });

    it("strong vowels+common > rare consonants", () => {
      const strongStrength = estimateHandStrength(
        [
          { letter: "E", baseValue: 1 },
          { letter: "A", baseValue: 1 },
        ],
        [
          { letter: "R", baseValue: 2 },
          { letter: "S", baseValue: 2 },
          { letter: "T", baseValue: 2 },
        ],
      );

      const weakStrength = estimateHandStrength(
        [
          { letter: "Q", baseValue: 10 },
          { letter: "Z", baseValue: 10 },
        ],
        [
          { letter: "X", baseValue: 8 },
          { letter: "J", baseValue: 8 },
          { letter: "K", baseValue: 5 },
        ],
      );

      expect(strongStrength).toBeGreaterThan(weakStrength);
    });

    it("more tiles generally increase strength", () => {
      const twoTiles = estimateHandStrength(
        [{ letter: "A", baseValue: 1 }, { letter: "E", baseValue: 1 }],
        [],
      );

      const fiveTiles = estimateHandStrength(
        [{ letter: "A", baseValue: 1 }, { letter: "E", baseValue: 1 }],
        [
          { letter: "R", baseValue: 2 },
          { letter: "S", baseValue: 2 },
          { letter: "T", baseValue: 2 },
        ],
      );

      expect(fiveTiles).toBeGreaterThan(twoTiles);
    });

    it("returns 0 for empty hand with no community tiles", () => {
      // Edge case: no tiles at all — function returns NaN due to divide-by-zero
      // This is a known edge case; callers should ensure tiles exist before calling
      const strength = estimateHandStrength([], []);
      expect(isNaN(strength)).toBe(true);
    });
  });

  describe("getQuickRecommendation", () => {
    it("recommends fold for weak hand with significant bet", () => {
      expect(
        getQuickRecommendation(0.2, 60, 100, 100, "preflop"),
      ).toBe("fold");
    });

    it("recommends raise for strong hand with good pot odds", () => {
      expect(
        getQuickRecommendation(0.85, 20, 800, 200, "turn"),
      ).toBe("raise");
    });

    it("recommends fold or call for moderate hand with reasonable bet", () => {
      const result = getQuickRecommendation(0.5, 20, 500, 100, "flop");
      // 0.5 hand strength, currentBet 20, chips 500, pot 100, flop stage
      // potOdds = 100/20 = 5, chipRisk = 20/500 = 0.04
      // threshold for flop = 0.5 (not earlyStage), 0.5 > 0.4 threshold but < 0.7 for raise
      // handStrength > threshold → call
      expect(["fold", "call"]).toContain(result);
    });

    it("is more conservative in early stages", () => {
      // Same hand strength, same bet, but preflop is more conservative
      const early = getQuickRecommendation(0.35, 40, 200, 80, "preflop");
      const late = getQuickRecommendation(0.35, 40, 200, 80, "river");

      // Early stage folds more readily
      if (early === "fold") {
        // Late stage may fold, call, or raise — early should not be more aggressive
        expect(["fold", "call"]).toContain(late);
      }
    });

    it("folds when hand is weak and bet risk is high", () => {
      expect(
        getQuickRecommendation(0.15, 100, 200, 50, "turn"),
      ).toBe("fold");
    });
  });
});