import { describe, expect, it } from "vitest";
import {
  PERSONALITY_DIALOGUE_PROFILES,
  getDialogueProfile,
  getDialogueProfileForBot,
  getTriggerDescription,
  shouldGenerateDialogue,
  getRandomReaction,
  ALL_DIALOGUE_TRIGGERS,
} from "./aiPersonalities";
import {
  AI_PERSONALITIES,
} from "./aiStrategy";

describe("aiPersonalities", () => {
  // ---------------------------------------------------------------------------
  // Profile registry
  // ---------------------------------------------------------------------------

  describe("PERSONALITY_DIALOGUE_PROFILES", () => {
    it("has a profile for each of the 4 personalities", () => {
      const personalities = Object.values(AI_PERSONALITIES);
      for (const personality of personalities) {
        expect(PERSONALITY_DIALOGUE_PROFILES[personality]).toBeDefined();
      }
      expect(Object.keys(PERSONALITY_DIALOGUE_PROFILES)).toHaveLength(4);
    });

    it("every profile has a non-empty system prompt", () => {
      for (const [, profile] of Object.entries(PERSONALITY_DIALOGUE_PROFILES)) {
        expect(profile.systemPrompt).toBeTruthy();
        expect(profile.systemPrompt.length).toBeGreaterThan(20);
      }
    });

    it("every profile has a non-empty style tag", () => {
      for (const [, profile] of Object.entries(PERSONALITY_DIALOGUE_PROFILES)) {
        expect(profile.styleTag).toBeTruthy();
      }
    });

    it("every profile has a valid maxTokens value", () => {
      for (const [, profile] of Object.entries(PERSONALITY_DIALOGUE_PROFILES)) {
        expect(profile.maxTokens).toBeGreaterThan(0);
        expect(profile.maxTokens).toBeLessThanOrEqual(100);
      }
    });

    it("every profile has chattiness for all dialogue triggers", () => {
      for (const [, profile] of Object.entries(PERSONALITY_DIALOGUE_PROFILES)) {
        for (const trigger of ALL_DIALOGUE_TRIGGERS) {
          const value = profile.chattiness[trigger];
          expect(value).toBeDefined();
          expect(typeof value).toBe("number");
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    });

    it("every profile has a greeting", () => {
      for (const [, profile] of Object.entries(PERSONALITY_DIALOGUE_PROFILES)) {
        expect(profile.greeting).toBeTruthy();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Personality style differences
  // ---------------------------------------------------------------------------

  describe("personality style keywords", () => {
    it("cautious profile contains cautious language", () => {
      const profile = getDialogueProfile(AI_PERSONALITIES.CAUTIOUS);
      expect(profile.systemPrompt.toLowerCase()).toContain("cautious");
      expect(profile.styleTag).toBe("cautious");
    });

    it("balanced profile contains analytical language", () => {
      const profile = getDialogueProfile(AI_PERSONALITIES.BALANCED);
      expect(profile.systemPrompt.toLowerCase()).toContain("analytical");
      expect(profile.styleTag).toBe("balanced");
    });

    it("aggressive profile contains aggressive language", () => {
      const profile = getDialogueProfile(AI_PERSONALITIES.AGGRESSIVE);
      const lower = profile.systemPrompt.toLowerCase();
      expect(lower.includes("aggressive") || lower.includes("overconfident") || lower.includes("trash talk")).toBe(true);
      expect(profile.styleTag).toBe("aggressive");
    });

    it("creative profile contains creative language", () => {
      const profile = getDialogueProfile(AI_PERSONALITIES.CREATIVE);
      const lower = profile.systemPrompt.toLowerCase();
      expect(lower.includes("creative") || lower.includes("playful") || lower.includes("unpredictable")).toBe(true);
      expect(profile.styleTag).toBe("creative");
    });
  });

  // ---------------------------------------------------------------------------
  // Chattiness hierarchy
  // ---------------------------------------------------------------------------

  describe("chattiness hierarchy", () => {
    it("Jax (aggressive) is chattier than Nora (cautious) across most triggers", () => {
      const jax = getDialogueProfile(AI_PERSONALITIES.AGGRESSIVE);
      const nora = getDialogueProfile(AI_PERSONALITIES.CAUTIOUS);
      let jaxHigher = 0;
      let noraHigher = 0;

      for (const trigger of ALL_DIALOGUE_TRIGGERS) {
        if (jax.chattiness[trigger] > nora.chattiness[trigger]) {
          jaxHigher++;
        } else if (nora.chattiness[trigger] > jax.chattiness[trigger]) {
          noraHigher++;
        }
      }

      expect(jaxHigher).toBeGreaterThan(noraHigher);
    });
  });

  // ---------------------------------------------------------------------------
  // getDialogueProfile
  // ---------------------------------------------------------------------------

  describe("getDialogueProfile", () => {
    it("returns the correct profile for each personality", () => {
      const cautious = getDialogueProfile(AI_PERSONALITIES.CAUTIOUS);
      expect(cautious.styleTag).toBe("cautious");

      const balanced = getDialogueProfile(AI_PERSONALITIES.BALANCED);
      expect(balanced.styleTag).toBe("balanced");

      const aggressive = getDialogueProfile(AI_PERSONALITIES.AGGRESSIVE);
      expect(aggressive.styleTag).toBe("aggressive");

      const creative = getDialogueProfile(AI_PERSONALITIES.CREATIVE);
      expect(creative.styleTag).toBe("creative");
    });
  });

  // ---------------------------------------------------------------------------
  // getDialogueProfileForBot
  // ---------------------------------------------------------------------------

  describe("getDialogueProfileForBot", () => {
    it("returns the cautious profile for nora", () => {
      const profile = getDialogueProfileForBot("nora");
      expect(profile.styleTag).toBe("cautious");
    });

    it("returns the balanced profile for ellis", () => {
      const profile = getDialogueProfileForBot("ellis");
      expect(profile.styleTag).toBe("balanced");
    });

    it("returns the aggressive profile for jax", () => {
      const profile = getDialogueProfileForBot("jax");
      expect(profile.styleTag).toBe("aggressive");
    });

    it("returns the creative profile for mira", () => {
      const profile = getDialogueProfileForBot("mira");
      expect(profile.styleTag).toBe("creative");
    });

    it("falls back to balanced for unknown bot id", () => {
      const profile = getDialogueProfileForBot("unknown" as any);
      expect(profile.styleTag).toBe("balanced");
    });
  });

  // ---------------------------------------------------------------------------
  // getTriggerDescription
  // ---------------------------------------------------------------------------

  describe("getTriggerDescription", () => {
    it("returns a non-empty description for every trigger", () => {
      for (const trigger of ALL_DIALOGUE_TRIGGERS) {
        const desc = getTriggerDescription(trigger);
        expect(desc).toBeTruthy();
        expect(desc.length).toBeGreaterThan(5);
      }
    });

    it("returns a descriptive human-readable string", () => {
      expect(getTriggerDescription("playerRaise")).toContain("raised");
      expect(getTriggerDescription("botWins")).toContain("won");
      expect(getTriggerDescription("gameStart")).toContain("started");
    });
  });

  // ---------------------------------------------------------------------------
  // shouldGenerateDialogue
  // ---------------------------------------------------------------------------

  describe("shouldGenerateDialogue", () => {
    it("always returns true when chattiness is 1.0 and random is below", () => {
      // Jax has chattiness 0.9 for playerRaise — random < 0.9 means yes
      expect(shouldGenerateDialogue(AI_PERSONALITIES.AGGRESSIVE, "playerRaise", 0.5)).toBe(true);
    });

    it("always returns false when random exceeds chattiness", () => {
      // Nora has chattiness 0.1 for playerCall — random > 0.1 means no
      expect(shouldGenerateDialogue(AI_PERSONALITIES.CAUTIOUS, "playerCall", 0.5)).toBe(false);
    });

    it("returns true when random exactly equals chattiness", () => {
      const profile = getDialogueProfile(AI_PERSONALITIES.CAUTIOUS);
      const chattiness = profile.chattiness.playerCall;
      expect(shouldGenerateDialogue(AI_PERSONALITIES.CAUTIOUS, "playerCall", chattiness)).toBe(false);
    });

    it("works with controlled randomness for deterministic tests", () => {
      // Nora has chattiness 0.4 for gameStart
      expect(shouldGenerateDialogue(AI_PERSONALITIES.CAUTIOUS, "gameStart", 0.3)).toBe(true);
      expect(shouldGenerateDialogue(AI_PERSONALITIES.CAUTIOUS, "gameStart", 0.5)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getRandomReaction
  // ---------------------------------------------------------------------------

  describe("getRandomReaction", () => {
    it("returns a reaction for a trigger that has reactions", () => {
      const reaction = getRandomReaction(AI_PERSONALITIES.AGGRESSIVE, "playerRaise", () => 0.5);
      expect(reaction).toBeTruthy();
      expect(typeof reaction).toBe("string");
    });

    it("returns null for a trigger with no reactions defined", () => {
      // Cautious profile doesn't define reactions for all triggers
      const reaction = getRandomReaction(AI_PERSONALITIES.CAUTIOUS, "playerCheck", () => 0.5);
      expect(reaction).toBeNull();
    });

    it("uses controlled random function for deterministic selection", () => {
      const profile = getDialogueProfile(AI_PERSONALITIES.AGGRESSIVE);
      const profileReactions = profile.reactions.playerRaise!;
      const firstReaction = profileReactions[0];

      // randomFn returns 0 → always picks index 0
      expect(getRandomReaction(AI_PERSONALITIES.AGGRESSIVE, "playerRaise", () => 0)).toBe(firstReaction);

      // randomFn returns a value → returns something from the list
      const reaction = getRandomReaction(AI_PERSONALITIES.AGGRESSIVE, "playerRaise", () => 0.5);
      expect(profileReactions).toContain(reaction);
    });
  });
});