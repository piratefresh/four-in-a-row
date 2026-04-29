import { describe, expect, it } from "vitest";
import { tutorialBotBettingDecision, tutorialBotShowdownWord } from "./tutorialBots";
import {
  TUTORIAL_PLAYER_HAND,
  TUTORIAL_BOT_HANDS,
} from "./tutorialDeck";
import { evaluateDeterministicShowdownHand } from "./showdownSolver";
import type { GameDeckTile, GameTile } from "./gameState";

describe("tutorialBotBettingDecision", () => {
  it("checks when there is no bet to call", () => {
    const result = tutorialBotBettingDecision({
      currentBet: 0,
      betThisRound: 0,
      chips: 1000,
    });
    expect(result.action).toBe("check");
  });

  it("calls when there is a bet to match", () => {
    const result = tutorialBotBettingDecision({
      currentBet: 40,
      betThisRound: 20,
      chips: 980,
    });
    expect(result.action).toBe("call");
  });

  it("calls when bet equals current bet (amount to call is 0)", () => {
    const result = tutorialBotBettingDecision({
      currentBet: 20,
      betThisRound: 20,
      chips: 980,
    });
    expect(result.action).toBe("check");
  });

  it("never raises", () => {
    const results = [
      tutorialBotBettingDecision({ currentBet: 0, betThisRound: 0, chips: 1000 }),
      tutorialBotBettingDecision({ currentBet: 20, betThisRound: 0, chips: 980 }),
      tutorialBotBettingDecision({ currentBet: 100, betThisRound: 20, chips: 980 }),
    ];
    for (const r of results) {
      expect(r.action === "check" || r.action === "call").toBe(true);
    }
  });
});

describe("tutorialBotShowdownWord", () => {
  const allRevealed = (tiles: GameDeckTile[]): GameTile[] =>
    tiles.map((t) => ({
      ...t,
      revealed: true,
    }));

  const communityDeckTiles: GameDeckTile[] = [
    { kind: "single" as const, letter: "S", baseValue: 1 },
    { kind: "single" as const, letter: "O", baseValue: 1 },
    { kind: "single" as const, letter: "N", baseValue: 1 },
    { kind: "single" as const, letter: "G", baseValue: 1 },
    { kind: "single" as const, letter: "L", baseValue: 1 },
  ];
  const communityTiles = allRevealed(communityDeckTiles);

  it("bot 1 (J, D) plays DOGS", () => {
    const result = tutorialBotShowdownWord({
      handTiles: TUTORIAL_BOT_HANDS[0]!,
      communityTiles,
    });
    expect(result).not.toBeNull();
    expect(result!.word).toBe("DOGS");
  });

  it("bot 2 (F, X) plays FOG", () => {
    const result = tutorialBotShowdownWord({
      handTiles: TUTORIAL_BOT_HANDS[1]!,
      communityTiles,
    });
    expect(result).not.toBeNull();
    expect(result!.word).toBe("FOG");
  });

  it("bot 3 (Z, V) plays VOL", () => {
    const result = tutorialBotShowdownWord({
      handTiles: TUTORIAL_BOT_HANDS[2]!,
      communityTiles,
    });
    expect(result).not.toBeNull();
    expect(result!.word).toBe("VOL");
  });

  it("human player can form STRONG (6 letters)", () => {
    const handTiles = TUTORIAL_PLAYER_HAND.map((tile) => {
      if (tile.kind === "choice") {
        return { kind: "choice" as const, options: tile.options, baseValues: tile.baseValues, multiplier: tile.multiplier };
      }
      return { kind: "single" as const, letter: tile.letter, baseValue: tile.baseValue, multiplier: tile.multiplier };
    });
    const communitySolverTiles = communityDeckTiles.map((t) => ({
      ...t,
      revealed: true,
    }));

    const { candidates } = evaluateDeterministicShowdownHand({
      handTiles,
      communityTiles: communitySolverTiles,
    });

    const strongCandidate = candidates.find((c) => c.word === "STRONG");
    expect(strongCandidate).toBeDefined();
    expect(strongCandidate!.word.length).toBe(6);
  });

  it("all bot words score lower than STRONG", () => {
    for (const botHand of TUTORIAL_BOT_HANDS) {
      const botResult = tutorialBotShowdownWord({
        handTiles: botHand,
        communityTiles,
      });
      if (botResult) {
        expect(botResult.estimatedScore).toBeLessThan(8);
      }
    }
  });
});