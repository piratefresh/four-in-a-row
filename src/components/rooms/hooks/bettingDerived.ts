/**
 * Pure betting derivation functions.
 * No React imports — testable without DOM.
 */

const MAX_RAISES_PER_ROUND = 3;

export interface BettingInput {
  game: {
    status: string;
    stage: string;
    currentBet: number;
    currentPlayerIndex: number;
    raisesThisRound: number;
    pot: number;
    config?: Record<string, unknown>;
  } | null | undefined;
  myHand: {
    playerId: string;
    chips: number;
    betThisRound: number;
    totalBet: number;
    hasFolded: boolean;
    [key: string]: unknown;
  } | null | undefined;
  playerId: string | null;
  turnOrderedPlayerIds: string[];
  raiseLadder: number[];
}

export function isMyTurn(input: BettingInput): boolean {
  const { game, myHand, turnOrderedPlayerIds } = input;
  if (!game || game.status !== "active" || myHand?.hasFolded) return false;
  const currentPlayerId = turnOrderedPlayerIds[game.currentPlayerIndex];
  return currentPlayerId === myHand?.playerId;
}

export function canCheck(input: BettingInput): boolean {
  const { game, myHand, playerId } = input;
  if (!game || !myHand || myHand.hasFolded) return false;
  const turnPlayerId = input.turnOrderedPlayerIds[game.currentPlayerIndex];
  if (turnPlayerId !== playerId || game.status !== "active") return false;
  return game.currentBet === 0 || myHand.betThisRound === game.currentBet;
}

export function canCall(input: BettingInput): boolean {
  const { game, myHand, playerId } = input;
  if (!game || !myHand || myHand.hasFolded) return false;
  const turnPlayerId = input.turnOrderedPlayerIds[game.currentPlayerIndex];
  if (turnPlayerId !== playerId || game.status !== "active") return false;
  const amountNeeded = game.currentBet - myHand.betThisRound;
  return game.currentBet > 0 && amountNeeded > 0 && myHand.chips >= amountNeeded;
}

export function callAmount(game: any, myHand: any): number {
  if (!game || !myHand) return 0;
  return game.currentBet - myHand.betThisRound;
}

export function getAvailableRaiseOptions(input: BettingInput): number[] {
  const { game, myHand, raiseLadder } = input;
  if (
    !game ||
    !myHand ||
    !isMyTurn(input) ||
    game.status !== "active"
  ) {
    return [];
  }

  const maxRaisesPerRound =
    (game.config?.maxRaisesPerRound as number | undefined) ?? MAX_RAISES_PER_ROUND;

  if (game.raisesThisRound >= maxRaisesPerRound) {
    return [];
  }

  const amountToCall = game.currentBet - myHand.betThisRound;
  const bettingStructure = game.config?.bettingStructure as string | undefined;
  const potLimitMaxRaiseTo =
    bettingStructure === "potLimit"
      ? game.pot + Math.max(0, amountToCall)
      : Number.POSITIVE_INFINITY;

  return raiseLadder.filter((amount) => {
    return (
      amount > game.currentBet &&
      amount <= potLimitMaxRaiseTo &&
      amount - myHand.betThisRound <= myHand.chips
    );
  });
}

export function getRaisesThisRound(game: any): number {
  return game?.raisesThisRound ?? 0;
}

export function getMaxRaisesPerRound(game: any): number {
  return (game?.config?.maxRaisesPerRound as number | undefined) ?? MAX_RAISES_PER_ROUND;
}
