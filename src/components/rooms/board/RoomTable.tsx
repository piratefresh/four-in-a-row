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
};

export function RoomTable({
  isPhase1,
  pot,
  communityTiles: _communityTiles,
  opponentBets,
  bottomBet,
  betPositionClass,
}: RoomTableProps) {
  return (
    <div className="relative h-[300px] w-[180px] sm:h-[370px] sm:w-[224px] rounded-[60px] sm:rounded-[90px] border-[12px] sm:border-[14px] border-[#181a1f] bg-[#c0c0c0] shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]">
      {isPhase1 ? (
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          <div className="text-[16px] font-semibold text-[#1a1a1a] sm:text-[20px]">
            ${pot}
          </div>
          <div className="text-[12px] text-[#4a4a4a] sm:text-[16px]">
            The pot
          </div>
        </div>
      ) : (
        <>
          {opponentBets.map((bet) => (
            <div
              key={bet.id}
              className={`absolute ${betPositionClass[bet.position]} z-20`}
            >
              <div className="text-center leading-none">
                <div className="text-[18px] text-[#f1eee7] sm:text-[48px]">
                  ${bet.amount}
                </div>
                <div className="text-[12px] text-[#d9d0bf] sm:text-[32px]">
                  Bet
                </div>
              </div>
            </div>
          ))}

          {bottomBet > 0 && (
            <div className={`absolute ${betPositionClass.bottom} z-20`}>
              <div className="text-center leading-none">
                <div className="text-[18px] text-[#f1eee7] sm:text-[48px]">
                  ${bottomBet}
                </div>
                <div className="text-[12px] text-[#d9d0bf] sm:text-[32px]">
                  Bet
                </div>
              </div>
            </div>
          )}

          <div className="absolute left-1/2 top-1/2 flex w-full max-w-[96%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 sm:max-w-[70%] sm:gap-5">
            <div className="text-[16px] font-semibold text-[#1a1a1a] sm:text-[20px]">
              ${pot}
            </div>
            <div className="text-[12px] text-[#4a4a4a] sm:text-[16px]">
              The pot
            </div>
          </div>
        </>
      )}
    </div>
  );
}
