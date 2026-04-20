/**
 * Simple bot logic WITHOUT AI/OpenRouter dependency
 * Use this if you want bots to work immediately without API setup
 */

/**
 * Toggle to use simple bots instead of AI bots
 * Set to true to bypass OpenRouter and use rule-based logic
 */
export const USE_SIMPLE_BOTS = true;

/**
 * Simple bot betting logic (no AI required)
 */
export function getSimpleBotDecision(args: {
  handTiles: any[];
  currentBet: number;
  chips: number;
  pot: number;
  stage: string;
}): { action: "fold" | "check" | "call" | "raise"; raiseAmount?: number } {
  const { currentBet, chips, pot } = args;
  const amountToCall = currentBet;

  // No bet yet - always check
  if (currentBet === 0) {
    return { action: "check" };
  }

  // Can't afford to call - fold
  if (chips < amountToCall) {
    return { action: "fold" };
  }

  // Simple logic based on pot odds
  const potOdds = pot > 0 ? amountToCall / pot : 1;

  // If bet is small relative to pot, call
  if (potOdds < 0.3) {
    return { action: "call" };
  }

  // If bet is large relative to pot, fold
  if (potOdds > 0.5) {
    return { action: "fold" };
  }

  // Otherwise call
  return { action: "call" };
}
