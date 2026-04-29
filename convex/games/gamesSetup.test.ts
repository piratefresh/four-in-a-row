import { describe, expect, it } from "vitest";
import {
  COMMUNITY_TILE_COUNT,
  INITIAL_HAND_SIZE,
  MAX_CHOICE_TILES_PER_PLAYER_ROUND,
  MIN_CHOICE_TILES_PER_PLAYER_ROUND,
  createShuffledDeck,
} from "../gameState";
import { resolveConfig } from "../gameConfig";
import { createChoiceTileDeal } from "./gamesSetup";

describe("createChoiceTileDeal", () => {
  const highFrequencyConfig = resolveConfig({ choiceTileFrequency: "high" });

  it("gives each player one private choice tile and one single tile", () => {
    const deal = createChoiceTileDeal(createShuffledDeck(), 4, highFrequencyConfig);

    expect(deal.hands).toHaveLength(4);
    for (const hand of deal.hands) {
      expect(hand).toHaveLength(INITIAL_HAND_SIZE);
      expect(hand.filter((tile) => tile.kind === "choice")).toHaveLength(1);
      expect(hand.filter((tile) => tile.kind === "single")).toHaveLength(1);
    }
  });

  it("deals one or two community choice tiles", () => {
    const deal = createChoiceTileDeal(createShuffledDeck(), 4, highFrequencyConfig);
    const communityChoiceCount = deal.communityTiles.filter(
      (tile) => tile.kind === "choice",
    ).length;

    expect(deal.communityTiles).toHaveLength(COMMUNITY_TILE_COUNT);
    expect(communityChoiceCount).toBeGreaterThanOrEqual(1);
    expect(communityChoiceCount).toBeLessThanOrEqual(2);
  });

  it("supports low two-letter tile frequency", () => {
    const deal = createChoiceTileDeal(createShuffledDeck(), 4, {
      gameMode: "standard",
      bettingStructure: "noLimit",
      choiceTileFrequency: "low",
      bonusStructure: "classic",
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 1000,
      raiseLadder: [20, 40, 60],
      maxRaisesPerRound: 3,
      turnClockGraceMs: 60_000,
      turnClockCalledDurationMs: 30_000,
      showdownTimerMs: 60_000,
      fullRackBonus: 10,
      initialHandSize: 2,
      communityTileCount: 5,
    });
    const communityChoiceCount = deal.communityTiles.filter(
      (tile) => tile.kind === "choice",
    ).length;

    expect(communityChoiceCount).toBeLessThanOrEqual(1);
    for (const handChoiceCount of deal.handChoiceTileCounts) {
      expect(handChoiceCount + communityChoiceCount).toBeLessThanOrEqual(1);
    }
  });

  it("keeps every player's available pool at two or three choice tiles", () => {
    const deal = createChoiceTileDeal(createShuffledDeck(), 5, highFrequencyConfig);
    const communityChoiceCount = deal.communityTiles.filter(
      (tile) => tile.kind === "choice",
    ).length;

    for (const handChoiceCount of deal.handChoiceTileCounts) {
      const totalAvailableChoiceTiles = handChoiceCount + communityChoiceCount;
      expect(totalAvailableChoiceTiles).toBeGreaterThanOrEqual(
        MIN_CHOICE_TILES_PER_PLAYER_ROUND,
      );
      expect(totalAvailableChoiceTiles).toBeLessThanOrEqual(
        MAX_CHOICE_TILES_PER_PLAYER_ROUND,
      );
    }
  });

  it("removes dealt tiles from the remaining deck", () => {
    const sourceDeck = createShuffledDeck();
    const deal = createChoiceTileDeal(sourceDeck, 3);
    const totalDealtTiles =
      deal.hands.reduce((sum, hand) => sum + hand.length, 0) +
      deal.communityTiles.length;

    expect(deal.deck).toHaveLength(sourceDeck.length - totalDealtTiles);
  });
});
