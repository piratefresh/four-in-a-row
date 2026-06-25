import type { TransactionSource } from "../../../convex/schema";

export const TRANSACTION_SOURCE_ICONS: Record<TransactionSource, string> = {
  starter_grant: "\u{1F381}",
  playtest_deposit: "\u{1F4B5}",
  buy_in: "\u{1F3B2}",
  payout: "\u{1F3C6}",
  reward: "\u{2B50}",
  achievement: "\u{1F3C5}",
  login_streak: "\u{1F381}",
  tutorial: "\u{1F381}",
};

export const DEFAULT_TRANSACTION_ICON = "\u2022";

export function sourceIcon(source: TransactionSource): string {
  return TRANSACTION_SOURCE_ICONS[source] ?? DEFAULT_TRANSACTION_ICON;
}
