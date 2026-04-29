import { describe, expect, it } from "vitest";
import {
  INITIAL_HAND_SIZE,
  COMMUNITY_TILE_COUNT,
} from "./gameState";
import {
  createTutorialDeal,
  TUTORIAL_TARGET_WORD,
  TUTORIAL_PLAYER_HAND,
  TUTORIAL_BOT_HANDS,
  TUTORIAL_COMMUNITY_REVEAL_COUNTS,
} from "./tutorialDeck";

describe("createTutorialDeal", () => {
  it("returns a deterministic deal for 4 players", () => {
    const deal1 = createTutorialDeal(4);
    const deal2 = createTutorialDeal(4);

    expect(deal1.hands).toHaveLength(4);
    expect(deal1.communityTiles).toHaveLength(COMMUNITY_TILE_COUNT);
    expect(deal1.communityChoiceTileCount).toBe(0);
    expect(deal1.handChoiceTileCounts).toEqual([0, 0, 0, 0]);

    for (const hand of deal1.hands) {
      expect(hand).toHaveLength(INITIAL_HAND_SIZE);
    }

    expect(deal1.hands).toEqual(deal2.hands);
    expect(deal1.communityTiles.map((t) => t.kind === "single" ? t.letter : `[${t.options.join("/")}]`)).toEqual(
      deal2.communityTiles.map((t) => t.kind === "single" ? t.letter : `[${t.options.join("/")}]`),
    );
  });

  it("gives the human player STRONG-forming tiles", () => {
    const deal = createTutorialDeal(4);
    const humanHand = deal.hands[0]!;

    expect(humanHand.map((t) => t.kind === "single" ? t.letter : `[${t.options.join("/")}]`)).toEqual(
      TUTORIAL_PLAYER_HAND.map((t) => t.kind === "single" ? t.letter : `[${t.options.join("/")}]`),
    );

    const rTile = humanHand.find((t) => t.kind === "single" && t.letter === "R");
    expect(rTile).toBeDefined();
    if (rTile && rTile.kind === "single") {
      expect(rTile.multiplier).toBe("2L");
    }
  });

  it("has community tiles that enable STRONG", () => {
    const deal = createTutorialDeal(4);
    const communityLetters = deal.communityTiles.map((t) =>
      t.kind === "single" ? t.letter : `[${t.options.join("/")}]`,
    );
    const requiredLetters = ["S", "O", "N", "G"];

    for (const letter of requiredLetters) {
      expect(communityLetters).toContain(letter);
    }

    const allLetters = [
      ...deal.hands[0]!.map((t) => t.kind === "single" ? t.letter : `[${t.options.join("/")}]`),
      ...communityLetters,
    ];
    const strongLetters = TUTORIAL_TARGET_WORD.split("");
    for (const letter of strongLetters) {
      expect(allLetters).toContain(letter);
    }
  });

  it("gives bots weak letter combinations", () => {
    const deal = createTutorialDeal(4);

    for (let i = 1; i <= TUTORIAL_BOT_HANDS.length; i++) {
      const botHand = deal.hands[i]!;
      expect(botHand).toHaveLength(INITIAL_HAND_SIZE);
    }
  });

  it("supports fewer bot players (2 or 3)", () => {
    const deal2 = createTutorialDeal(2);
    expect(deal2.hands).toHaveLength(2);

    const deal3 = createTutorialDeal(3);
    expect(deal3.hands).toHaveLength(3);
  });

  it("has no choice tiles", () => {
    const deal = createTutorialDeal(4);

    for (const hand of deal.hands) {
      for (const tile of hand) {
        expect(tile.kind).toBe("single");
      }
    }

    for (const tile of deal.communityTiles) {
      expect(tile.kind).toBe("single");
    }

    expect(deal.communityChoiceTileCount).toBe(0);
  });

  it("community tiles are unrevealed", () => {
    const deal = createTutorialDeal(4);

    for (const tile of deal.communityTiles) {
      expect(tile.revealed).toBe(false);
    }
  });

  it("has correct reveal count mapping", () => {
    expect(TUTORIAL_COMMUNITY_REVEAL_COUNTS.flop).toBe(3);
    expect(TUTORIAL_COMMUNITY_REVEAL_COUNTS.turn).toBe(1);
    expect(TUTORIAL_COMMUNITY_REVEAL_COUNTS.river).toBe(1);
  });
});