import { Coins } from "lucide-react";

export function WalletBalance({
  balance,
  hasWallet,
}: {
  balance: number | null;
  hasWallet: boolean;
}) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-b from-felt-light/80 to-felt-deep/90 p-6 text-center shadow-[0_0_32px_rgba(212,165,74,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(212,165,74,0.08),transparent_70%)]" />

      <div className="relative">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-gold/20 to-gold/5 ring-1 ring-gold/30 shadow-[0_0_20px_rgba(212,165,74,0.15)]">
          <Coins className="h-7 w-7 text-gold-bright" strokeWidth={2} />
        </div>

        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-game-muted">
          Coin Balance
        </p>

        <p className="font-display text-5xl font-extrabold leading-none text-cream tabular-nums">
          {hasWallet ? (balance ?? 0).toLocaleString() : "\u2026"}
        </p>

        {hasWallet && balance != null && (
          <p className="mt-1 font-mono text-xs text-game-muted">
            {balance.toLocaleString()} coins
          </p>
        )}
      </div>
    </div>
  );
}
