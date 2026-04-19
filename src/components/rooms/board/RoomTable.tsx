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
};

type RoomTableProps = {
  isPhase1: boolean;
  pot: number;
  communityTiles: TableTile[];
  opponentBets: PositionedBet[];
  bottomBet: number;
  betPositionClass: Record<TableBetPosition, string>;
  showCenterPot?: boolean;
};

export function RoomTable({
  isPhase1,
  pot,
  communityTiles: _communityTiles,
  opponentBets,
  bottomBet,
  betPositionClass,
  showCenterPot = true,
}: RoomTableProps) {
  const potDisplay = (
    <div className="flex flex-col items-center gap-1 text-center leading-none">
      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d7c48e]/75 sm:text-xs">
        Pot
      </div>
      <div className="text-[30px] font-semibold text-[#f4d37a] sm:text-[38px]">
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
      className="h-[460px] w-[340px] max-w-none"
      shellInsetClassName="inset-0"
    >
      {!showCenterPot ? null : isPhase1 ? (
        <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          {potDisplay}
        </div>
      ) : (
        <>
          {opponentBets.map((bet) => (
            <div
              key={bet.id}
              className={`absolute ${betPositionClass[bet.position]} z-30`}
            >
              <PokerChip amount={bet.amount} label="BET" size="sm" />
            </div>
          ))}

          {bottomBet > 0 && (
            <div className={`absolute ${betPositionClass.bottom} z-30`}>
              <PokerChip amount={bottomBet} label="BET" size="sm" />
            </div>
          )}

          <div className="absolute left-1/2 top-1/2 z-20 flex w-full max-w-[96%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 sm:max-w-[70%] sm:gap-5">
            {potDisplay}
          </div>
        </>
      )}
    </PokerTable>
  );
}
