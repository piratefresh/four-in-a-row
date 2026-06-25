import type { TransactionSource } from "../../../convex/schema";
import { formatTransactionSource } from "./transactionLabels";
import { sourceIcon } from "./transactionIcons";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatBalance(amount: number): string {
  return amount.toLocaleString();
}

export function TransactionRow({
  tx,
}: {
  tx: {
    _id: string;
    amount: number;
    source: TransactionSource;
    balanceAfter: number;
    createdAt: number;
  };
}) {
  const isCredit = tx.amount > 0;
  const source = tx.source as TransactionSource;

  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-cream/[0.04]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream/5 text-base leading-none" role="img">
          {sourceIcon(source)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-cream/90">
            {formatTransactionSource(source)}
          </p>
          <p className="text-[11px] text-game-muted">{timeAgo(tx.createdAt)}</p>
        </div>
      </div>
      <div className="ml-4 flex-none text-right">
        <p
          className={`text-sm font-semibold tabular-nums ${
            isCredit ? "text-emerald-400" : "text-game-red"
          }`}
        >
          {isCredit ? "+" : ""}
          {formatBalance(tx.amount)}
        </p>
        <p className="text-[11px] text-game-muted tabular-nums">{formatBalance(tx.balanceAfter)}</p>
      </div>
    </div>
  );
}
