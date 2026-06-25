import { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
  useAnimationControls,
} from "motion/react";

const GOLD = "#d4a54a";
const GOLDHI = "#f5c76a";
const GREEN = "#46d18a";
const RED = "#c23d3d";
const EASE = [0.22, 0.61, 0.36, 1] as const;

/* ---------- count-up / count-down number ---------- */
function AnimatedNumber({ value, duration = 0.8 }: { value: number; duration?: number }) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="tabular-nums">
      {display.toLocaleString()}
    </span>
  );
}

/* ---------- delta badge that floats up on settle ---------- */
function DeltaBadge({ delta, settleId }: { delta: number; settleId: number }) {
  const gain = delta >= 0;

  return (
    <AnimatePresence>
      {settleId > 0 && (
        <motion.div
          key={settleId}
          initial={{ opacity: 0, y: 2, scale: 0.7 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [2, -7, -7, -30],
            scale: [0.7, 1.12, 1, 0.95],
          }}
          transition={{ duration: 1.5, ease: "easeOut", times: [0, 0.18, 0.34, 1] }}
          className="absolute left-1/2 -translate-x-1/2 font-mono text-xs font-bold whitespace-nowrap"
          style={{ top: -8, color: gain ? GREEN : RED }}
        >
          {gain ? "+" : "\u2212"}
          {Math.abs(delta).toLocaleString()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- wallet pill ---------- */
export type WalletPillHandle = {
  element: HTMLDivElement | null;
};

export function WalletPill({
  balance,
  delta,
  settleId,
  pillRef,
}: {
  balance: number;
  delta: number;
  settleId: number;
  pillRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const gain = delta >= 0;
  const flash = useAnimationControls();
  const numPulse = useAnimationControls();

  useEffect(() => {
    if (settleId === 0) return;
    const color = gain ? GREEN : RED;
    flash.start({
      boxShadow: [
        "0 0 0 0 rgba(0,0,0,0)",
        `0 0 0 4px ${color}88`,
        "0 0 0 0 rgba(0,0,0,0)",
      ],
      borderColor: [
        "rgba(212,165,74,0.4)",
        color,
        "rgba(212,165,74,0.4)",
      ],
      transition: { duration: 0.8, ease: "easeOut" },
    });
    numPulse.start({
      scale: gain ? [1, 1.14, 1] : [1, 0.9, 1],
      color: [color, color, GOLDHI],
      transition: { duration: 0.55, ease: EASE },
    });
  }, [settleId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative" ref={pillRef}>
      <DeltaBadge delta={delta} settleId={settleId} />

      <motion.div
        animate={flash}
        className="flex items-center gap-2 rounded-full px-3.5 py-1.5"
        style={{
          background: "linear-gradient(180deg, rgba(212,165,74,0.18), rgba(212,165,74,0.07))",
          border: "1px solid rgba(212,165,74,0.4)",
        }}
      >
        {/* Coin disc */}
        <span
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full font-serif text-xs font-bold"
          style={{
            color: "#3a2c08",
            background: `radial-gradient(circle at 50% 32%, ${GOLDHI}, ${GOLD} 65%, #a8842a)`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          $
        </span>

        {/* Balance number */}
        <motion.span
          animate={numPulse}
          className="font-serif text-lg font-bold leading-none"
          style={{ color: GOLDHI }}
        >
          <AnimatedNumber value={balance} />
        </motion.span>
      </motion.div>
    </div>
  );
}
