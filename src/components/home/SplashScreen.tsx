import { useEffect } from "react";
import { PokerChipHero } from "@/components/ui/PokerChipHero";

type SplashScreenProps = {
  onComplete?: () => void;
  autoAdvanceMs?: number;
};

export function SplashScreen({
  onComplete,
  autoAdvanceMs = 2000,
}: SplashScreenProps) {
  useEffect(() => {
    if (!onComplete) return;
    const timer = setTimeout(onComplete, autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [onComplete, autoAdvanceMs]);

  return (
    <main className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-felt-deep">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-gradient-felt-splash" />

      {/* Cross-hatch texture overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(212,165,74,0.03) 20px, rgba(212,165,74,0.03) 21px)",
        }}
      />

      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-gradient-felt-glow" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Wordmark */}
        <div className="text-center">
          <h1 className="font-display text-5xl font-black leading-[0.95] tracking-tight text-cream sm:text-7xl">
            Word
            <br />
            <span className="text-gold italic">Poker</span>
          </h1>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-gold sm:text-xs">
            Build words &middot; Win pots
          </p>
        </div>

        {/* Spinning chip */}
        <PokerChipHero tone="gold" size="lg" spinning />
      </div>
    </main>
  );
}
