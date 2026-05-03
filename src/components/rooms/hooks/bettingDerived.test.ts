import { describe, test, expect } from "vitest";
import {
  isMyTurn,
  canCheck,
  canCall,
  callAmount,
  getAvailableRaiseOptions,
  getRaisesThisRound,
  getMaxRaisesPerRound,
  type BettingInput,
} from "./bettingDerived";

const RAISE_LADDER = [20, 40, 60, 80, 100, 120, 160, 200];

function makeInput(overrides: Partial<BettingInput> = {}): BettingInput {
  return {
    game: null,
    myHand: null,
    playerId: null,
    turnOrderedPlayerIds: [],
    raiseLadder: RAISE_LADDER,
    ...overrides,
  };
}

const baseGame = {
  status: "active",
  stage: "preflop",
  currentBet: 0,
  currentPlayerIndex: 0,
  raisesThisRound: 0,
  pot: 40,
  config: {},
};

const baseHand = {
  playerId: "p1",
  chips: 1000,
  betThisRound: 0,
  totalBet: 0,
  hasFolded: false,
};

describe("isMyTurn", () => {
  test("returns true when it is the player's turn", () => {
    const input = makeInput({
      game: { ...baseGame, currentPlayerIndex: 0 },
      myHand: { ...baseHand, playerId: "p1" },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(isMyTurn(input)).toBe(true);
  });

  test("returns false when it is another player's turn", () => {
    const input = makeInput({
      game: { ...baseGame, currentPlayerIndex: 1 },
      myHand: { ...baseHand, playerId: "p1" },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(isMyTurn(input)).toBe(false);
  });

  test("returns false when game is not active", () => {
    const input = makeInput({
      game: { ...baseGame, status: "waiting" },
      myHand: { ...baseHand, playerId: "p1" },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(isMyTurn(input)).toBe(false);
  });

  test("returns false when player has folded", () => {
    const input = makeInput({
      game: baseGame,
      myHand: { ...baseHand, playerId: "p1", hasFolded: true },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(isMyTurn(input)).toBe(false);
  });

  test("returns false when no game", () => {
    const input = makeInput({
      game: null,
      myHand: { ...baseHand, playerId: "p1" },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(isMyTurn(input)).toBe(false);
  });
});

describe("canCheck", () => {
  test("can check when current bet is 0", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 0, currentPlayerIndex: 0 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 0 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(canCheck(input)).toBe(true);
  });

  test("can check when player has matched current bet", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 40, currentPlayerIndex: 0 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 40 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(canCheck(input)).toBe(true);
  });

  test("cannot check when needing to call", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 40, currentPlayerIndex: 0 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 0 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(canCheck(input)).toBe(false);
  });

  test("cannot check when not player's turn", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 0, currentPlayerIndex: 1 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 0 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(canCheck(input)).toBe(false);
  });
});

describe("canCall", () => {
  test("can call when current bet is above player's bet", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 40, currentPlayerIndex: 0 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 0, chips: 100 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(canCall(input)).toBe(true);
  });

  test("cannot call when already matched", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 40, currentPlayerIndex: 0 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 40, chips: 100 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(canCall(input)).toBe(false);
  });

  test("cannot call when not enough chips", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 100, currentPlayerIndex: 0 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 0, chips: 50 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(canCall(input)).toBe(false);
  });
});

describe("callAmount", () => {
  test("computes correct call amount", () => {
    expect(callAmount({ ...baseGame, currentBet: 40 }, { ...baseHand, betThisRound: 10 })).toBe(30);
  });

  test("returns 0 when no game or hand", () => {
    expect(callAmount(null, null)).toBe(0);
  });
});

describe("getAvailableRaiseOptions", () => {
  test("returns raise options when player can raise", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 20, pot: 60, currentPlayerIndex: 0 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 0, chips: 500 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    const options = getAvailableRaiseOptions(input);
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toBeGreaterThan(20);
  });

  test("returns empty when raises maxed out", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 20, raisesThisRound: 3, pot: 60, currentPlayerIndex: 0 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 0, chips: 500 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(getAvailableRaiseOptions(input)).toEqual([]);
  });

  test("returns empty when not player's turn", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 20, currentPlayerIndex: 1 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 0, chips: 500 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    expect(getAvailableRaiseOptions(input)).toEqual([]);
  });

  test("filters options above pot limit when potLimit", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 20, pot: 100, currentPlayerIndex: 0, config: { bettingStructure: "potLimit" } },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 0, chips: 500 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    const options = getAvailableRaiseOptions(input);
    for (const opt of options) {
      expect(opt).toBeLessThanOrEqual(120); // pot + amountToCall = 100 + 20
    }
  });

  test("filters options player cannot afford", () => {
    const input = makeInput({
      game: { ...baseGame, currentBet: 20, pot: 60, currentPlayerIndex: 0 },
      myHand: { ...baseHand, playerId: "p1", betThisRound: 0, chips: 30 },
      playerId: "p1",
      turnOrderedPlayerIds: ["p1", "p2"],
    });
    const options = getAvailableRaiseOptions(input);
    for (const opt of options) {
      expect(opt).toBeLessThanOrEqual(50); // 20 (call) + 30 (chips) = 50 max
    }
  });
});

describe("getRaisesThisRound", () => {
  test("returns game raisesThisRound", () => {
    expect(getRaisesThisRound({ ...baseGame, raisesThisRound: 2 })).toBe(2);
  });

  test("returns 0 when no game", () => {
    expect(getRaisesThisRound(null)).toBe(0);
  });
});

describe("getMaxRaisesPerRound", () => {
  test("returns config value when set", () => {
    expect(getMaxRaisesPerRound({ ...baseGame, config: { maxRaisesPerRound: 5 } })).toBe(5);
  });

  test("returns default 3 when no config", () => {
    expect(getMaxRaisesPerRound(null)).toBe(3);
  });
});
