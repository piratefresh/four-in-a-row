import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Particle = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotation: number;
  shape: "circle" | "square";
};

type WinSplashOverlayProps = {
  pot: number;
  winningWord: string | null | undefined;
  winningScore: number | null | undefined;
  onDismiss: () => void;
};

const PARTICLE_COUNT = 40;
const AUTO_DISMISS_MS = 2500;
const MIN_TAP_DELAY_MS = 1000;

export function WinSplashOverlay({
  pot,
  winningWord,
  winningScore,
  onDismiss,
}: WinSplashOverlayProps) {
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    const minTimer = setTimeout(() => setCanDismiss(true), MIN_TAP_DELAY_MS);
    const autoTimer = setTimeout(() => {
      onDismiss();
    }, AUTO_DISMISS_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(autoTimer);
    };
  }, [onDismiss]);

  const particles = useMemo<Particle[]>(() => {
    const colors = ["#f5c76a", "#d4a54a", "#f6efe0", "#f7da61", "#c9952e"];
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 1.5 + Math.random() * 2,
      size: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      shape: Math.random() > 0.5 ? "circle" : "square",
    }));
  }, []);

  const subtitle =
    winningWord && winningScore != null
      ? `${winningWord.toUpperCase()} · ${winningScore} pts`
      : null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 50% 30%, #f5c76a 0%, #d4a54a 30%, #072419 70%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => {
        if (canDismiss) onDismiss();
      }}
    >
      {/* Confetti particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            backgroundColor: p.color,
          }}
          initial={{ y: -20, opacity: 0, rotate: p.rotation }}
          animate={{
            y: ["0vh", "100vh"],
            opacity: [0, 1, 1, 0],
            rotate: p.rotation + 180 + Math.random() * 360,
            x: [0, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 30],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
            times: [0, 0.1, 0.8, 1],
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Coin emoji */}
        <motion.div
          className="text-6xl"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
        >
          💰
        </motion.div>

        {/* Title */}
        <motion.h1
          className="font-display text-5xl font-black leading-[0.9] tracking-tight text-felt-deep text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
        >
          You
          <br />
          Win!
        </motion.h1>

        {/* Subtitle */}
        {subtitle ? (
          <motion.p
            className="font-mono text-[10px] uppercase tracking-[0.25em] text-felt-deep/70"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {subtitle}
          </motion.p>
        ) : null}

        {/* Reward pill */}
        <motion.div
          className="rounded-full bg-felt-deep px-6 py-3 font-display text-xl font-bold text-gold"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          +{pot} coins
        </motion.div>

        {/* Tap hint */}
        <motion.p
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-felt-deep/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          tap to continue
        </motion.p>
      </div>
    </motion.div>
  );
}
