import { useEffect, useState, useCallback } from "react";
import { useMediaQuery } from "../rooms/hooks/useMediaQuery";
import { toast } from "sonner";
import type { Achievement, Rarity } from "../../../convex/achievements/definitions";
import { RARITY_CONFIG } from "../../../convex/achievements/definitions";

// ============================================================
// Helpers
// ============================================================

/** Append hex alpha to a colour string (e.g. "#d4af37", 0.5 → "#d4af3780"). */
function hexA(hex: string, alpha: number): string {
  if (!hex.startsWith("#")) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return hex + a.toString(16).padStart(2, "0");
}

/** Map achievement id → single-char glyph, same as AchievementCard. */
function achievementGlyph(a: Achievement): string {
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
  return glyphs[a.id] ?? a.name[0] ?? "?";
}

// ============================================================
// Design tokens — aligned with styles.css felt palette
// ============================================================

const FELT = "#0d3b2e";
const FELT_DEEP = "#072419";
const FELT_LIGHT = "#14523f";
const GOLD = "#d4a54a";
const GOLD_BRIGHT = "#f5c76a";
const PARCHMENT = "#f6efe0";
const PARCHMENT_DIM = "rgba(246,239,224,0.55)";
const PARCHMENT_FAINT = "rgba(246,239,224,0.35)";
const RULE = "rgba(246,239,224,0.08)";
const FONT_SERIF = '"Noto Serif", ui-serif, Georgia, Cambria, serif';
const FONT_SANS =
  '"Bricolage Grotesque", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
// ============================================================
// Sub-components
// ============================================================

/** Small all-caps kicker label (replaces the Claude `Kicker`). */
function Kicker({
  children,
  color = PARCHMENT_DIM,
  tracking = "0.22em",
}: {
  children: React.ReactNode;
  color?: string;
  tracking?: string;
}) {
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 8.5,
        fontWeight: 600,
        letterSpacing: tracking,
        color,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

/** Small gold coin with radial gradient and inset shadows. */
function Coin({ size = 28, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <span
      className={animate ? "animate-coin-pop" : ""}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 34% 30%, #fbe9b0 0%, #e7c75a 42%, #b88a22 100%)",
        color: "#5e4510",
        fontFamily: FONT_SERIF,
        fontWeight: 700,
        fontStyle: "italic",
        fontSize: size * 0.5,
        letterSpacing: -0.5,
        lineHeight: 1,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 4px rgba(120,90,20,0.55), 0 1px 3px rgba(0,0,0,0.45)",
        border: "1px solid rgba(120,90,20,0.55)",
        animationFillMode: "both",
      }}
    >
      {"\u00A2"}
    </span>
  );
}

/** Circular medallion showing the achievement glyph. */
function Medallion({
  rarity,
  glyph,
  size = 56,
}: {
  rarity: Rarity;
  glyph: string;
  size?: number;
}) {
  const c = RARITY_CONFIG[rarity].color;
  const bg = hexA(c, 0.18);
  const border = hexA(c, 0.4);
  const glow = hexA(c, 0.25);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-xl"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(155deg, ${bg} 0%, rgba(0,0,0,0.55) 100%)`,
        border: `1px solid ${border}`,
        boxShadow: `${glow} 0px 0px 0px 1px, ${glow} 0px 6px 18px, rgba(255,255,255,0.1) 0px 1px 0px inset`,
      }}
    >
      <span
        className="leading-none"
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 800,
          fontSize: glyph.length > 1 ? "0.875rem" : "1.35rem",
          letterSpacing: glyph.length === 1 ? "-1px" : undefined,
          color: "rgb(244,228,193)",
          textShadow: `${glow} 0px 0px 16px`,
        }}
      >
        {glyph}
      </span>
    </div>
  );
}

// ============================================================
// Props
// ============================================================

export interface AchievementToastData {
  /** The achievement definition (absent for simple coin rewards). */
  achievement?: Achievement;
  /** Human-readable reason (what the player did). */
  reason: string;
  /** Coins awarded for this unlock. */
  credits: number;
  /** New wallet balance after the award. */
  newBalance: number;
}

export interface AchievementToastProps extends AchievementToastData {
  /** Toast id from sonner — used to dismiss. */
  toastId: string | number;
}

// ============================================================
// Toast component
// ============================================================

export function AchievementToast({
  achievement,
  reason,
  credits,
  newBalance,
  toastId,
}: AchievementToastProps) {
  const hasAchievement = achievement != null;
  const c = hasAchievement
    ? RARITY_CONFIG[achievement.rarity].color
    : GOLD;
  const rarityLabel = hasAchievement
    ? RARITY_CONFIG[achievement.rarity].label
    : "REWARD";
  const glyph = hasAchievement ? achievementGlyph(achievement) : "\u00A2";

  const isMobile = useMediaQuery("(max-width: 420px)");
  const duration = hasAchievement ? 6000 : 4500;
  const [leaving, setLeaving] = useState(false);

  // Responsive scale factors.
  const width = isMobile ? undefined : 372;
  const medallionSize = isMobile ? 40 : 52;
  const coinSize = isMobile ? 22 : 28;
  const bodyPadding = isMobile ? "10px 13px 10px 14px" : "15px 17px 14px 18px";
  const ledgerPadding = isMobile ? "9px 14px 10px" : "11px 18px 12px";
  const nameSize = isMobile ? 17 : 21;
  const reasonSize = isMobile ? 11.5 : 12.5;
  const creditsSize = isMobile ? 19 : 23;
  const balanceSize = isMobile ? 11 : 13;
  const gap = isMobile ? 10 : 14;

  // Auto-dismiss after `duration`.
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), duration);
    return () => clearTimeout(t);
  }, [duration]);
  // Dismiss after exit animation completes.
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => toast.dismiss(toastId), 280);
    return () => clearTimeout(t);
  }, [leaving, toastId]);

  const close = useCallback(() => setLeaving(true), []);

  return (
    <div
      onClick={close}
      data-achievement-toast=""
      style={{
        width: width ?? "100%",
        maxWidth: "calc(100vw - 2rem)",
        position: "relative",
        cursor: "pointer",
        borderRadius: isMobile ? 12 : 15,
        overflow: "hidden",
        background: `linear-gradient(150deg, ${hexA(FELT_LIGHT, 0.25)} 0%, ${FELT} 18%, ${FELT_DEEP} 100%)`,
        backgroundColor: FELT,
        border: `1px solid ${hexA(c, 0.34)}`,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 1px 0 ${hexA(c, 0.25)} inset, 0 18px 44px rgba(0,0,0,0.55), 0 0 38px ${hexA(c, 0.18)}`,
        animation: leaving
          ? "toast-out 0.28s ease-in forwards"
          : "toast-in 0.5s cubic-bezier(.2,.9,.3,1.1)",
        animationFillMode: "both",
        fontFamily: FONT_SANS,
      }}
    >
      {/* Rarity edge strip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: `linear-gradient(180deg, ${c}, ${hexA(c, 0.25)})`,
        }}
      />

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setLeaving(true);
        }}
        aria-label="Dismiss"
        style={{
          position: "absolute",
          top: isMobile ? 7 : 9,
          right: isMobile ? 7 : 10,
          width: isMobile ? 22 : 26,
          height: isMobile ? 22 : 26,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: PARCHMENT_DIM,
          fontSize: isMobile ? 12 : 14,
          lineHeight: 1,
          cursor: "pointer",
          transition: "background 0.15s, color 0.15s",
          zIndex: 2,
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.16)";
          e.currentTarget.style.color = PARCHMENT;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.color = PARCHMENT_DIM;
        }}
      >
        {"\u00D7"}
      </button>

      {/* Shine sweep (entrance only) */}
      {!leaving && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            className="animate-toast-shine"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "42%",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.13), transparent)",
            }}
          />
        </div>
      )}

      {/* Body */}
      <div
        style={{
          display: "flex",
          gap,
          alignItems: "center",
          padding: bodyPadding,
        }}
      >
        {hasAchievement ? (
          <Medallion
            rarity={achievement.rarity}
            glyph={glyph}
            size={medallionSize}
          />
        ) : null}

        <div style={{ flex: 1, minWidth: 0 }}>
          {hasAchievement ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Kicker color={GOLD}>ACHIEVEMENT UNLOCKED</Kicker>
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: hexA(c, 0.6),
                  }}
                />
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 8.5,
                    letterSpacing: "0.16em",
                    fontWeight: 600,
                    color: c,
                  }}
                >
                  {rarityLabel}
                </span>
              </div>
              <div
                style={{
                  fontFamily: FONT_SERIF,
                  fontWeight: 600,
                  fontSize: nameSize,
                  lineHeight: 1.05,
                  color: GOLD_BRIGHT,
                  letterSpacing: -0.4,
                  marginTop: 3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {achievement.name}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: reasonSize,
                  lineHeight: 1.35,
                  color: PARCHMENT_DIM,
                  marginTop: 4,
                }}
              >
                {reason}
              </div>
            </>
          ) : (
            <>
              <Kicker color={GOLD}>COINS EARNED</Kicker>
              <div
                style={{
                  fontFamily: FONT_SERIF,
                  fontWeight: 600,
                  fontSize: isMobile ? 16 : 19,
                  lineHeight: 1.15,
                  color: GOLD_BRIGHT,
                  letterSpacing: -0.3,
                  marginTop: 3,
                }}
              >
                {reason}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reward ledger */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: ledgerPadding,
          borderTop: `1px solid ${RULE}`,
          background:
            "linear-gradient(90deg, rgba(212,175,55,0.07), rgba(212,175,55,0.02))",
        }}
      >
        <Coin size={coinSize} animate />
        <div style={{ lineHeight: 1 }}>
          <Kicker color={PARCHMENT_DIM}>CREDITS REWARDED</Kicker>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: creditsSize,
              color: GOLD,
              marginTop: 3,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            +{credits.toLocaleString()}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <Kicker color={PARCHMENT_FAINT}>NEW BALANCE</Kicker>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: balanceSize,
              fontWeight: 600,
              color: PARCHMENT,
              marginTop: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {newBalance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Auto-dismiss timer bar */}
      {!leaving && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 2.5,
            background: "rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="animate-toast-bar"
            style={{
              height: "100%",
              width: "100%",
              transformOrigin: "left",
              background: `linear-gradient(90deg, ${hexA(c, 0.5)}, ${c})`,
              animationDuration: `${duration}ms`,
            }}
          />
        </div>
      )}
    </div>
  );
}
