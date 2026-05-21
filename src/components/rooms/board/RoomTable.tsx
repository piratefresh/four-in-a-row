import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TableTile =
  | {
      kind: "single";
      letter: string;
      baseValue: number;
      revealed?: boolean;
      multiplier?: "2L" | "3L";
    }
  | {
      kind: "choice";
      options: string[];
      baseValues: number[];
      revealed?: boolean;
      multiplier?: "2L" | "3L";
    };

type TableBetPosition = "top" | "left" | "right" | "bottom";

type PositionedBet = {
  id: string;
  amount: number;
  position: TableBetPosition;
  ownerName: string;
};

type RoomTableProps = {
  isPhase1: boolean;
  pot: number;
  communityTiles: TableTile[];
  opponentBets: PositionedBet[];
  bottomBet: number;
  bottomBetOwnerName?: string;
  betPositionClass: Record<TableBetPosition, string>;
  showCenterPot?: boolean;
  variant?: "desktop" | "mobile";
};

const BET_THROW_MOTION: Record<
  TableBetPosition,
  {
    initial: {
      opacity: number;
      scale: number;
      rotate: number;
      x: number;
      y: number;
    };
    animate: {
      opacity: number | number[];
      scale: number | number[];
      rotate: number | number[];
      x: number | number[];
      y: number | number[];
    };
    exit: {
      opacity: number;
      scale: number;
      rotate: number;
      x: number;
      y: number;
    };
  }
> = {
  top: {
    initial: { opacity: 0, scale: 0.68, rotate: -32, x: -24, y: -96 },
    animate: {
      opacity: [0, 1, 1, 1],
      scale: [0.68, 1.12, 0.96, 1],
      rotate: [-32, 16, -6, 0],
      x: [-24, -6, 3, 0],
      y: [-96, -22, 5, 0],
    },
    exit: { opacity: 0, scale: 0.8, rotate: 12, x: -6, y: 18 },
  },
  left: {
    initial: { opacity: 0, scale: 0.68, rotate: -38, x: -118, y: -24 },
    animate: {
      opacity: [0, 1, 1, 1],
      scale: [0.68, 1.12, 0.96, 1],
      rotate: [-38, 18, -8, 0],
      x: [-118, -24, 6, 0],
      y: [-24, -34, 4, 0],
    },
    exit: { opacity: 0, scale: 0.8, rotate: -10, x: 18, y: 4 },
  },
  right: {
    initial: { opacity: 0, scale: 0.68, rotate: 38, x: 118, y: -24 },
    animate: {
      opacity: [0, 1, 1, 1],
      scale: [0.68, 1.12, 0.96, 1],
      rotate: [38, -18, 8, 0],
      x: [118, 24, -6, 0],
      y: [-24, -34, 4, 0],
    },
    exit: { opacity: 0, scale: 0.8, rotate: 10, x: -18, y: 4 },
  },
  bottom: {
    initial: { opacity: 0, scale: 0.68, rotate: 30, x: -22, y: 110 },
    animate: {
      opacity: [0, 1, 1, 1],
      scale: [0.68, 1.12, 0.96, 1],
      rotate: [30, -14, 6, 0],
      x: [-22, -5, 3, 0],
      y: [110, 26, -5, 0],
    },
    exit: { opacity: 0, scale: 0.8, rotate: -12, x: -4, y: -18 },
  },
};

const REDUCED_BET_THROW_MOTION = {
  initial: { opacity: 0, scale: 0.9, rotate: 0, x: 0, y: 0 },
  animate: { opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 },
  exit: { opacity: 0, scale: 0.9, rotate: 0, x: 0, y: 0 },
};

const BET_THROW_TRANSITION: Transition = {
  duration: 0.46,
  ease: [0.16, 1, 0.3, 1],
  times: [0, 0.7, 0.9, 1],
};

const REDUCED_BET_THROW_TRANSITION: Transition = {
  duration: 0.16,
  ease: "easeOut",
};

function formatWagerOwnerLabel(ownerName: string) {
  const trimmedName = ownerName.trim();
  if (!trimmedName) return "Wager";
  return trimmedName.endsWith("s")
    ? `${trimmedName}' wager`
    : `${trimmedName}'s wager`;
}

type WagerChipProps = {
  amount: number;
  ownerName: string;
};

function WagerChip({ amount, ownerName }: WagerChipProps) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const tooltipLabel = formatWagerOwnerLabel(ownerName);

  return (
    <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
      <TooltipTrigger
        type="button"
        aria-label={tooltipLabel}
        className="inline-flex touch-manipulation focus:outline-none"
        onPointerDown={(event) => {
          if (event.pointerType === "touch") {
            event.preventDefault();
            setIsTooltipOpen((open) => !open);
          }
        }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f4e4c1] bg-[radial-gradient(circle_at_30%_30%,#ed4747_0%,#c41a1a_60%,#8b0e0e_100%)] font-sans text-[9px] font-extrabold text-[#fff8dc] shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_0_0_2px_rgba(255,255,255,0.06)] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
          {amount}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="rounded-full border border-[#d7c48e]/35 bg-black/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f5dfab] shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
      >
        {tooltipLabel}
      </TooltipContent>
    </Tooltip>
  );
}

export function RoomTable({
  isPhase1: _isPhase1,
  pot,
  communityTiles: _communityTiles,
  opponentBets,
  bottomBet,
  bottomBetOwnerName = "You",
  betPositionClass,
  showCenterPot = true,
  variant = "desktop",
}: RoomTableProps) {
  const shouldReduceMotion = useReducedMotion();
  const getBetThrowMotion = (position: TableBetPosition) =>
    shouldReduceMotion ? REDUCED_BET_THROW_MOTION : BET_THROW_MOTION[position];
  const betThrowTransition = shouldReduceMotion
    ? REDUCED_BET_THROW_TRANSITION
    : BET_THROW_TRANSITION;
  const potDisplay = (
    <div className="flex flex-col items-center gap-1 text-center leading-none">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e8dcc0]/55">
        Pot
      </div>
      <div
        id="pot-amount"
        className="mt-1 font-serif text-[36px] font-semibold leading-none text-[#d4af37] motion-safe:animate-[pot-pop_0.8s_cubic-bezier(0.34,1.56,0.64,1)_both]"
      >
        ${pot}
      </div>
      <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#e8dcc0]/50">
        Worth {(pot / 20).toFixed(1)}x BB
      </div>
    </div>
  );

  return (
    <div
      className={
        variant === "mobile"
          ? "relative h-[min(210px,53vw)] w-[min(304px,calc(100vw-5.25rem))] rounded-[50%] border-[4px] border-[#3a2815] bg-[radial-gradient(ellipse_at_center,#174b34_0%,#0e3a27_58%,#062415_100%)] shadow-[inset_0_0_42px_rgba(0,0,0,0.62),0_10px_28px_rgba(0,0,0,0.42)] xs:h-[min(226px,51vw)] xs:w-[min(326px,calc(100vw-4.75rem))] sm:h-[min(242px,43vw)] sm:w-[min(356px,calc(100vw-3.5rem))]"
          : "relative h-[min(400px,52vw)] w-[min(760px,calc(100vw-2rem))] max-w-[760px] rounded-[50%] border-4 border-[#3a2815] bg-[radial-gradient(ellipse_at_center,#1a4a35_0%,#0e3422_60%,#08291b_100%)] shadow-[inset_0_0_60px_rgba(0,0,0,0.6),0_12px_40px_rgba(0,0,0,0.5)] sm:h-[min(400px,48vw)]"
      }
    >
      <div
        className={
          variant === "mobile"
            ? "absolute inset-[12px] rounded-[50%] border-2 border-[#d4af37]/18"
            : "absolute inset-[14px] rounded-[50%] border border-[#d4af37]/25"
        }
      />

      <div className="pointer-events-none absolute inset-2 rounded-[50%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(212,175,55,0.25)_30deg,transparent_60deg,transparent_360deg)] [mask:radial-gradient(circle,transparent_65%,#000_67%,#000_71%,transparent_73%)] motion-safe:animate-[felt-sweep_9s_linear_infinite]" />
      <TooltipProvider delay={0}>
        <AnimatePresence initial={false}>
          {opponentBets.map((bet) => (
            <motion.div
              key={`${bet.id}-${bet.amount}`}
              initial={getBetThrowMotion(bet.position).initial}
              animate={getBetThrowMotion(bet.position).animate}
              exit={getBetThrowMotion(bet.position).exit}
              transition={betThrowTransition}
              className={`absolute ${betPositionClass[bet.position]} z-30`}
            >
              <WagerChip amount={bet.amount} ownerName={bet.ownerName} />
            </motion.div>
          ))}

          {bottomBet > 0 && (
            <motion.div
              key={`bottom-${bottomBet}`}
              initial={getBetThrowMotion("bottom").initial}
              animate={getBetThrowMotion("bottom").animate}
              exit={getBetThrowMotion("bottom").exit}
              transition={betThrowTransition}
              className={`absolute ${betPositionClass.bottom} z-50`}
            >
              <WagerChip amount={bottomBet} ownerName={bottomBetOwnerName} />
            </motion.div>
          )}
        </AnimatePresence>
      </TooltipProvider>

      {!showCenterPot ? null : (
        <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div
            className={
              variant === "mobile"
                ? "[&_div:first-child]:text-[10px] [&_div:first-child]:tracking-[0.3em] [&_div:nth-child(2)]:text-[20px] [&_div:nth-child(3)]:hidden"
                : ""
            }
          >
            {potDisplay}
          </div>
        </div>
      )}
    </div>
  );
}
