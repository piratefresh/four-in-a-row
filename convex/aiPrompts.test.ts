import { describe, expect, it } from "vitest";
import {
  AI_PROMPTS,
  isValidSemver,
  getPrompt,
  getShowdownStrategyHint,
  type BettingPromptVars,
  type ShowdownPromptVars,
  type DialoguePromptVars,
} from "./aiPrompts";
import type { GameStage } from "./gameState";

describe("aiPrompts", () => {
  describe("isValidSemver", () => {
    it("accepts valid semver strings", () => {
      expect(isValidSemver("1.0.0")).toBe(true);
      expect(isValidSemver("2.3.14")).toBe(true);
      expect(isValidSemver("0.0.1")).toBe(true);
    });

    it("rejects invalid semver strings", () => {
      expect(isValidSemver("1.0")).toBe(false);
      expect(isValidSemver("v1.0.0")).toBe(false);
      expect(isValidSemver("1.0.0-beta")).toBe(false);
      expect(isValidSemver("")).toBe(false);
    });
  });

  describe("AI_PROMPTS registry", () => {
    it("has valid ids and versions for every prompt", () => {
      for (const [, entry] of Object.entries(AI_PROMPTS)) {
        expect(entry.id).toBeTruthy();
        expect(entry.version).toBeTruthy();
        expect(isValidSemver(entry.version)).toBe(true);
        expect(entry.description).toBeTruthy();
        expect(typeof entry.build).toBe("function");
      }
    });

    it("has exactly 3 registered prompts", () => {
      const keys = Object.keys(AI_PROMPTS);
      expect(keys).toContain("bettingTooluse");
      expect(keys).toContain("showdownTooluse");
      expect(keys).toContain("dialogue");
      expect(keys).toHaveLength(3);
    });
  });

  describe("getPrompt", () => {
    it("returns the correct prompt for a known id", () => {
      const prompt = getPrompt<BettingPromptVars>("bettingTooluse");
      expect(prompt.id).toBe("betting-tooluse");
    });

    it("throws for an unknown id", () => {
      expect(() => getPrompt("nonexistent" as any)).toThrow("Unknown prompt ID");
    });
  });

  describe("bettingTooluse prompt", () => {
    const fullVars: BettingPromptVars = {
      handTiles: "E(1), R(2)",
      communityTilesRevealed: "A(1), T(2)",
      stage: "flop" as GameStage,
      currentBet: 20,
      chips: 800,
      pot: 60,
      currentRaises: 0,
      maxRaises: 3,
      raiseLadderNext: "40",
      personality: "aggressive",
      personalityDescription: "Jax Rook, a bold and competitive player",
      handStrength: 0.65,
      potOdds: 0.25,
      rateOfReturn: 2.6,
      recommendedAction: "raise",
      fcrRecommendation: "fold 0.0%, call 30.0%, raise 70.0% (RR >= 1.3)",
      isBluffing: false,
      believesPlayer: null,
    };

    it("produces a prompt with all required sections", () => {
      const result = AI_PROMPTS.bettingTooluse.build(fullVars);
      expect(result).toContain("# Word Poker Game Rules");
      expect(result).toContain("Your Personality");
      expect(result).toContain("Current Situation");
      expect(result).toContain("Your hand (private)");
      expect(result).toContain("Community tiles (revealed)");
      expect(result).toContain("Available Actions");
      expect(result).toContain("CALL");
      expect(result).toContain("RAISE");
    });

    it("includes hand strength as a percentage", () => {
      const result = AI_PROMPTS.bettingTooluse.build(fullVars);
      expect(result).toContain("65%");
    });

    it("includes probabilistic analysis", () => {
      const result = AI_PROMPTS.bettingTooluse.build(fullVars);
      expect(result).toContain("Probabilistic Analysis");
      expect(result).toContain("Pot odds: 0.250");
      expect(result).toContain("Rate of return: 2.600");
      expect(result).toContain("Recommended action: raise");
      expect(result).toContain("FCR distribution");
    });

    it("shows CHECK when current bet is 0", () => {
      const vars = { ...fullVars, currentBet: 0, raiseLadderNext: "20" };
      const result = AI_PROMPTS.bettingTooluse.build(vars);
      expect(result).toContain("CHECK");
      expect(result).not.toContain("CALL");
    });

    it("shows CALL when current bet is greater than 0", () => {
      const result = AI_PROMPTS.bettingTooluse.build(fullVars);
      expect(result).toContain("CALL (pay 20 chips to stay in)");
      expect(result).not.toContain("- CHECK");
    });

    it("omits RAISE when max raises reached", () => {
      const vars = { ...fullVars, currentRaises: 3, maxRaises: 3 };
      const result = AI_PROMPTS.bettingTooluse.build(vars);
      expect(result).not.toContain("RAISE");
    });

    it("includes bluffing indicator when bluffing", () => {
      const vars = { ...fullVars, isBluffing: true };
      const result = AI_PROMPTS.bettingTooluse.build(vars);
      expect(result).toContain("act more confident");
    });

    it("produces a string with no undefined interpolations", () => {
      const result = AI_PROMPTS.bettingTooluse.build(fullVars);
      expect(result).not.toContain("undefined");
      expect(result).not.toContain("null");
    });
  });

  describe("showdownTooluse prompt", () => {
    const fullVars: ShowdownPromptVars = {
      handTiles: "E(1), R(2)",
      communityTilesRevealed: "A(1), T(2), S(2), I(1), N(2)",
      allTilesAvailable: "E, R, A, T, S, I, N",
      difficulty: "medium",
      personality: "balanced",
      personalityDescription: "Ellis March, a methodical and balanced player",
      strategyHint: getShowdownStrategyHint("medium"),
      believesPlayer: null,
    };

    it("produces a prompt with showdown context", () => {
      const result = AI_PROMPTS.showdownTooluse.build(fullVars);
      expect(result).toContain("Available Tiles");
      expect(result).toContain("Your hand");
      expect(result).toContain("Community (revealed)");
      expect(result).toContain("Strategy Hint");
      expect(result).toContain("2-7 letters");
      expect(result).toContain("CSW24");
    });

    it("adapts personality description based on difficulty", () => {
      const easyResult = AI_PROMPTS.showdownTooluse.build({
        ...fullVars,
        difficulty: "easy",
      });
      expect(easyResult).toContain("casual player");
      expect(easyResult).not.toContain("expert player");

      const hardResult = AI_PROMPTS.showdownTooluse.build({
        ...fullVars,
        difficulty: "hard",
      });
      expect(hardResult).toContain("expert player");
    });

    it("produces a string with no undefined interpolations", () => {
      const result = AI_PROMPTS.showdownTooluse.build(fullVars);
      expect(result).not.toContain("undefined");
      expect(result).not.toContain("null");
    });
  });

  describe("dialogue prompt", () => {
    const fullVars: DialoguePromptVars = {
      botName: "Jax Rook",
      botTitle: "The Blade",
      personality: "aggressive",
      personalityDescription: "a bold, overconfident trash-talker",
      chattinessDescription: "You speak often and love to taunt opponents.",
      trigger: "playerRaise",
      triggerDescription: "The player just raised the bet",
      gameState: "Stage: flop, Pot: 60, Your chips: 800",
      recentMessages: "Player: I'm feeling lucky!",
      maxTokens: 50,
      believesPlayer: null,
    };

    it("produces a prompt with personality context", () => {
      const result = AI_PROMPTS.dialogue.build(fullVars);
      expect(result).toContain("Jax Rook");
      expect(result).toContain("The Blade");
      expect(result).toContain("bold, overconfident trash-talker");
      expect(result).toContain("What Just Happened");
      expect(result).toContain("Game State");
      expect(result).toContain("Recent Chat");
    });

    it("includes token limit instruction", () => {
      const result = AI_PROMPTS.dialogue.build(fullVars);
      expect(result).toContain("50 tokens");
    });

    it("handles no recent messages", () => {
      const result = AI_PROMPTS.dialogue.build({ ...fullVars, recentMessages: "" });
      expect(result).toContain("No recent messages");
    });

    it("produces a string with no undefined interpolations", () => {
      const result = AI_PROMPTS.dialogue.build(fullVars);
      expect(result).not.toContain("undefined");
      expect(result).not.toContain("null");
    });
  });

  describe("getShowdownStrategyHint", () => {
    it("returns easy hint for easy difficulty", () => {
      expect(getShowdownStrategyHint("easy")).toContain("reasonable");
    });

    it("returns hard hint for hard difficulty", () => {
      expect(getShowdownStrategyHint("hard")).toContain("Maximize score");
    });

    it("returns default hint for unknown difficulty", () => {
      expect(getShowdownStrategyHint("unknown")).toContain("best word");
    });
  });
});
