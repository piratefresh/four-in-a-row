import { describe, expect, it } from "vitest";
import {
  AI_PERSONALITIES,
  BOT_CHARACTERS,
  buildDevBotAuthUserId,
  getBotCharacterForAuthUserId,
  getBotCharacterForSeatIndex,
  getBotCharacterForSeed,
  getPersonalityForSeed,
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
