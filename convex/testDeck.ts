import { query } from "./_generated/server";
import { createShuffledDeck } from "./gameState";

export const testDeckGeneration = query({
  args: {},
  handler: async () => {
    const deck = createShuffledDeck();

    const choiceCards = deck.filter(card => card.kind === "choice");
    const singleCards = deck.filter(card => card.kind === "single");

    const choice2 = choiceCards.filter(card => card.kind === "choice" && card.options.length === 2);
    const choice3 = choiceCards.filter(card => card.kind === "choice" && card.options.length === 3);
    const choice4 = choiceCards.filter(card => card.kind === "choice" && card.options.length === 4);

    return {
      totalCards: deck.length,
      singleCards: singleCards.length,
      choiceCards: choiceCards.length,
      choice2Count: choice2.length,
      choice3Count: choice3.length,
      choice4Count: choice4.length,
      choiceCardPercentage: (choiceCards.length / deck.length * 100).toFixed(1),
      sampleChoiceCards: choiceCards.slice(0, 3).map(card =>
        card.kind === "choice" ? {
          kind: card.kind,
          options: card.options,
          baseValues: card.baseValues
        } : null
      ),
    };
  },
});
