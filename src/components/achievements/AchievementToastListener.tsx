import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { getAchievement } from "../../../convex/achievements/definitions";
import { AchievementToast } from "./AchievementToast";

/**
 * Parse a human-readable reason from a reward/achievement operation key.
 *
 * Expected formats:
 *   reward:{userId}:hand_complete:{gameId}     → Reached showdown
 *   reward:{userId}:hand_win:{gameId}          → Won hand
 *   reward:{userId}:daily_first_win:{date}     → First win of the day
 *   tutorial:{userId}:first-bot-game           → Tutorial completed
 *   achievement:{userId}:{id}:unlocked:{gameId} → Achievement name
 */
function describeTransaction(source: string, operationKey: string): string {
  const parts = operationKey.split(":");

  if (source === "achievement") {
    const achievementId = parts[2] ?? "Unknown";
    const def = getAchievement(achievementId);
    return def?.name ?? achievementId;
  }

  if (source === "tutorial") {
    return "Tutorial completed";
  }

  // source === "reward" — parse the rule id from the key.
  const ruleId = parts[2] ?? "";
  switch (ruleId) {
    case "hand_complete":
      return "Reached showdown";
    case "hand_win":
      return "Won hand";
    case "daily_first_win":
      return "First win of the day";
    default:
      return ruleId.length > 0 ? ruleId.replace(/_/g, " ") : "Reward";
  }
}

/**
 * Global listener that watches for new reward/achievement wallet
 * transactions and fires toasts no matter which route the user is on.
 *
 * Place once in __root.tsx — it persists across page navigations so
 * toasts fire reliably after game settlement, even when the room page
 * has already navigated to /results/$code.
 */
export function AchievementToastListener() {
  const { data: session } = authClient.useSession();
  const sessionUserId = session?.user?.id;

  const transactionPage = useQuery(
    api.wallet.getMyTransactions,
    sessionUserId
      ? { paginationOpts: { numItems: 25, cursor: null } }
      : "skip",
  );

  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    const transactions = transactionPage?.page;
    if (!transactions || transactions.length === 0) return;

    // On first load, mark all existing reward/achievement/tutorial
    // transactions as seen so we don't re-toast historical entries.
    if (!initialized.current) {
      for (const transaction of transactions) {
        if (
          transaction.source === "reward" ||
          transaction.source === "achievement" ||
          transaction.source === "tutorial"
        ) {
          seenIds.current.add(transaction._id);
        }
      }
      initialized.current = true;
      return;
    }

    // Subsequent updates: fire toasts for newly seen transactions.
    for (const transaction of transactions) {
      if (
        transaction.source !== "reward" &&
        transaction.source !== "tutorial" &&
        transaction.source !== "achievement"
      )
        continue;
      if (seenIds.current.has(transaction._id)) continue;
      seenIds.current.add(transaction._id);

      const amount = transaction.amount;
      const reason = describeTransaction(
        transaction.source,
        transaction.operationKey as string,
      );

      if (transaction.source === "achievement") {
        const achievementId =
          (transaction.operationKey as string).split(":")[2] ?? "";
        const def = getAchievement(achievementId);
        if (!def) {
          // Fallback to simple toast if definition not found.
          toast.success(
            `Achievement unlocked: ${reason} (+${amount.toLocaleString()} coins)`,
            { duration: 6000 },
          );
          continue;
        }
        toast.custom(
          (t) => (
            <AchievementToast
              achievement={def}
              reason={def.desc}
              credits={amount}
              newBalance={transaction.balanceAfter}
              toastId={t}
            />
          ),
          { duration: 6500 },
        );
      } else {
        // Reward or tutorial: use the same rich toast without achievement details.
        toast.custom(
          (t) => (
            <AchievementToast
              reason={reason}
              credits={amount}
              newBalance={transaction.balanceAfter}
              toastId={t}
            />
          ),
          { duration: 5000 },
        );
      }
    }
  }, [transactionPage?.page]);

  // Renders nothing — toasts only.
  return null;
}
