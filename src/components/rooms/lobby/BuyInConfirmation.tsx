import { ArrowLeft, Coins, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

type BuyInConfirmationProps = {
  walletBalance: number | null;
  buyIn: number;
  isJoining: boolean;
  canAfford: boolean;
  onBack: () => void;
  onConfirm: () => void;
};

export function BuyInConfirmation({
  walletBalance,
  buyIn,
  isJoining,
  canAfford,
  onBack,
  onConfirm,
}: BuyInConfirmationProps) {
  const remainingBalance =
    walletBalance === null ? null : Math.max(0, walletBalance - buyIn);

  return (
    <section
      aria-label="Confirm table buy-in"
      className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-gold/25 bg-[linear-gradient(145deg,rgba(17,63,45,0.98),rgba(4,29,21,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="border-b border-cream/10 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
            <Coins className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
              Table stakes
            </p>
            <h3 className="font-serif text-xl font-semibold text-cream">
              Confirm your buy-in
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 py-5 sm:px-6">
        <StakeRow
          icon={<WalletCards className="size-4" aria-hidden="true" />}
          label="Wallet balance"
          value={
            walletBalance === null
              ? "Checking..."
              : `${walletBalance.toLocaleString()} coins`
          }
          ariaLabel={
            walletBalance === null
              ? "Wallet balance: checking"
              : `Wallet balance: ${walletBalance.toLocaleString()} coins`
          }
        />
        <StakeRow
          icon={<Coins className="size-4" aria-hidden="true" />}
          label="Fixed buy-in"
          value={`${buyIn.toLocaleString()} coins`}
          ariaLabel={`Buy-in: ${buyIn.toLocaleString()} coins`}
          emphasized
        />

        <div className="flex items-center justify-between border-t border-dashed border-cream/15 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/45">
          <span>Wallet after joining</span>
          <span className="text-cream/80">
            {remainingBalance === null
              ? "-"
              : `${remainingBalance.toLocaleString()} coins`}
          </span>
        </div>

        {!canAfford && walletBalance !== null ? (
          <p className="rounded-lg border border-red-300/20 bg-red-950/30 px-3 py-2 text-center text-sm text-red-100">
            You need {buyIn.toLocaleString()} coins to join this table.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-3 border-t border-cream/10 bg-black/10 px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          disabled={isJoining}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cream/15 px-4 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-cream/70 transition-colors hover:border-cream/30 hover:text-cream disabled:opacity-50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isJoining || !canAfford}
          className="min-h-11 rounded-xl border border-[#ffe380]/50 bg-[linear-gradient(180deg,#ffd95f_0%,#bd8f1a_100%)] px-5 font-serif text-base font-bold text-[#241703] shadow-[0_8px_24px_rgba(212,165,74,0.22),inset_0_1px_0_rgba(255,255,255,0.45)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
        >
          {isJoining ? "Taking seat..." : "Confirm & Join"}
        </button>
      </div>
    </section>
  );
}

function StakeRow({
  icon,
  label,
  value,
  ariaLabel,
  emphasized = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  ariaLabel: string;
  emphasized?: boolean;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="flex items-center justify-between gap-4 rounded-xl border border-cream/10 bg-black/15 px-4 py-3"
    >
      <span className="flex items-center gap-2 text-sm text-cream/60">
        <span className="text-gold/80">{icon}</span>
        {label}
      </span>
      <strong
        className={
          emphasized
            ? "font-serif text-lg text-gold-bright"
            : "font-mono text-sm font-semibold text-cream"
        }
      >
        {value}
      </strong>
    </div>
  );
}
