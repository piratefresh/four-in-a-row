import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PokerChip } from "../table/PokerChip";
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
      opacity: number;
      scale: number;
      rotate: number;
      x: number;
      y: number;
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
    initial: { opacity: 0, scale: 0.72, rotate: -20, x: -28, y: -34 },
    animate: { opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 },
    exit: { opacity: 0, scale: 0.8, rotate: 12, x: 18, y: 10 },
  },
  left: {
    initial: { opacity: 0, scale: 0.72, rotate: -24, x: -34, y: -10 },
    animate: { opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 },
    exit: { opacity: 0, scale: 0.8, rotate: -10, x: -18, y: 6 },
  },
  right: {
    initial: { opacity: 0, scale: 0.72, rotate: 24, x: 34, y: -10 },
    animate: { opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 },
    exit: { opacity: 0, scale: 0.8, rotate: 10, x: 18, y: 6 },
  },
  bottom: {
    initial: { opacity: 0, scale: 0.72, rotate: 18, x: -26, y: 32 },
    animate: { opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 },
    exit: { opacity: 0, scale: 0.8, rotate: -12, x: 16, y: 18 },
  },
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
        <PokerChip amount={amount} label="BET" size="sm" />
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
  const potDisplay = (
    <div className="flex flex-col items-center gap-1 text-center leading-none">
      <div className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#d7c48e]/75 xs:text-[9px] sm:text-xs">
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
              initial={BET_THROW_MOTION[bet.position].initial}
              animate={BET_THROW_MOTION[bet.position].animate}
              exit={BET_THROW_MOTION[bet.position].exit}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 22,
                mass: 0.75,
              }}
              className={`absolute ${betPositionClass[bet.position]} z-30`}
            >
              <WagerChip amount={bet.amount} ownerName={bet.ownerName} />
            </motion.div>
          ))}

          {bottomBet > 0 && (
            <motion.div
              key={`bottom-${bottomBet}`}
              initial={BET_THROW_MOTION.bottom.initial}
              animate={BET_THROW_MOTION.bottom.animate}
              exit={BET_THROW_MOTION.bottom.exit}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 22,
                mass: 0.75,
              }}
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
