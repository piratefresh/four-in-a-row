import type { TransactionSource } from "../../../convex/schema";
import { TransactionRow } from "./TransactionRow";
import { LoadMoreTransactions } from "./LoadMoreTransactions";

type TransactionListItem = {
  _id: string;
  amount: number;
  source: TransactionSource;
  balanceAfter: number;
  createdAt: number;
};

export function TransactionHistory({
  transactions,
  isLoading,
  hasMore,
  onLoadMore,
}: {
  transactions: TransactionListItem[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  if (isLoading && transactions.length === 0) {
    return (
      <p className="text-sm text-game-muted">Loading history...</p>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-game-muted">No transactions yet.</p>
    );
  }

  return (
    <div className="space-y-0.5">
      {transactions.map((tx) => (
        <TransactionRow key={tx._id} tx={tx} />
      ))}
      {hasMore ? (
        <LoadMoreTransactions onClick={onLoadMore} disabled={isLoading} />
      ) : null}
    </div>
  );
}
