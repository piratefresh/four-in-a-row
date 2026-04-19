import { describe, expect, it } from "vitest";
import {
  CHOICE_TILE_COUNT,
  CHOICE_TILE_OPTIONS,
  CHOICE_TOTAL,
  DECK_SIZE,
  SINGLE_TOTAL,
  createShuffledDeck,
  validateDeckConfig,
  type GameDeckTile,
} from "./gameState";

describe("Two-letter choice tile deck", () => {
  describe("validateDeckConfig", () => {
    it("accepts the default deck configuration", () => {
      expect(() =>
        validateDeckConfig({
          deckSize: DECK_SIZE,
          choiceTileCount: CHOICE_TILE_COUNT,
        }),
      ).not.toThrow();
    });

    it("rejects a non-positive deck size", () => {
      expect(() =>
        validateDeckConfig({
          deckSize: -1,
          choiceTileCount: 0,
        }),
      ).toThrow("Deck size must be positive");
    });

    it("rejects a negative choice tile count", () => {
      expect(() =>
        validateDeckConfig({
          deckSize: 60,
          choiceTileCount: -1,
        }),
      ).toThrow("Choice tile count cannot be negative");
    });

    it("rejects a choice tile count larger than the deck", () => {
      expect(() =>
        validateDeckConfig({
          deckSize: 10,
          choiceTileCount: 14,
        }),
      ).toThrow("Choice card total (14) exceeds deck size (10)");
    });

    it("rejects a choice tile count that exceeds the configured option list", () => {
      expect(() =>
        validateDeckConfig({
          deckSize: 60,
          choiceTileCount: CHOICE_TILE_OPTIONS.length + 1,
        }),
      ).toThrow("exceeds options array length");
    });
  });

  describe("createShuffledDeck", () => {
    it("generates exactly DECK_SIZE cards", () => {
      const deck = createShuffledDeck();
      expect(deck.length).toBe(DECK_SIZE);
    });

    it("keeps the expected single-vs-choice card split", () => {
      const deck = createShuffledDeck();
      const choiceCards = deck.filter((card) => card.kind === "choice");
      const singleCards = deck.filter((card) => card.kind === "single");

      expect(choiceCards.length).toBe(CHOICE_TOTAL);
      expect(singleCards.length).toBe(SINGLE_TOTAL);
    });

    it("only emits two-letter choice tiles", () => {
      const deck = createShuffledDeck();
      const choiceCards = deck.filter(
        (card): card is Extract<GameDeckTile, { kind: "choice" }> =>
          card.kind === "choice",
      );

      expect(choiceCards.length).toBe(CHOICE_TILE_COUNT);
      for (const card of choiceCards) {
        expect(card.options).toHaveLength(2);
        expect(card.baseValues).toHaveLength(2);
      }
    });

    it("uses the configured choice tile pairs", () => {
      const deck = createShuffledDeck();
      const choicePairs = deck
        .filter((card): card is Extract<GameDeckTile, { kind: "choice" }> => card.kind === "choice")
        .map((card) => card.options.join("/"))
        .sort();
      const configuredPairs = CHOICE_TILE_OPTIONS.map((pair) => pair.join("/")).sort();

      expect(choicePairs).toEqual(configuredPairs);
    });

    it("assigns valid point values to all choice options", () => {
      const deck = createShuffledDeck();
      const choiceCards = deck.filter(
        (card): card is Extract<GameDeckTile, { kind: "choice" }> =>
          card.kind === "choice",
      );

      for (const card of choiceCards) {
        for (const baseValue of card.baseValues) {
          expect(baseValue).toBeGreaterThan(0);
          expect(baseValue).toBeLessThanOrEqual(10);
        }
      }
    });

    it("can generate an all-single deck", () => {
      const deck = createShuffledDeck({
        deckSize: 52,
        choiceTileCount: 0,
      });

      expect(deck).toHaveLength(52);
      expect(deck.every((card) => card.kind === "single")).toBe(true);
    });

    it("throws for an invalid custom deck configuration", () => {
      expect(() =>
        createShuffledDeck({
          deckSize: 5,
          choiceTileCount: 8,
        }),
      ).toThrow();
    });

    it("shuffles the resulting deck", () => {
      const deck1 = createShuffledDeck();
      const deck2 = createShuffledDeck();
      const sameOpening = deck1
        .slice(0, 5)
        .every((card, index) => JSON.stringify(card) === JSON.stringify(deck2[index]));

      expect(sameOpening).toBe(false);
    });

    it("keeps choice tiles distributed across the deck", () => {
      const deck = createShuffledDeck();
      const firstThirdChoices = deck.slice(0, 20).filter((card) => card.kind === "choice").length;
      const middleThirdChoices = deck.slice(20, 40).filter((card) => card.kind === "choice").length;
      const lastThirdChoices = deck.slice(40, 60).filter((card) => card.kind === "choice").length;

      expect(firstThirdChoices).toBeGreaterThan(0);
      expect(middleThirdChoices).toBeGreaterThan(0);
      expect(lastThirdChoices).toBeGreaterThan(0);
    });
  });
});
