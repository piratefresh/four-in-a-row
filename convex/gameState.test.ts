import { describe, it, expect } from "vitest";
import {
  createShuffledDeck,
  validateDeckConfig,
  DECK_SIZE,
  CHOICE_2_COUNT,
  CHOICE_3_COUNT,
  CHOICE_4_COUNT,
  CHOICE_TOTAL,
  SINGLE_TOTAL,
  type GameDeckTile,
} from "./gameState";

describe("Multi-Letter Deck - Configuration and Generation", () => {
  describe("validateDeckConfig", () => {
    it("should accept valid MVP defaults", () => {
      expect(() =>
        validateDeckConfig({
          deckSize: DECK_SIZE,
          choice2Count: CHOICE_2_COUNT,
          choice3Count: CHOICE_3_COUNT,
          choice4Count: CHOICE_4_COUNT,
        })
      ).not.toThrow();
    });

    it("should reject negative deck size", () => {
      expect(() =>
        validateDeckConfig({
          deckSize: -1,
          choice2Count: 0,
          choice3Count: 0,
          choice4Count: 0,
        })
      ).toThrow("Deck size must be positive");
    });

    it("should reject negative choice counts", () => {
      expect(() =>
        validateDeckConfig({
          deckSize: 60,
          choice2Count: -1,
          choice3Count: 0,
          choice4Count: 0,
        })
      ).toThrow("Choice card counts cannot be negative");
    });

    it("should reject choice total exceeding deck size", () => {
      expect(() =>
        validateDeckConfig({
          deckSize: 10,
          choice2Count: 8,
          choice3Count: 4,
          choice4Count: 2,
        })
      ).toThrow("Choice card total (14) exceeds deck size (10)");
    });

    it("should reject choice count exceeding options array length", () => {
      expect(() =>
        validateDeckConfig({
          deckSize: 60,
          choice2Count: 10, // Exceeds 8
          choice3Count: CHOICE_3_COUNT,
          choice4Count: CHOICE_4_COUNT,
        })
      ).toThrow("exceeds options array length");
    });
  });

  describe("createShuffledDeck - MVP defaults", () => {
    it("should generate exactly DECK_SIZE cards", () => {
      const deck = createShuffledDeck();
      expect(deck.length).toBe(DECK_SIZE);
    });

    it("should have correct number of choice cards", () => {
      const deck = createShuffledDeck();
      const choiceCards = deck.filter((card) => card.kind === "choice");
      expect(choiceCards.length).toBe(CHOICE_TOTAL);
    });

    it("should have correct number of single cards", () => {
      const deck = createShuffledDeck();
      const singleCards = deck.filter((card) => card.kind === "single");
      expect(singleCards.length).toBe(SINGLE_TOTAL);
    });

    it("should have correct number of choice-2 cards", () => {
      const deck = createShuffledDeck();
      const choice2Cards = deck.filter(
        (card) => card.kind === "choice" && card.options.length === 2
      );
      expect(choice2Cards.length).toBe(CHOICE_2_COUNT);
    });

    it("should have correct number of choice-3 cards", () => {
      const deck = createShuffledDeck();
      const choice3Cards = deck.filter(
        (card) => card.kind === "choice" && card.options.length === 3
      );
      expect(choice3Cards.length).toBe(CHOICE_3_COUNT);
    });

    it("should have correct number of choice-4 cards", () => {
      const deck = createShuffledDeck();
      const choice4Cards = deck.filter(
        (card) => card.kind === "choice" && card.options.length === 4
      );
      expect(choice4Cards.length).toBe(CHOICE_4_COUNT);
    });

    it("should verify choice card ratio is approximately 23%", () => {
      const deck = createShuffledDeck();
      const choiceCards = deck.filter((card) => card.kind === "choice");
      const ratio = (choiceCards.length / deck.length) * 100;
      // Should be ~23.3%
      expect(ratio).toBeGreaterThan(22);
      expect(ratio).toBeLessThan(25);
    });

    it("should have valid base values for all choice card options", () => {
      const deck = createShuffledDeck();
      const choiceCards = deck.filter(
        (card): card is Extract<GameDeckTile, { kind: "choice" }> =>
          card.kind === "choice"
      );

      for (const card of choiceCards) {
        expect(card.options.length).toBe(card.baseValues.length);
        for (const baseValue of card.baseValues) {
          expect(baseValue).toBeGreaterThan(0);
          expect(baseValue).toBeLessThanOrEqual(10);
        }
      }
    });

    it("should have valid single card letters and values", () => {
      const deck = createShuffledDeck();
      const singleCards = deck.filter(
        (card): card is Extract<GameDeckTile, { kind: "single" }> =>
          card.kind === "single"
      );

      for (const card of singleCards) {
        expect(card.letter).toMatch(/^[A-Z]$/);
        expect(card.baseValue).toBeGreaterThan(0);
        expect(card.baseValue).toBeLessThanOrEqual(10);
      }
    });
  });

  describe("createShuffledDeck - custom configuration", () => {
    it("should generate a deck with all single cards when choice counts are 0", () => {
      const deck = createShuffledDeck({
        deckSize: 52,
        choice2Count: 0,
        choice3Count: 0,
        choice4Count: 0,
      });

      expect(deck.length).toBe(52);
      expect(deck.every((card) => card.kind === "single")).toBe(true);
    });

    it("should throw error for invalid custom configuration", () => {
      expect(() =>
        createShuffledDeck({
          deckSize: 5,
          choice2Count: 8,
          choice3Count: 4,
          choice4Count: 2,
        })
      ).toThrow();
    });
  });

  describe("createShuffledDeck - determinism and shuffling", () => {
    it("should generate different decks on subsequent calls", () => {
      const deck1 = createShuffledDeck();
      const deck2 = createShuffledDeck();

      // Compare first few cards to check they're different
      const areSame = deck1
        .slice(0, 5)
        .every((card, i) => JSON.stringify(card) === JSON.stringify(deck2[i]));

      // It's extremely unlikely that the first 5 cards are identical if properly shuffled
      expect(areSame).toBe(false);
    });

    it("should have choice cards distributed throughout the deck", () => {
      const deck = createShuffledDeck();
      const firstThirdChoiceCards = deck
        .slice(0, 20)
        .filter((card) => card.kind === "choice").length;
      const middleThirdChoiceCards = deck
        .slice(20, 40)
        .filter((card) => card.kind === "choice").length;
      const lastThirdChoiceCards = deck
        .slice(40, 60)
        .filter((card) => card.kind === "choice").length;

      // All sections should have at least one choice card (very high probability)
      expect(firstThirdChoiceCards).toBeGreaterThan(0);
      expect(middleThirdChoiceCards).toBeGreaterThan(0);
      expect(lastThirdChoiceCards).toBeGreaterThan(0);
    });
  });

  describe("Ticket 01 Acceptance Criteria", () => {
    it("AC1: Generated deck count equals configured deck size", () => {
      const deck = createShuffledDeck();
      expect(deck.length).toBe(DECK_SIZE);
    });

    it("AC2: Choice-card ratio defaults to about 23 percent", () => {
      const deck = createShuffledDeck();
      const choiceCards = deck.filter((card) => card.kind === "choice");
      const ratio = (choiceCards.length / deck.length) * 100;
      expect(ratio).toBeCloseTo(23.33, 0);
    });

    it("AC3: Count integrity is maintained", () => {
      const deck = createShuffledDeck();
      const singleCards = deck.filter((card) => card.kind === "single");
      const choiceCards = deck.filter((card) => card.kind === "choice");
      expect(singleCards.length + choiceCards.length).toBe(DECK_SIZE);
    });
  });
});
