import type { TransactionSource } from "../../../convex/schema";

export const TRANSACTION_SOURCE_LABELS: Record<TransactionSource, string> = {
  starter_grant: "Starter grant",
  playtest_deposit: "Playtest deposit",
  buy_in: "Game buy-in",
  payout: "Game payout",
  reward: "Gameplay reward",
  achievement: "Achievement reward",
  login_streak: "Login streak bonus",
  tutorial: "Tutorial completion",
};

export function formatTransactionSource(source: TransactionSource): string {
  return TRANSACTION_SOURCE_LABELS[source] ?? source;
}
