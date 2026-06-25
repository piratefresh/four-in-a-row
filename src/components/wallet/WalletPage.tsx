import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWallet } from "./useWallet";
import { WalletBalance } from "./WalletBalance";
import { StreakProgress } from "./StreakProgress";
import { PlaytestDepositForm } from "./PlaytestDepositForm";
import { TransactionHistory } from "./TransactionHistory";
import type { TransactionSource } from "../../../convex/schema";

const PAGE_SIZE = 25;

export function WalletPage({
  sessionUserId,
}: {
  sessionUserId: string | undefined;
}) {
  const { hasWallet, balance, isLoading, deposit } = useWallet(sessionUserId);

  const {
    results: transactions,
    isLoading: isLoadingHistory,
    loadMore,
    status: historyStatus,
  } = usePaginatedQuery(
    api.wallet.getMyTransactions,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  const hasMore = historyStatus === "CanLoadMore";

  if (isLoading) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-felt px-6 py-10">
        <p className="text-center text-sm text-game-muted">Loading wallet...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-felt px-4 py-6 text-cream sm:px-6 sm:py-8">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Balance card */}
        <WalletBalance balance={balance} hasWallet={hasWallet} />

        {/* Streak progress */}
        {hasWallet ? <StreakProgress /> : null}

        {/* Playtest deposit — collapsed by default feel */}
        {hasWallet ? (
          <details className="group rounded-2xl border border-cream/10 bg-felt-light/30">
            <summary className="cursor-pointer list-none px-5 py-3 text-xs font-semibold uppercase tracking-wider text-game-muted transition-colors hover:text-cream/70">
              <span>Playtest Tools</span>
            </summary>
            <div className="px-5 pb-5">
              <PlaytestDepositForm onDeposit={deposit} />
            </div>
          </details>
        ) : null}

        {/* Transaction history */}
        {hasWallet ? (
          <section className="rounded-2xl border border-cream/10 bg-felt-light/30 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cream/80">
              Transaction History
            </h2>
            <TransactionHistory
              transactions={
                transactions as Array<{
                  _id: string;
                  amount: number;
                  source: TransactionSource;
                  balanceAfter: number;
                  createdAt: number;
                }>
              }
              isLoading={isLoadingHistory}
              hasMore={hasMore}
              onLoadMore={() => loadMore(PAGE_SIZE)}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}
