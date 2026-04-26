import { describe, expect, it } from "vitest";
import {
  calculatePotOdds,
  calculateRateOfReturn,
  estimateHandStrength,
  estimateHandStrengthDetailed,
  getProbabilisticBettingAction,
  getQuickRecommendation,
  getGameRulesForAI,
  getStageStrategy,
} from "./gameRules";
import { AI_DIFFICULTY, AI_PERSONALITIES } from "./aiStrategy";

const defaultRaiseLadder = [20, 40, 60, 80, 100, 120, 140, 160, 200];

function probabilisticAction(args: {
  handStrength: number;
  currentBet: number;
  chips?: number;
  potSize?: number;
  ante?: number;
  personality?: (typeof AI_PERSONALITIES)[keyof typeof AI_PERSONALITIES];
  difficulty?: (typeof AI_DIFFICULTY)[keyof typeof AI_DIFFICULTY];
  raiseLadder?: number[];
  roll: number;
}) {
  return getProbabilisticBettingAction(
    args.handStrength,
    args.currentBet,
    args.chips ?? 1000,
    args.potSize ?? 80,
    args.ante ?? 20,
    "flop",
    args.personality ?? AI_PERSONALITIES.BALANCED,
    args.difficulty ?? AI_DIFFICULTY.MEDIUM,
    args.raiseLadder ?? defaultRaiseLadder,
    () => args.roll,
  );
}

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
      const strength = estimateHandStrength([], []);
      expect(strength).toBe(0);
    });
  });

  describe("calculatePotOdds", () => {
    it("returns 0 when current bet is 0 or negative", () => {
      expect(calculatePotOdds(0, 100)).toBe(0);
      expect(calculatePotOdds(-20, 100)).toBe(0);
    });

    it("calculates call cost as a share of the final pot", () => {
      expect(calculatePotOdds(20, 60)).toBe(0.25);
      expect(calculatePotOdds(40, 40)).toBe(0.5);
      expect(calculatePotOdds(20, 100)).toBeCloseTo(0.167, 3);
    });
  });

  describe("calculateRateOfReturn", () => {
    it("returns Infinity when pot odds are zero or negative", () => {
      expect(calculateRateOfReturn(0.5, 0)).toBe(Infinity);
      expect(calculateRateOfReturn(0.5, -0.25)).toBe(Infinity);
    });

    it("divides hand strength by pot odds", () => {
      expect(calculateRateOfReturn(0.5, 0.25)).toBe(2);
      expect(calculateRateOfReturn(0.2, 0.25)).toBe(0.8);
      expect(calculateRateOfReturn(0, 0.25)).toBe(0);
    });
  });

  describe("estimateHandStrengthDetailed", () => {
    it("matches estimateHandStrength for identical inputs", () => {
      const tiles = [
        { letter: "E", baseValue: 1 },
        { letter: "A", baseValue: 1 },
      ];
      const community = [
        { letter: "R", baseValue: 2 },
        { letter: "S", baseValue: 2 },
        { letter: "T", baseValue: 2 },
      ];

      expect(estimateHandStrengthDetailed(tiles, community).strength).toBe(
        estimateHandStrength(tiles, community),
      );
    });

    it("returns a safe zero breakdown for empty tiles", () => {
      const breakdown = estimateHandStrengthDetailed([], []);

      expect(breakdown).toEqual({
        strength: 0,
        vowelScore: 0,
        commonScore: 0,
        highValueScore: 0,
        avgValue: 0,
      });
      expect(Object.values(breakdown).every(Number.isFinite)).toBe(true);
    });

    it("scores vowel-balanced hands higher on vowelScore than consonant-heavy hands", () => {
      const vowelBalanced = estimateHandStrengthDetailed([
        { letter: "A", baseValue: 1 },
        { letter: "E", baseValue: 1 },
        { letter: "R", baseValue: 2 },
        { letter: "S", baseValue: 2 },
        { letter: "T", baseValue: 2 },
      ]);
      const consonantHeavy = estimateHandStrengthDetailed([
        { letter: "B", baseValue: 4 },
        { letter: "C", baseValue: 4 },
        { letter: "D", baseValue: 3 },
      ]);

      expect(vowelBalanced.vowelScore).toBeGreaterThan(consonantHeavy.vowelScore);
    });

    it("returns bounded score components", () => {
      const breakdown = estimateHandStrengthDetailed(
        [{ letter: "Q", baseValue: 10 }, { letter: "E", baseValue: 1 }],
        [{ letter: "R", baseValue: 2 }, { letter: "S", baseValue: 2 }],
      );

      expect(breakdown.strength).toBeGreaterThanOrEqual(0);
      expect(breakdown.strength).toBeLessThanOrEqual(1);
      expect(breakdown.vowelScore).toBeGreaterThanOrEqual(0);
      expect(breakdown.vowelScore).toBeLessThanOrEqual(1);
      expect(breakdown.commonScore).toBeGreaterThanOrEqual(0);
      expect(breakdown.commonScore).toBeLessThanOrEqual(1);
      expect(breakdown.highValueScore).toBeGreaterThanOrEqual(0);
      expect(breakdown.highValueScore).toBeLessThanOrEqual(0.3);
      expect(breakdown.avgValue).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getProbabilisticBettingAction", () => {
    it("selects actions from all RR buckets with fixed rolls", () => {
      expect(probabilisticAction({ handStrength: 0.1, currentBet: 20, roll: 0.02 }).action).toBe("fold");
      expect(probabilisticAction({ handStrength: 0.1, currentBet: 20, roll: 0.97 }).action).toBe("raise");
      expect(probabilisticAction({ handStrength: 0.3, currentBet: 40, potSize: 80, roll: 0.02 }).action).toBe("fold");
      expect(probabilisticAction({ handStrength: 0.3, currentBet: 40, potSize: 80, roll: 0.86 }).action).toBe("raise");
      expect(probabilisticAction({ handStrength: 0.35, currentBet: 40, potSize: 80, roll: 0.05 }).action).toBe("call");
      expect(probabilisticAction({ handStrength: 0.35, currentBet: 40, potSize: 80, roll: 0.75 }).action).toBe("raise");
      expect(probabilisticAction({ handStrength: 0.5, currentBet: 20, roll: 0.1 }).action).toBe("call");
      expect(probabilisticAction({ handStrength: 0.5, currentBet: 20, roll: 0.5 }).action).toBe("raise");
    });

    it("applies personality modifiers to final percentages", () => {
      const cautious = probabilisticAction({
        handStrength: 0.35,
        currentBet: 40,
        potSize: 80,
        personality: AI_PERSONALITIES.CAUTIOUS,
        roll: 0.5,
      });
      const aggressive = probabilisticAction({
        handStrength: 0.35,
        currentBet: 40,
        potSize: 80,
        personality: AI_PERSONALITIES.AGGRESSIVE,
        roll: 0.5,
      });
      const creative = probabilisticAction({
        handStrength: 0.24,
        currentBet: 40,
        potSize: 80,
        personality: AI_PERSONALITIES.CREATIVE,
        roll: 0.82,
      });
      const balancedLowRr = probabilisticAction({
        handStrength: 0.24,
        currentBet: 40,
        potSize: 80,
        personality: AI_PERSONALITIES.BALANCED,
        roll: 0.82,
      });

      expect(cautious.debug.finalPct.fold).toBeGreaterThan(aggressive.debug.finalPct.fold);
      expect(aggressive.debug.finalPct.raise).toBeGreaterThan(cautious.debug.finalPct.raise);
      expect(creative.debug.finalPct.raise).toBeGreaterThan(balancedLowRr.debug.finalPct.raise);
    });

    it("applies difficulty modifiers to final percentages", () => {
      const easy = probabilisticAction({
        handStrength: 0.35,
        currentBet: 40,
        potSize: 80,
        difficulty: AI_DIFFICULTY.EASY,
        roll: 0.5,
      });
      const hard = probabilisticAction({
        handStrength: 0.35,
        currentBet: 40,
        potSize: 80,
        difficulty: AI_DIFFICULTY.HARD,
        roll: 0.5,
      });

      expect(easy.debug.finalPct.fold).toBeGreaterThan(hard.debug.finalPct.fold);
      expect(hard.debug.finalPct.raise).toBeGreaterThan(easy.debug.finalPct.raise);
    });

    it("never folds for free", () => {
      expect(probabilisticAction({ handStrength: 0.1, currentBet: 0, roll: 0.02 }).action).toBe("check");
    });

    it("uses stack protection for weak hands that would leave less than four antes", () => {
      const protectedAction = probabilisticAction({
        handStrength: 0.3,
        currentBet: 40,
        chips: 50,
        potSize: 1000,
        ante: 20,
        roll: 0.99,
      });
      const strongAction = probabilisticAction({
        handStrength: 0.8,
        currentBet: 40,
        chips: 1000,
        ante: 20,
        roll: 0.5,
      });

      expect(protectedAction.action).toBe("fold");
      expect(protectedAction.debug.stackProtection).toBe(true);
      expect(strongAction.debug.stackProtection).toBe(false);
    });

    it("calculates raise amounts from the next raise ladder step", () => {
      const result = probabilisticAction({ handStrength: 0.5, currentBet: 20, roll: 0.5 });

      expect(result.action).toBe("raise");
      expect(result.raiseAmount).toBe(40);
    });

    it("converts impossible raises to call or check", () => {
      expect(
        probabilisticAction({
          handStrength: 0.5,
          currentBet: 200,
          potSize: 1000,
          raiseLadder: defaultRaiseLadder,
          roll: 0.5,
        }).action,
      ).toBe("call");
      expect(
        probabilisticAction({
          handStrength: 0.5,
          currentBet: 0,
          raiseLadder: [],
          roll: 0.99,
        }).action,
      ).toBe("check");
    });

    it("does not call or raise with no chips", () => {
      expect(probabilisticAction({ handStrength: 0.8, currentBet: 0, chips: 0, roll: 0.99 }).action).toBe("check");
      expect(probabilisticAction({ handStrength: 0.8, currentBet: 20, chips: 0, roll: 0.99 }).action).toBe("fold");
    });

    it("clamps injected random rolls defensively", () => {
      expect(probabilisticAction({ handStrength: 0.5, currentBet: 20, roll: -1 }).debug.roll).toBe(0);
      expect(probabilisticAction({ handStrength: 0.5, currentBet: 20, roll: 2 }).debug.roll).toBe(0.999999);
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
