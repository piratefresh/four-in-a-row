import { describe, expect, it } from "vitest";
import {
  calculateScore,
  calculateStaticShowdownScore,
  getEffectiveTileScore,
  getHighestScoringTileValue,
} from "./gamesScoring";

describe("showdown scoring", () => {
  it("returns a zero breakdown for no selected tiles", () => {
    expect(calculateScore([])).toEqual({
      basePoints: 0,
      multiplierBonus: 0,
      fullRackBonus: 0,
      total: 0,
    });
  });

  it("adds base letter values with no bonuses", () => {
    const score = calculateScore([
      { baseValue: 4 }, // M
      { baseValue: 1 }, // A
      { baseValue: 2 }, // R
      { baseValue: 5 }, // K
      { baseValue: 1 }, // E
      { baseValue: 2 }, // T
    ]);

    expect(score).toEqual({
      basePoints: 15,
      multiplierBonus: 0,
      fullRackBonus: 0,
      total: 15,
    });
  });

  it("scores low-value doubled words by adding only the doubled letter value", () => {
    const score = calculateScore([
      { baseValue: 4 }, // M
      { baseValue: 1 }, // U
      { baseValue: 2 }, // S
      { baseValue: 1, multiplier: "2L" }, // E
    ]);

    expect(score).toEqual({
      basePoints: 8,
      multiplierBonus: 1,
      fullRackBonus: 0,
      total: 9,
    });
  });

  it("adds only the extra value for doubled and tripled letters", () => {
    const score = calculateScore([
      { baseValue: 4, multiplier: "2L" },
      { baseValue: 1 },
      { baseValue: 3, multiplier: "3L" },
    ]);

    expect(score).toEqual({
      basePoints: 8,
      multiplierBonus: 10,
      fullRackBonus: 0,
      total: 18,
    });
  });

  it("applies multiple multipliers independently before rack bonus", () => {
    const score = calculateScore([
      { baseValue: 10, multiplier: "3L" },
      { baseValue: 8, multiplier: "2L" },
      { baseValue: 5 },
      { baseValue: 2, multiplier: "3L" },
      { baseValue: 1 },
      { baseValue: 1, multiplier: "2L" },
      { baseValue: 4 },
    ]);

    expect(score).toEqual({
      basePoints: 31,
      multiplierBonus: 33,
      fullRackBonus: 10,
      total: 74,
    });
  });

  it("scores MONSTER with doubled M and full-rack bonus as 28", () => {
    const score = calculateScore([
      { baseValue: 4, multiplier: "2L" }, // M
      { baseValue: 1 }, // O
      { baseValue: 2 }, // N
      { baseValue: 2 }, // S
      { baseValue: 2 }, // T
      { baseValue: 1 }, // E
      { baseValue: 2 }, // R
    ]);

    expect(score).toEqual({
      basePoints: 14,
      multiplierBonus: 4,
      fullRackBonus: 10,
      total: 28,
    });
  });

  it("does not award a full-rack bonus below seven tiles", () => {
    expect(
      calculateScore([
        { baseValue: 4 },
        { baseValue: 1 },
        { baseValue: 2 },
        { baseValue: 5 },
        { baseValue: 1 },
        { baseValue: 2 },
      ]).fullRackBonus,
    ).toBe(0);
  });

  it("does not award a full-rack bonus above seven tiles", () => {
    expect(
      calculateScore([
        { baseValue: 1 },
        { baseValue: 1 },
        { baseValue: 1 },
        { baseValue: 1 },
        { baseValue: 1 },
        { baseValue: 1 },
        { baseValue: 1 },
        { baseValue: 1 },
      ]).fullRackBonus,
    ).toBe(0);
  });

  it("supports configured full-rack bonuses", () => {
    expect(
      calculateScore(
        [
          { baseValue: 1 },
          { baseValue: 1 },
          { baseValue: 1 },
          { baseValue: 1 },
          { baseValue: 1 },
          { baseValue: 1 },
          { baseValue: 1 },
        ],
        { fullRackBonus: 20 },
      ).total,
    ).toBe(27);
  });

  it("supports disabling the full-rack bonus by configuration", () => {
    const score = calculateScore(
      [
        { baseValue: 4, multiplier: "2L" },
        { baseValue: 1 },
        { baseValue: 2 },
        { baseValue: 2 },
        { baseValue: 2 },
        { baseValue: 1 },
        { baseValue: 2 },
      ],
      { fullRackBonus: 0 },
    );

    expect(score).toEqual({
      basePoints: 14,
      multiplierBonus: 4,
      fullRackBonus: 0,
      total: 18,
    });
  });

  it("keeps static showdown scoring aligned with game scoring defaults", () => {
    const tiles = [
      { baseValue: 4, multiplier: "2L" as const },
      { baseValue: 1 },
      { baseValue: 2 },
      { baseValue: 2 },
      { baseValue: 2 },
      { baseValue: 1 },
      { baseValue: 2 },
    ];

    expect(calculateStaticShowdownScore(tiles)).toEqual(calculateScore(tiles));
  });

  it("calculates effective tile values for tie breakers", () => {
    expect(getEffectiveTileScore({ baseValue: 5 })).toBe(5);
    expect(getEffectiveTileScore({ baseValue: 5, multiplier: "2L" })).toBe(10);
    expect(getEffectiveTileScore({ baseValue: 5, multiplier: "3L" })).toBe(15);
  });

  it("finds the highest effective tile value after multipliers", () => {
    expect(
      getHighestScoringTileValue([
        { baseValue: 10 },
        { baseValue: 5, multiplier: "3L" },
        { baseValue: 8, multiplier: "2L" },
      ]),
    ).toBe(16);
  });

  it("returns zero as the highest tile value when no tiles are selected", () => {
    expect(getHighestScoringTileValue([])).toBe(0);
  });
});
