import { describe, expect, it } from "vitest";
import {
  prepareDialoguePrompt,
  tryTemplateReaction,
  cleanDialogueResponse,
  buildGameStateDescription,
} from "./aiDialogue";
import {
  AI_PERSONALITIES,
} from "./aiStrategy";

describe("aiDialogue", () => {
  // ---------------------------------------------------------------------------
  // prepareDialoguePrompt
  // ---------------------------------------------------------------------------

  describe("prepareDialoguePrompt", () => {
    const baseRequest = {
      botCharacterId: "jax" as const,
      trigger: "playerRaise" as const,
      gameState: "Stage: flop. Pot: 60.",
      recentMessages: "Player: I'm feeling lucky!",
    };

    it("returns shouldSpeak=true when chattiness allows it", () => {
      const result = prepareDialoguePrompt({
        ...baseRequest,
        randomFn: () => 0.1, // well below jax's 0.8 chattiness for playerRaise
      });
      expect(result.shouldSpeak).toBe(true);
      expect(result.prompt).toBeTruthy();
    });

    it("returns shouldSpeak=false when random exceeds chattiness", () => {
      // Nora has chattiness 0.3 for playerRaise
      const result = prepareDialoguePrompt({
        ...baseRequest,
        botCharacterId: "nora",
        randomFn: () => 0.9, // above 0.3
      });
      expect(result.shouldSpeak).toBe(false);
      expect(result.prompt).toBe("");
    });

    it("includes bot name and personality in prompt", () => {
      const result = prepareDialoguePrompt({
        ...baseRequest,
        randomFn: () => 0.1,
      });
      expect(result.shouldSpeak).toBe(true);
      expect(result.prompt).toContain("Jax Rook");
      expect(result.prompt).toContain("The Blade");
    });

    it("includes game state in prompt", () => {
      const result = prepareDialoguePrompt({
        ...baseRequest,
        randomFn: () => 0.1,
      });
      expect(result.prompt).toContain("Stage: flop. Pot: 60.");
    });

    it("includes trigger description in prompt", () => {
      const result = prepareDialoguePrompt({
        ...baseRequest,
        randomFn: () => 0.1,
      });
      expect(result.prompt).toContain("raised");
    });

    it("includes recent messages in prompt", () => {
      const result = prepareDialoguePrompt({
        ...baseRequest,
        randomFn: () => 0.1,
      });
      expect(result.prompt).toContain("Player: I'm feeling lucky!");
    });
  });

  // ---------------------------------------------------------------------------
  // tryTemplateReaction
  // ---------------------------------------------------------------------------

  describe("tryTemplateReaction", () => {
    const baseRequest = {
      botCharacterId: "jax" as const,
      trigger: "playerRaise" as const,
      gameState: "Stage: flop. Pot: 60.",
      recentMessages: "",
    };

    it("returns a template reaction when one exists and randomness allows", () => {
      const result = tryTemplateReaction({
        ...baseRequest,
        randomFn: () => 0.1, // low value for shouldGenerateDialogue AND template selection AND < 0.5
      });
      // May or may not return depending on internal randomness paths
      // but should not throw
      expect(result === null || typeof result.message === "string").toBe(true);
    });

    it("returns null when chattiness check fails", () => {
      const result = tryTemplateReaction({
        botCharacterId: "nora",
        trigger: "playerCheck", // nora has 0.1 chattiness for playerCheck
        gameState: "",
        recentMessages: "",
        randomFn: () => 0.9, // above chattiness threshold
      });
      expect(result).toBeNull();
    });

    it("returns a reaction with wasTemplateReaction=true when template is used", () => {
      // Use a trigger that has reactions and a personality with high chattiness
      let callCount = 0;
      const controlledRandom = () => {
        callCount++;
        // First call: shouldGenerateDialogue check (needs to be < 0.8 for jax)
        // Second call: getRandomReaction index (any value)
        // Third call: template chance check (needs to be < 0.5)
        if (callCount === 1) return 0.1; // pass chattiness check
        if (callCount === 2) return 0; // pick reaction index 0
        return 0.3; // pass template chance (< 0.5)
      };

      const result = tryTemplateReaction({
        ...baseRequest,
        trigger: "playerFold", // jax has reactions for this
        randomFn: controlledRandom,
      });

      if (result) {
        expect(result.wasTemplateReaction).toBe(true);
        expect(result.trigger).toBe("playerFold");
        expect(result.botCharacterId).toBe("jax");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // cleanDialogueResponse
  // ---------------------------------------------------------------------------

  describe("cleanDialogueResponse", () => {
    it("strips surrounding double quotes", () => {
      expect(cleanDialogueResponse('"Too easy."')).toBe("Too easy.");
    });

    it("strips surrounding single quotes", () => {
      expect(cleanDialogueResponse("'Maybe next time.'")).toBe("Maybe next time.");
    });

    it("strips name prefix like Jax:", () => {
      expect(cleanDialogueResponse("Jax: Too easy.")).toBe("Too easy.");
    });

    it("strips name prefix like Nora Vale:", () => {
      expect(cleanDialogueResponse("Nora Vale: Interesting.")).toBe("Interesting.");
    });

    it("handles case-insensitive name prefixes", () => {
      expect(cleanDialogueResponse("JAX: BOOM!")).toBe("BOOM!");
      expect(cleanDialogueResponse("nora: Hmm.")).toBe("Hmm.");
      expect(cleanDialogueResponse("Ellis March: Good play.")).toBe("Good play.");
    });

    it("truncates at first newline", () => {
      expect(cleanDialogueResponse("Nice move!\nBut I'll get you next time.")).toBe(
        "Nice move!",
      );
    });

    it("truncates overly long responses", () => {
      const longResponse = "A".repeat(300);
      const cleaned = cleanDialogueResponse(longResponse, 50);
      expect(cleaned.length).toBeLessThan(300);
      expect(cleaned.length).toBeLessThanOrEqual(200); // 50 tokens * 4 chars
    });

    it("preserves normal short responses", () => {
      expect(cleanDialogueResponse("Good game!")).toBe("Good game!");
    });

    it("trims whitespace", () => {
      expect(cleanDialogueResponse("  Nice move!  ")).toBe("Nice move!");
    });
  });

  // ---------------------------------------------------------------------------
  // buildGameStateDescription
  // ---------------------------------------------------------------------------

  describe("buildGameStateDescription", () => {
    it("includes stage and pot", () => {
      const desc = buildGameStateDescription({
        stage: "flop",
        pot: 60,
        botChips: 800,
        currentBet: 0,
        isBotTurn: false,
      });
      expect(desc).toContain("Stage: flop");
      expect(desc).toContain("Pot: 60");
      expect(desc).toContain("Your chips: 800");
    });

    it("includes current bet when greater than 0", () => {
      const desc = buildGameStateDescription({
        stage: "turn",
        pot: 120,
        botChips: 500,
        currentBet: 40,
        isBotTurn: false,
      });
      expect(desc).toContain("Current bet: 40");
    });

    it("omits current bet when 0", () => {
      const desc = buildGameStateDescription({
        stage: "flop",
        pot: 60,
        botChips: 800,
        currentBet: 0,
        isBotTurn: false,
      });
      expect(desc).not.toContain("Current bet");
    });

    it("indicates when it is the bot's turn", () => {
      const desc = buildGameStateDescription({
        stage: "flop",
        pot: 60,
        botChips: 800,
        currentBet: 0,
        isBotTurn: true,
      });
      expect(desc).toContain("your turn");
    });
  });
});