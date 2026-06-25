export function LoadMoreTransactions({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex justify-center pt-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded-lg border border-gold/20 bg-gold/5 px-4 py-2 text-xs font-medium text-gold-bright transition-colors hover:border-gold/40 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {disabled ? "Loading..." : "Load more"}
      </button>
    </div>
  );
}
