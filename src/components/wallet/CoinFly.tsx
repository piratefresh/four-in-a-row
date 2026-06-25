import { createContext, useContext, useRef, useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type CoinFlyTrigger = {
  /** DOM element the coins fly *from* (e.g. the pot display). */
  fromElement: HTMLElement;
  /** Number of coins to spawn. */
  count?: number;
};

type CoinFlyContextValue = {
  pillRef: React.RefObject<HTMLDivElement | null>;
  trigger: CoinFlyTrigger | null;
  /** Call from a win screen to fire the coin-fly animation. */
  fire: (t: CoinFlyTrigger) => void;
};

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const CoinFlyContext = createContext<CoinFlyContextValue | null>(null);

export function CoinFlyProvider({ children }: { children: ReactNode }) {
  const pillRef = useRef<HTMLDivElement>(null);
  const [trigger, setTrigger] = useState<CoinFlyTrigger | null>(null);

  const fire = useCallback((t: CoinFlyTrigger) => {
    setTrigger(t);
  }, []);

  return (
    <CoinFlyContext.Provider value={{ pillRef, trigger, fire }}>
      {children}
      {trigger && (
        <CoinFly
          key={Date.now()}
          fromRef={{ current: trigger.fromElement }}
          toRef={pillRef}
          count={trigger.count ?? 4}
          onComplete={() => setTrigger(null)}
        />
      )}
    </CoinFlyContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                             */
/* ------------------------------------------------------------------ */

/** Header calls this to get the ref to pass to WalletPill. */
export function useCoinFlyPillRef(): React.RefObject<HTMLDivElement | null> {
  const ctx = useContext(CoinFlyContext);
  if (!ctx) throw new Error("useCoinFlyPillRef must be used within CoinFlyProvider");
  return ctx.pillRef;
}

/** Win screen calls this to fire the coin-fly animation. */
export function useTriggerCoinFly() {
  const ctx = useContext(CoinFlyContext);
  if (!ctx) throw new Error("useTriggerCoinFly must be used within CoinFlyProvider");
  return ctx.fire;
}

/* ------------------------------------------------------------------ */
/*  CoinFly component                                                 */
/* ------------------------------------------------------------------ */

type Coin = {
  id: number;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  delay: number;
};

function CoinFly({
  fromRef,
  toRef,
  count = 4,
  onComplete,
}: {
  fromRef: React.RefObject<HTMLElement | null>;
  toRef: React.RefObject<HTMLDivElement | null>;
  count?: number;
  onComplete?: () => void;
}) {
  const f = fromRef.current?.getBoundingClientRect();
  const t = toRef.current?.getBoundingClientRect();
  if (!f || !t) return null;

  const sx = f.left + f.width / 2;
  const sy = f.top + f.height / 2;
  const ex = t.left + t.width / 2;
  const ey = t.top + t.height / 2;

  const coins: Coin[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    sx,
    sy,
    ex,
    ey,
    delay: i * 0.09,
  }));

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50 }}
    >
      {coins.map((c, i) => (
        <motion.div
          key={c.id}
          initial={{ x: c.sx - 10, y: c.sy - 10, scale: 0.4, opacity: 0 }}
          animate={{
            x: c.ex - 10,
            y: c.ey - 10,
            scale: [0.4, 0.85, 0.85, 0.3],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 0.82,
            delay: c.delay,
            ease: [0.45, 0, 0.35, 1],
            times: [0, 0.2, 0.85, 1],
          }}
          onAnimationComplete={i === coins.length - 1 ? onComplete : undefined}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 20,
            height: 20,
            borderRadius: "50%",
            font: '700 11px/20px "Noto Serif", serif',
            color: "#3a2c08",
            textAlign: "center",
            background:
              "radial-gradient(circle at 50% 32%,#f7df7a,#d4af37 65%,#a8842a)",
            boxShadow:
              "0 2px 8px rgba(212,175,55,0.5),inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          $
        </motion.div>
      ))}
    </div>,
    document.body,
  );
}
