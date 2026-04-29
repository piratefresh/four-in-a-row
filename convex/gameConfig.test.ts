import { describe, expect, it } from "vitest";
import { resolveConfig, type RoomConfig } from "./gameConfig";
import {
  SMALL_BLIND,
  BIG_BLIND,
  RAISE_LADDER,
  TURN_CLOCK_CALLED_DURATION_MS,
} from "./gameState";
import { INITIAL_CHIPS } from "./games/gamesShared";

describe("resolveConfig", () => {
  it("returns standard defaults when config is undefined", () => {
    const resolved = resolveConfig();

    expect(resolved.gameMode).toBe("standard");
    expect(resolved.bettingStructure).toBe("noLimit");
    expect(resolved.choiceTileFrequency).toBe("high");
    expect(resolved.bonusStructure).toBe("classic");
    expect(resolved.smallBlind).toBe(SMALL_BLIND);
    expect(resolved.bigBlind).toBe(BIG_BLIND);
    expect(resolved.startingChips).toBe(INITIAL_CHIPS);
    expect(resolved.raiseLadder).toEqual([
      ...RAISE_LADDER,
      300,
      500,
      1000,
    ]);
    expect(resolved.maxRaisesPerRound).toBe(99);
    expect(resolved.turnClockGraceMs).toBe(30_000);
    expect(resolved.turnClockCalledDurationMs).toBe(TURN_CLOCK_CALLED_DURATION_MS);
    expect(resolved.showdownTimerMs).toBe(60_000);
    expect(resolved.initialHandSize).toBe(2);
    expect(resolved.communityTileCount).toBe(5);
  });

  it("returns standard defaults for empty config object", () => {
    const resolved = resolveConfig({});

    expect(resolved.smallBlind).toBe(SMALL_BLIND);
    expect(resolved.bigBlind).toBe(BIG_BLIND);
    expect(resolved.startingChips).toBe(INITIAL_CHIPS);
    expect(resolved.raiseLadder).toEqual([
      ...RAISE_LADDER,
      300,
      500,
      1000,
    ]);
  });

  it("applies fixed limit betting structure overrides", () => {
    const resolved = resolveConfig({ bettingStructure: "fixedLimit" });

    expect(resolved.bettingStructure).toBe("fixedLimit");
    expect(resolved.raiseLadder).toEqual([20, 40, 60, 80]);
    expect(resolved.maxRaisesPerRound).toBe(3);
  });

  it("preserves non-overridden fields when partial config is provided", () => {
    const resolved = resolveConfig({ gameMode: "lowball" });

    expect(resolved.gameMode).toBe("lowball");
    expect(resolved.bettingStructure).toBe("noLimit");
    expect(resolved.smallBlind).toBe(SMALL_BLIND);
    expect(resolved.bigBlind).toBe(BIG_BLIND);
  });

  it("allows custom showdown timer override", () => {
    const resolved = resolveConfig({ showdownTimer: 45_000 });

    expect(resolved.showdownTimerMs).toBe(45_000);
    expect(resolved.turnClockGraceMs).toBe(30_000);
  });

  it("custom showdown timer takes precedence over speed default", () => {
    const resolved = resolveConfig({
      bettingStructure: "speed",
      showdownTimer: 45_000,
    });

    expect(resolved.showdownTimerMs).toBe(45_000);
    expect(resolved.turnClockGraceMs).toBe(10_000);
  });

  it("supports all game modes", () => {
    const modes = ["standard", "verbs", "adjectives", "lowball"] as const;
    for (const mode of modes) {
      const resolved = resolveConfig({ gameMode: mode });
      expect(resolved.gameMode).toBe(mode);
    }
  });

  it("supports all choice tile frequencies", () => {
    const frequencies = ["low", "high"] as const;
    for (const freq of frequencies) {
      const resolved = resolveConfig({ choiceTileFrequency: freq });
      expect(resolved.choiceTileFrequency).toBe(freq);
    }
  });

  it("supports all betting structures", () => {
    const structures = ["noLimit", "potLimit", "fixedLimit"] as const;
    for (const struct of structures) {
      const resolved = resolveConfig({ bettingStructure: struct });
      expect(resolved.bettingStructure).toBe(struct);
    }
  });

  it("combines multiple overrides correctly", () => {
    const config: RoomConfig = {
      gameMode: "verbs",
      bettingStructure: "fixedLimit",
      choiceTileFrequency: "high",
      bonusStructure: "bigRackBonus",
      showdownTimer: 90_000,
    };
    const resolved = resolveConfig(config);

    expect(resolved.gameMode).toBe("verbs");
    expect(resolved.bettingStructure).toBe("fixedLimit");
    expect(resolved.choiceTileFrequency).toBe("high");
    expect(resolved.fullRackBonus).toBe(20);
    expect(resolved.showdownTimerMs).toBe(90_000);
  });

  it("supports bonus structures", () => {
    expect(resolveConfig({ bonusStructure: "classic" }).fullRackBonus).toBe(10);
    expect(resolveConfig({ bonusStructure: "noRackBonus" }).fullRackBonus).toBe(0);
    expect(resolveConfig({ bonusStructure: "bigRackBonus" }).fullRackBonus).toBe(20);
  });

  it("normalizes legacy config values", () => {
    const resolved = resolveConfig({
      bettingStructure: "standard",
      choiceTileFrequency: "standard",
      bonusStructure: "standard",
    });

    expect(resolved.bettingStructure).toBe("noLimit");
    expect(resolved.choiceTileFrequency).toBe("high");
    expect(resolved.bonusStructure).toBe("classic");
  });
});
