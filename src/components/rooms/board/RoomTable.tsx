import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PokerChip } from "../table/PokerChip";
import type { PokerChipTone } from "../table/PokerChip";
import { PokerTable } from "../table/PokerTable";

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

function getWagerChipTone(amount: number): PokerChipTone {
  if (amount >= 500) return "purple";
  if (amount >= 100) return "blue";
  if (amount >= 50) return "black";
  if (amount >= 25) return "green";
  return "red";
}

type WagerChipProps = {
  amount: number;
  ownerName: string;
};

function WagerChip({ amount, ownerName }: WagerChipProps) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const tooltipLabel = formatWagerOwnerLabel(ownerName);
  const tone = getWagerChipTone(amount);

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
        <PokerChip amount={amount} label="BET" size="sm" tone={tone} />
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
  isPhase1,
  pot,
  communityTiles: _communityTiles,
  opponentBets,
  bottomBet,
  bottomBetOwnerName = "You",
  betPositionClass,
  showCenterPot = true,
}: RoomTableProps) {
  const shouldReduceMotion = useReducedMotion();
  const getBetThrowMotion = (position: TableBetPosition) =>
    shouldReduceMotion ? REDUCED_BET_THROW_MOTION : BET_THROW_MOTION[position];
  const betThrowTransition = shouldReduceMotion
    ? REDUCED_BET_THROW_TRANSITION
    : BET_THROW_TRANSITION;
  const potDisplay = (
    <div className="flex flex-col items-center gap-1 text-center leading-none">
      <div className="font-semibold uppercase tracking-[0.2em] text-[#d7c48e]/75 xs:text-[9px] sm:text-xs">
        Pot
      </div>
      <div
        id="pot-amount"
        className="text-[18px] font-semibold text-[#f4d37a] xs:text-[22px] sm:text-[38px]"
      >
        ${pot}
      </div>
    </div>
  );

  return (
    <PokerTable
      maxPlayers={4}
      players={[]}
      showSeats={false}
      centerLabel=""
      size="responsive"
      shellInsetClassName="inset-0"
    >
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
              className={`absolute ${betPositionClass.bottom} z-30`}
            >
              <WagerChip amount={bottomBet} ownerName={bottomBetOwnerName} />
            </motion.div>
          )}
        </AnimatePresence>
      </TooltipProvider>

      {!showCenterPot ? null : (
        <div
          className={`absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${
            isPhase1
              ? "gap-2"
              : "w-full max-w-[96%] gap-1 sm:max-w-[70%] sm:gap-5"
          }`}
        >
          {potDisplay}
        </div>
      )}
    </PokerTable>
  );
}
