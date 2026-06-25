import { useEffect, useTransition } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";

function formatBalance(amount: number): string {
  return amount.toLocaleString();
}

/**
 * Centralized wallet integration hook (STO-232/React refactor).
 *
 * Owns:
 *   - Reactive balance query.
 *   - One-time wallet initialization (keyed by the authenticated user id,
 *     not a component-lifetime ref, so a session change re-initializes).
 *   - Deposit mutation with `useTransition` for pending state.
 *   - Automatic login streak recording with best-effort toast (STO-238).
 *
 * Both `Header` and `WalletPage` call this hook. Wallet initialization is
 * duplicate-safe (`ensureMyWallet` calls `getOrCreateWallet`), so multiple
 * components calling it is safe — the second call is a no-op.
 */
export function useWallet(sessionUserId: string | undefined) {
  const balanceData = useQuery(api.wallet.getMyBalance);
  const ensureMyWallet = useMutation(api.wallet.ensureMyWallet);
  const depositMutation = useMutation(api.wallet.depositPlaytestCoins);
  const recordLogin = useMutation(api.loginStreaks.recordLogin);
  const [isDepositing, startDepositTransition] = useTransition();

  const hasWallet = balanceData?.hasWallet ?? false;
  const balance = balanceData?.balance ?? null;
  const isLoading = balanceData === undefined;

  // Initialize wallet once per authenticated user. The effect is keyed by
  // `sessionUserId` and `balanceData` so it fires when the session changes
  // or when the balance query first resolves. No `useRef` guard — the effect
  // re-runs naturally when the user switches.
  useEffect(() => {
    if (!sessionUserId) return;
    if (balanceData === undefined) return;
    if (balanceData.hasWallet) return;
    void ensureMyWallet({});
  }, [sessionUserId, balanceData, ensureMyWallet]);

  // Record login streak on every authenticated page load (STO-238).
  // Idempotent per UTC day — safe to call on every render.
  useEffect(() => {
    if (!sessionUserId) return;
    if (balanceData === undefined) return;
    if (!balanceData.hasWallet) return;

    let cancelled = false;
    void recordLogin({}).then((result) => {
      if (cancelled) return;
      if (!result.recorded || result.coinsAwarded <= 0) return;
      toast.success(
        `Login streak day ${result.streak}: +${formatBalance(result.coinsAwarded)} coins! \u{1F31F}`,
      );
    }).catch(() => {
      // Best-effort: ignore errors (e.g. email not verified).
    });

    return () => { cancelled = true; };
  }, [sessionUserId, balanceData, recordLogin]);

  async function deposit(amount: number, operationId: string) {
    let result: { balance: number; status: "applied" | "already_processed" } | null = null;
    await new Promise<void>((resolve, reject) => {
      startDepositTransition(async () => {
        try {
          result = await depositMutation({ amount, operationId });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
    return result!;
  }

  return {
    hasWallet,
    balance,
    isLoading,
    isDepositing,
    deposit,
  };
}
