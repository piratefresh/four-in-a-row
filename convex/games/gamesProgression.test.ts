import { describe, expect, it } from "vitest";
import { handlePostActionProgression } from "./gamesProgression";
import type { Id } from "../_generated/dataModel";
import type { GameTile } from "../gameState";

describe("handlePostActionProgression", () => {
  it("completes the game when a fold leaves only one player active", async () => {
    const gameId = "game-id" as Id<"games">;
    const roomId = "room-id" as Id<"rooms">;
    const communityTiles: GameTile[] = [
      { kind: "single", letter: "A", baseValue: 1, revealed: false },
      { kind: "single", letter: "B", baseValue: 4, revealed: false },
    ];
    const game = {
      _id: gameId,
      roomId,
      stage: "preflop" as const,
      currentPlayerIndex: 1,
      communityTiles,
      deck: [],
      currentBet: 20,
      raisesThisRound: 0,
      status: "active",
    };
    let persistedGame = { ...game, winnerId: undefined as string | undefined };
    const gamePatches: Array<Record<string, unknown>> = [];

    const ctx = {
      db: {
        patch: async (id: string, patch: Record<string, unknown>) => {
          if (id === gameId) {
            gamePatches.push(patch);
            persistedGame = { ...persistedGame, ...patch };
          }
        },
        get: async (id: string) => {
          if (id === gameId) return persistedGame;
          return null;
        },
      },
      runMutation: async () => null,
    };

    await handlePostActionProgression(ctx as any, game, [
      {
        _id: "hand-a" as Id<"playerHands">,
        playerId: "player-a",
        hasFolded: true,
        hasActed: true,
        betThisRound: 20,
        chips: 980,
        totalBet: 20,
      },
      {
        _id: "hand-b" as Id<"playerHands">,
        playerId: "player-b",
        hasFolded: false,
        hasActed: false,
        betThisRound: 20,
        chips: 980,
        totalBet: 20,
      },
    ]);

    const finalGamePatch = gamePatches.at(-1);

    expect(finalGamePatch).toMatchObject({
      stage: "showdown",
      status: "completed",
      winnerId: "player-b",
      currentBet: 0,
      showdownStartedAt: undefined,
      turnStartedAt: undefined,
    });
    expect(
      (finalGamePatch?.communityTiles as GameTile[]).every(
        (tile) => tile.revealed,
      ),
    ).toBe(true);
  });
});
