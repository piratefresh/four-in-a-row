import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

type Particle = {
  id: number;
  left: number;
  drift: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotation: number;
  rotationEnd: number;
  shape: "circle" | "square";
};

type WinSplashOverlayProps = {
  pot: number;
  winningWord: string | null | undefined;
  winningScore: number | null | undefined;
  onDismiss: () => void;
};

const PARTICLE_COUNT = 40;
const AUTO_DISMISS_MS = 3200;
const MIN_TAP_DELAY_MS = 1500;

export function WinSplashOverlay({
  pot,
  winningWord,
  winningScore,
  onDismiss,
}: WinSplashOverlayProps) {
  const [canDismiss, setCanDismiss] = useState(false);

  useEffect(() => {
    const minTimer = window.setTimeout(
      () => setCanDismiss(true),
      MIN_TAP_DELAY_MS,
    );
    const autoTimer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(autoTimer);
    };
  }, [onDismiss]);

  const particles = useMemo<Particle[]>(() => {
    const colors = ["#f5c76a", "#d4a54a", "#f6efe0", "#f7da61", "#c9952e"];
    return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      drift: (Math.random() - 0.5) * 72,
      delay: Math.random() * 1.5,
      duration: 1.5 + Math.random() * 2,
      size: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationEnd: Math.random() * 360 + 180,
      shape: Math.random() > 0.5 ? "circle" : "square",
    }));
  }, []);

  const subtitle =
    winningWord && winningScore != null
      ? `${winningWord.toUpperCase()} | ${winningScore} pts`
      : null;

  return (
    <motion.div
      className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 50% 30%, #f5c76a 0%, #d4a54a 30%, #072419 80%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => {
        if (canDismiss) onDismiss();
      }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute top-0"
          style={{
            left: `${particle.left}%`,
            width: particle.size,
            height: particle.size,
            borderRadius: particle.shape === "circle" ? "50%" : "2px",
            backgroundColor: particle.color,
          }}
          initial={{ y: -20, opacity: 0, rotate: particle.rotation }}
          animate={{
            y: ["0vh", "100vh"],
            opacity: [0, 1, 1, 0],
            rotate: particle.rotation + particle.rotationEnd,
            x: [0, particle.drift, particle.drift * 0.45],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: "easeIn",
            times: [0, 0.1, 0.8, 1],
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <motion.div
          className="relative h-16 w-20"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
          aria-hidden="true"
        >
          <span className="absolute bottom-0 left-2 h-12 w-12 rounded-full border-[5px] border-felt-deep bg-gold-bright shadow-[0_10px_24px_rgba(7,36,25,0.35)]" />
          <span className="absolute bottom-3 right-2 h-12 w-12 rounded-full border-[5px] border-felt-deep bg-gold shadow-[0_10px_24px_rgba(7,36,25,0.28)]" />
          <span className="absolute bottom-1 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border-[5px] border-felt-deep bg-cream shadow-[0_10px_24px_rgba(7,36,25,0.25)]" />
        </motion.div>

        <motion.h1
          className="text-center font-display text-5xl font-black leading-[0.9] tracking-tight text-felt-deep"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
        >
          You
          <br />
          Win!
        </motion.h1>

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

        <motion.div
          className="rounded-full bg-felt-deep px-6 py-3 font-display text-xl font-bold text-gold"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          +{pot} coins
        </motion.div>

        <motion.p
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-felt-deep/45"
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
