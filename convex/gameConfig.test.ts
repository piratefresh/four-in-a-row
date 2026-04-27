import { describe, expect, it } from "vitest";
import { resolveConfig, type RoomConfig } from "./gameConfig";
import {
  SMALL_BLIND,
  BIG_BLIND,
  RAISE_LADDER,
  MAX_RAISES_PER_ROUND,
  SHOWDOWN_TIMER_MS,
  TURN_CLOCK_GRACE_PERIOD_MS,
  TURN_CLOCK_CALLED_DURATION_MS,
} from "./gameState";
import { INITIAL_CHIPS } from "./games/gamesShared";

describe("resolveConfig", () => {
  it("returns standard defaults when config is undefined", () => {
    const resolved = resolveConfig();

    expect(resolved.gameMode).toBe("standard");
    expect(resolved.bettingStructure).toBe("standard");
    expect(resolved.choiceTileFrequency).toBe("standard");
    expect(resolved.smallBlind).toBe(SMALL_BLIND);
    expect(resolved.bigBlind).toBe(BIG_BLIND);
    expect(resolved.startingChips).toBe(INITIAL_CHIPS);
    expect(resolved.raiseLadder).toEqual(RAISE_LADDER);
    expect(resolved.maxRaisesPerRound).toBe(MAX_RAISES_PER_ROUND);
    expect(resolved.turnClockGraceMs).toBe(TURN_CLOCK_GRACE_PERIOD_MS);
    expect(resolved.turnClockCalledDurationMs).toBe(TURN_CLOCK_CALLED_DURATION_MS);
    expect(resolved.showdownTimerMs).toBe(SHOWDOWN_TIMER_MS);
    expect(resolved.initialHandSize).toBe(2);
    expect(resolved.communityTileCount).toBe(5);
  });

  it("returns standard defaults for empty config object", () => {
    const resolved = resolveConfig({});

    expect(resolved.smallBlind).toBe(SMALL_BLIND);
    expect(resolved.bigBlind).toBe(BIG_BLIND);
    expect(resolved.startingChips).toBe(INITIAL_CHIPS);
    expect(resolved.raiseLadder).toEqual(RAISE_LADDER);
  });

  it("applies speed betting structure overrides", () => {
    const resolved = resolveConfig({ bettingStructure: "speed" });

    expect(resolved.bettingStructure).toBe("speed");
    expect(resolved.smallBlind).toBe(5);
    expect(resolved.bigBlind).toBe(10);
    expect(resolved.startingChips).toBe(500);
    expect(resolved.raiseLadder).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 100]);
    expect(resolved.turnClockGraceMs).toBe(10_000);
    expect(resolved.turnClockCalledDurationMs).toBe(15_000);
    expect(resolved.showdownTimerMs).toBe(30_000);
  });

  it("preserves non-overridden fields when partial config is provided", () => {
    const resolved = resolveConfig({ gameMode: "lowball" });

    expect(resolved.gameMode).toBe("lowball");
    expect(resolved.bettingStructure).toBe("standard");
    expect(resolved.smallBlind).toBe(SMALL_BLIND);
    expect(resolved.bigBlind).toBe(BIG_BLIND);
  });

  it("allows custom showdown timer override", () => {
    const resolved = resolveConfig({ showdownTimer: 45_000 });

    expect(resolved.showdownTimerMs).toBe(45_000);
    expect(resolved.turnClockGraceMs).toBe(TURN_CLOCK_GRACE_PERIOD_MS);
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
    const frequencies = ["standard", "low", "high"] as const;
    for (const freq of frequencies) {
      const resolved = resolveConfig({ choiceTileFrequency: freq });
      expect(resolved.choiceTileFrequency).toBe(freq);
    }
  });

  it("supports all betting structures", () => {
    const structures = ["standard", "speed"] as const;
    for (const struct of structures) {
      const resolved = resolveConfig({ bettingStructure: struct });
      expect(resolved.bettingStructure).toBe(struct);
    }
  });

  it("combines multiple overrides correctly", () => {
    const config: RoomConfig = {
      gameMode: "verbs",
      bettingStructure: "speed",
      choiceTileFrequency: "high",
      showdownTimer: 90_000,
    };
    const resolved = resolveConfig(config);

    expect(resolved.gameMode).toBe("verbs");
    expect(resolved.bettingStructure).toBe("speed");
    expect(resolved.choiceTileFrequency).toBe("high");
    expect(resolved.smallBlind).toBe(5);
    expect(resolved.bigBlind).toBe(10);
    expect(resolved.startingChips).toBe(500);
    expect(resolved.showdownTimerMs).toBe(90_000);
  });
});
