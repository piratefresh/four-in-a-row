import { useEffect, useRef, useState } from "react";

/**
 * Tracks wallet balance changes and exposes delta + settleId for
 * triggering settle animations in WalletPill.
 *
 * Each time the balance changes, settleId increments and delta is
 * computed. Animations reset when settleId changes.
 */
export function useBalanceDelta(balance: number | null) {
  const [settleId, setSettleId] = useState(0);
  const [delta, setDelta] = useState(0);
  const prevRef = useRef<number | null>(null);
  const settlingRef = useRef(false);

  useEffect(() => {
    if (balance === null || balance === undefined) return;
    const prev = prevRef.current;

    // First time seeing a balance — store but don't trigger settle.
    if (prev === null) {
      prevRef.current = balance;
      return;
    }

    // Balance hasn't changed — nothing to do.
    if (prev === balance) return;

    // Balance changed — record delta and bump settleId.
    const d = balance - prev;
    prevRef.current = balance;

    if (d === 0) return;

    settlingRef.current = true;
    setDelta(d);

    // Bump settleId to remount the delta badge and trigger flash.
    // Use functional update to avoid stale closure on rapid settles.
    setSettleId((id) => id + 1);

    // After animations finish (~1.5s), mark settle as done.
    // This doesn't reset the pill — it just allows detecting completion.
    const timer = window.setTimeout(() => {
      settlingRef.current = false;
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [balance]);

  return { delta, settleId, isSettling: settlingRef.current };
}
