import { describe, expect, it } from "vitest";
import {
  AI_PERSONALITIES,
  AI_DIFFICULTY,
  BOT_CHARACTERS,
  BETTING_PROFILES,
  SHOWDOWN_SELECTION_WINDOWS,
  buildDevBotAuthUserId,
  getBotCharacterForAuthUserId,
  getBotCharacterForSeatIndex,
  getBotCharacterForSeed,
  getPersonalityForSeed,
  getModelForDifficulty,
  getConfiguredAIProvider,
  AI_PROVIDER,
} from "./aiStrategy";

describe("bot character registry", () => {
  it("assigns fixed characters by seat index", () => {
    expect(getBotCharacterForSeatIndex(0)).toMatchObject({
      id: "nora",
      personality: AI_PERSONALITIES.CAUTIOUS,
    });
    expect(getBotCharacterForSeatIndex(1)).toMatchObject({
      id: "ellis",
      personality: AI_PERSONALITIES.BALANCED,
    });
  });

  it("embeds the named character in new bot auth ids", () => {
    const authUserId = buildDevBotAuthUserId("room123", 2);
    const character = getBotCharacterForAuthUserId(authUserId);

    expect(authUserId).toBe("dev-bot:jax:room123:2");
    expect(character).not.toBeNull();
    expect(character?.name).toBe("Jax Rook");
    expect(character?.personality).toBe(AI_PERSONALITIES.AGGRESSIVE);
  });

  it("keeps legacy bot auth ids working through deterministic fallback", () => {
    const legacyAuthUserId = "dev-bot:legacy-room:1";
    const character = getBotCharacterForAuthUserId(legacyAuthUserId);

    expect(character).not.toBeNull();
    expect(BOT_CHARACTERS.map((entry) => entry.id)).toContain(character?.id);
    expect(character?.personality).toBe(getPersonalityForSeed(legacyAuthUserId));
  });

  it("uses the same character personality for seed-based fallback", () => {
    const character = getBotCharacterForSeed("player-seed-42");
    expect(getPersonalityForSeed("player-seed-42")).toBe(character.personality);
  });
});

describe("AI difficulty configuration", () => {
  it("has all three difficulty levels", () => {
    expect(AI_DIFFICULTY.EASY).toBe("easy");
    expect(AI_DIFFICULTY.MEDIUM).toBe("medium");
    expect(AI_DIFFICULTY.HARD).toBe("hard");
  });

  it("has betting profiles for each difficulty", () => {
    for (const difficulty of Object.values(AI_DIFFICULTY)) {
      const key = difficulty as keyof typeof BETTING_PROFILES;
      const profile = BETTING_PROFILES[key];
      expect(profile).toBeDefined();
      expect(profile.foldThreshold).toBeGreaterThan(0);
      expect(profile.raiseThreshold).toBeGreaterThan(0);
      expect(profile.bluffFrequency).toBeGreaterThanOrEqual(0);
      expect(profile.bluffFrequency).toBeLessThanOrEqual(1);
    }
  });

  it("has showdown selection windows that decrease with difficulty", () => {
    expect(SHOWDOWN_SELECTION_WINDOWS[AI_DIFFICULTY.EASY]).toBeGreaterThan(
      SHOWDOWN_SELECTION_WINDOWS[AI_DIFFICULTY.MEDIUM],
    );
    expect(SHOWDOWN_SELECTION_WINDOWS[AI_DIFFICULTY.MEDIUM]).toBeGreaterThan(
      SHOWDOWN_SELECTION_WINDOWS[AI_DIFFICULTY.HARD],
    );
  });

  it("hard difficulty bluffs more than easy difficulty", () => {
    expect(BETTING_PROFILES[AI_DIFFICULTY.HARD].bluffFrequency).toBeGreaterThan(
      BETTING_PROFILES[AI_DIFFICULTY.EASY].bluffFrequency,
    );
  });
});

describe("model selection and provider", () => {
  it("returns OpenRouter as the provider", () => {
    const provider = getConfiguredAIProvider();
    expect(provider).toBe(AI_PROVIDER.OPENROUTER);
  });

  it("returns a string for each difficulty", () => {
    for (const difficulty of Object.values(AI_DIFFICULTY)) {
      const model = getModelForDifficulty(difficulty as any);
      expect(typeof model).toBe("string");
      expect(model.length).toBeGreaterThan(0);
    }
  });
});
