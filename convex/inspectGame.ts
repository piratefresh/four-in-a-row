import { query } from "./_generated/server";
import { v } from "convex/values";

export const inspectGameDeck = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) {
      return { error: "Game not found" };
    }

    const deckSample = game.deck.slice(0, 10);
    const communityTilesSample = game.communityTiles.slice(0, 5);

    const deckChoiceCards = game.deck.filter((card: any) => card.kind === "choice");
    const communityChoiceCards = game.communityTiles.filter((tile: any) => tile.kind === "choice");

    return {
      deckSize: game.deck.length,
      deckChoiceCount: deckChoiceCards.length,
      communityChoiceCount: communityChoiceCards.length,
      deckSample,
      communityTilesSample,
    };
  },
});
