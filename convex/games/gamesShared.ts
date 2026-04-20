import type { Id } from "../_generated/dataModel";

export const AI_DEALER_PLAYER_ID = "ai_dealer";
export const INITIAL_CHIPS = 1000;
export const DEV_BOT_AUTH_PREFIX = "dev-bot:";
export const BOT_ACTION_DELAY_MS = 300;

export type PlayerHand = {
  _id: Id<"playerHands">;
  playerId: string;
  hasFolded: boolean;
  hasActed: boolean;
  betThisRound: number;
  chips: number;
  totalBet: number;
  lastAction?: "check" | "call" | "raise" | "fold";
};

export function sortHandsByTurnOrder<T extends { createdAt: number; playerId: string }>(
  hands: T[],
) {
  return [...hands].sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt - b.createdAt;
    }
    return a.playerId.localeCompare(b.playerId);
  });
}

export function getClearedTurnClockFields() {
  return {
    turnClockCalledAt: undefined,
    turnClockExpiresAt: undefined,
    turnClockCallerPlayerId: undefined,
    turnClockTargetPlayerId: undefined,
  } as const;
}

export function getNewTurnStateFields(turnStartedAt: number) {
  return {
    turnStartedAt,
    ...getClearedTurnClockFields(),
  } as const;
}
