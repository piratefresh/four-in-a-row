import type { AchievementWithProgress } from "../../../convex/achievements";
import type { Rarity } from "../../../convex/achievements/definitions";
import { Check, Lock, Star } from "lucide-react";

const RARITY_STYLES: Record<
  Rarity,
  {
    color: string;
    bg: string;
    border: string;
    glow: string;
    iconBg: string;
    iconBorder: string;
    iconShadow1: string;
    iconShadow2: string;
  }
> = {
  common: {
    color: "#9aa39d",
    bg: "rgba(154,163,157,0.06)",
    border: "rgba(154,163,157,0.24)",
    glow: "rgba(154,163,157,0.15)",
    iconBg: "rgba(154,163,157,0.34)",
    iconBorder: "rgba(154,163,157,0.6)",
    iconShadow1: "rgba(154,163,157,0.22)",
    iconShadow2: "rgba(154,163,157,0.20)",
  },
  rare: {
    color: "#7ec4cf",
    bg: "rgba(126,196,207,0.06)",
    border: "rgba(126,196,207,0.24)",
    glow: "rgba(126,196,207,0.15)",
    iconBg: "rgba(126,196,207,0.34)",
    iconBorder: "rgba(126,196,207,0.6)",
    iconShadow1: "rgba(126,196,207,0.22)",
    iconShadow2: "rgba(126,196,207,0.20)",
  },
  epic: {
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.06)",
    border: "rgba(167,139,250,0.24)",
    glow: "rgba(167,139,250,0.15)",
    iconBg: "rgba(167,139,250,0.34)",
    iconBorder: "rgba(167,139,250,0.6)",
    iconShadow1: "rgba(167,139,250,0.22)",
    iconShadow2: "rgba(167,139,250,0.20)",
  },
  legendary: {
    color: "#d4af37",
    bg: "rgba(212,175,55,0.06)",
    border: "rgba(212,175,55,0.24)",
    glow: "rgba(212,175,55,0.15)",
    iconBg: "rgba(212,175,55,0.34)",
    iconBorder: "rgba(212,175,55,0.6)",
    iconShadow1: "rgba(212,175,55,0.22)",
    iconShadow2: "rgba(212,175,55,0.20)",
  },
};

const RARITY_LABELS: Record<Rarity, string> = {
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
  legendary: "LEGENDARY",
};

const RARITY_POINTS: Record<Rarity, number> = {
  common: 10,
  rare: 25,
  epic: 50,
  legendary: 100,
};

function formatCoins(amount: number): string {
  return amount.toLocaleString();
}

/** Medallion glyph: attempt a single‑character emblem from the name, or a tile letter. */
function achievementGlyph(achievement: AchievementWithProgress): string {
  const { id, category } = achievement;

  // Explicit mapping for specific achievements.
  const glyphs: Record<string, string> = {
    heavy_hitter: "\u2694",
    full_house: "\u2663",
    double_trouble: "2\u00D7",
    tile_whisperer: "2L",
    q_without_u: "Q\u0131",
    vocabularian: "Z",
    ice_cold: "\u2744",
    read_em: "\u2665",
    comeback: "\u21BA",
    hands_played: "\u221E",
    tournament_regular: "\u2666",
    sng_winner: "\u2654",
    brewmaster: "\u{1F37A}",
    anticlimax: "2",
  };

  return glyphs[id] ?? achievement.name[0] ?? "?";
}

type Status = "unlocked" | "in-progress" | "locked";
type AchievementCardProps = {
  achievement: AchievementWithProgress;
  compact?: boolean;
};

export function AchievementCard({
  achievement,
  compact = false,
}: AchievementCardProps) {
  const {
    name,
    desc,
    type,
    rarity,
    isCompleted,
    hidden,
    completedTiers,
    progress,
    tiers,
    totalCoinsEarned,
  } = achievement;

  const isSecret = hidden === true && !isCompleted;
  const status: Status = isCompleted
    ? "unlocked"
    : completedTiers.length > 0 || progress > 0
      ? "in-progress"
      : "locked";

  const styles = RARITY_STYLES[rarity];
  const medSize = compact ? 44 : 52;
  const glyph = isSecret ? "?" : achievementGlyph(achievement);

  return (
    <div
      className={`flex gap-3 rounded-xl border transition-all hover:bg-white/[0.02] ${
        compact ? "gap-2.5 px-3 py-2.5" : "px-3.5 py-3"
      } ${isCompleted ? "" : "min-h-[80px]"}`}
      style={{
        background: isCompleted ? styles.bg : "rgba(0,0,0,0.32)",
        borderColor: isCompleted
          ? styles.border
          : "rgba(232,220,192,0.06)",
        boxShadow: isCompleted
          ? `0 0 0 1px ${styles.glow}, 0 4px 12px ${styles.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`
          : "inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
    >
      {/* Medallion */}
      <div
        className="relative flex shrink-0 items-center justify-center rounded-xl"
        style={{
          width: medSize,
          height: medSize,
          background: isCompleted
            ? `linear-gradient(155deg, ${styles.iconBg} 0%, rgba(0,0,0,0.55) 100%)`
            : "linear-gradient(155deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.5) 100%)",
          border: `1px solid ${isCompleted ? styles.iconBorder : "rgba(232,220,192,0.1)"}`,
          boxShadow: isCompleted
            ? `${styles.iconShadow1} 0px 0px 0px 1px, ${styles.iconShadow2} 0px 6px 18px, rgba(255,255,255,0.1) 0px 1px 0px inset`
            : "inset 0 1px 0 rgba(255,255,255,0.03)",
          filter: isCompleted ? "none" : "grayscale(1) brightness(0.55)",
          opacity: isCompleted ? 1 : 0.8,
        }}
      >
        <span
          className="leading-none"
          style={{
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: glyph.length > 1
              ? compact ? "0.75rem" : "0.875rem"
              : compact ? "1.2rem" : "1.35rem",
            letterSpacing: glyph.length === 1 ? "-1px" : undefined,
            color: isCompleted
              ? "rgb(244,228,193)"
              : isSecret
                ? "rgba(232,220,192,0.5)"
                : styles.color,
            textShadow: isCompleted
              ? `${styles.iconShadow1} 0px 0px 16px`
              : "none",
          }}
        >
          {glyph}
        </span>

        {/* Checkmark badge */}
        {isCompleted && (
          <div
            className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center rounded-full"
            style={{
              width: medSize * 0.32,
              height: medSize * 0.32,
              background: "#d4af37",
              color: "#051410",
              fontSize: medSize * 0.19,
              fontWeight: 900,
              boxShadow: "0 0 0 2px #051410",
              lineHeight: 1,
            }}
          >
            ✓
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        {/* Name + rarity badge */}
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className={`truncate font-semibold leading-snug ${
              isCompleted
                ? "text-gold"
                : isSecret
                  ? "italic text-game-muted"
                  : "text-cream"
            }`}
            style={{
              fontStyle: isSecret ? "italic" : "normal",
              opacity: isCompleted ? 1 : 0.82,
              fontSize: compact ? "0.95rem" : "1.05rem",
            }}
          >
            {isSecret ? "???" : name}
          </h3>
          <span
            className="shrink-0 font-mono text-[8px] font-semibold tracking-[0.12em]"
            style={{
              color: isCompleted
                ? styles.color
                : `color-mix(in srgb, ${styles.color} 55%, transparent)`,
            }}
          >
            {RARITY_LABELS[rarity]}
          </span>
        </div>

        {/* Description */}
        <p
          className="mt-0.5 text-xs leading-relaxed"
          style={{
            color: isCompleted
              ? "rgba(232,220,192,0.55)"
              : "rgba(232,220,192,0.45)",
            fontStyle: isSecret ? "italic" : "normal",
          }}
        >
          {isSecret ? "Some records are best found, not told." : desc}
        </p>

        {/* Status line */}
        {status === "unlocked" && (
          <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.1em] text-gold">
            <Check className="h-3 w-3" strokeWidth={3} />
            UNLOCKED
            {totalCoinsEarned > 0 && (
              <span className="text-game-muted">
                · +{formatCoins(totalCoinsEarned)} coins
              </span>
            )}
          </div>
        )}

        {status === "in-progress" && (
          <div className="mt-2">
            <div
              className="h-1 rounded-full"
              style={{ background: "rgba(0,0,0,0.45)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    tiers && tiers.length > 0
                      ? Math.round(
                          (progress / tiers[tiers.length - 1]!.at) * 100,
                        )
                      : Math.round(
                          (progress / (achievement.condition.value as number)) *
                            100,
                        ),
                  )}%`,
                  background: `linear-gradient(90deg, color-mix(in srgb, ${styles.color} 40%, transparent), ${styles.color})`,
                }}
              />
            </div>
            <div
              className="mt-1 font-mono text-[9px] tracking-[0.1em]"
              style={{ color: `color-mix(in srgb, ${styles.color} 85%, transparent)` }}
            >
              {tiers && tiers.length > 0
                ? `${progress} / ${tiers[tiers.length - 1]!.at}`
                : `${progress} / ${String(achievement.condition.value)}`}
            </div>
          </div>
        )}

        {status === "locked" && (
          <div
            className="mt-1.5 font-mono text-[9px] tracking-[0.1em]"
            style={{ color: `color-mix(in srgb, ${styles.color} 55%, transparent)` }}
          >
            LOCKED · {RARITY_POINTS[rarity]} PTS
          </div>
        )}
      </div>
    </div>
  );
}
