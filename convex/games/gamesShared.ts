import type { Id } from "../_generated/dataModel";

export const AI_DEALER_PLAYER_ID = "ai_dealer";
export const INITIAL_CHIPS = 1000;
export const DEV_BOT_AUTH_PREFIX = "dev-bot:";
export const BOT_ACTION_DELAY_MS = 300;

// Probability multiplier applied for each prior bot reply to a player message.
// E.g., 0.15 means: 1 prior reply → 15% of original chattiness, 2 → 2.25%, etc.
// Override via Convex env: bunx convex env set BOT_DIALOGUE_PILE_ON_REDUCTION 0.15
export const BOT_DIALOGUE_PILE_ON_REDUCTION =
  parseFloat(process.env.BOT_DIALOGUE_PILE_ON_REDUCTION ?? "") || 0.15;

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

// --- Redaction helpers (moved from gamesBetting.ts) ---

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redactBracketedCandidateWords(text: string): string {
  return text.replace(/\{[A-Za-z]{2,7}\}/g, "[hidden word]");
}

export function getPrivateTileLetters(
  tiles: Array<{ kind?: string; letter?: string; options?: string[] }>,
): string[] {
  const letters = new Set<string>();
  for (const tile of tiles) {
    if (tile.kind === "single" && typeof tile.letter === "string") {
      letters.add(tile.letter.toUpperCase());
    }
    if (tile.kind === "choice" && Array.isArray(tile.options)) {
      for (const option of tile.options) {
        letters.add(option.toUpperCase());
      }
    }
  }
  return [...letters].filter((letter) => /^[A-Z]$/.test(letter));
}

export function redactPrivateTileLetters(
  text: string,
  tiles: Array<{ kind?: string; letter?: string; options?: string[] }>,
): string {
  let redacted = text;
  for (const letter of getPrivateTileLetters(tiles)) {
    const escapedLetter = escapeRegExp(letter);
    redacted = redacted.replace(
      new RegExp(`\\b${escapedLetter}\\s*\\(\\s*\\d+\\s*\\)`, "g"),
      "[hidden tile]",
    );
    redacted = redacted.replace(
      new RegExp(`\\b${escapedLetter}\\b`, "g"),
      "[hidden tile]",
    );
  }
  return redacted;
}
