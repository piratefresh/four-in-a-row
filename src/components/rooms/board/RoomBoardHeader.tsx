type RoomBoardHeaderProps = {
  phase:
    | "phase0"
    | "preflop"
    | "flop"
    | "turn"
    | "river"
    | "final"
    | "showdown";
  roomCode?: string;
  raisesThisRound: number;
  maxRaisesPerRound: number;
  anteAmount: number;
  actionMessage?: string;
  pot: number;
  onLeaveRoom?: () => void;
};

export function RoomBoardHeader({
  phase,
  roomCode,
  raisesThisRound,
  maxRaisesPerRound,
  anteAmount,
  actionMessage,
  pot,
  onLeaveRoom,
}: RoomBoardHeaderProps) {
  const phaseTitle =
    phase === "phase0"
      ? "PHASE 0: ROOM SETUP"
      : phase === "preflop"
        ? "PHASE 1: PRE-FLOP"
        : phase === "flop"
          ? "PHASE 2: FLOP"
          : phase === "turn"
            ? "PHASE 3: TURN"
            : phase === "river"
              ? "PHASE 4: RIVER"
              : phase === "final"
                ? "PHASE 5: FINAL"
                : "PHASE 6: SHOWDOWN";

  if (phase === "phase0") {
    return (
      <div className="flex-none px-8 pb-2 pt-4 text-left sm:px-16">
        <h1 className="text-[16px] font-normal uppercase tracking-wider text-white sm:text-[20px]">
          {phaseTitle}
        </h1>
      </div>
    );
  }

  if (phase === "preflop") {
    return (
      <div className="flex-none px-8 pb-2 pt-4 text-left sm:px-16">
        <h1 className="text-[16px] font-normal uppercase tracking-wider text-white sm:text-[20px]">
          {phaseTitle}
        </h1>
      </div>
    );
  }

  if (phase === "flop") {
    return (
      <div className="flex-none px-8 pb-2 pt-4 text-left sm:px-16">
        <h1 className="text-[16px] font-normal uppercase tracking-wider text-white sm:text-[20px]">
          {phaseTitle}
        </h1>
      </div>
    );
  }

  return (
    <>
      <div className="flex-none px-8 pb-2 pt-4 text-left sm:px-16">
        <h1 className="text-[16px] font-normal uppercase tracking-wider text-white sm:text-[20px]">
          {phaseTitle}
        </h1>
      </div>
      {/* <div className="absolute left-2 top-2 z-20 max-w-[62vw] space-y-1 text-[14px] leading-none sm:left-5 sm:top-4 sm:max-w-none sm:space-y-2 sm:text-[36px]">
        <p>Room {roomCode ?? ""}</p>
        <p>{phaseTitle}</p>
        <p className="text-[12px] sm:text-[36px]">
          Raises: {raisesThisRound}/{maxRaisesPerRound}
        </p>
        <p className="text-[12px] text-[#d9d0bf] sm:text-[32px]">
          Ante: ${anteAmount}
        </p>
        {actionMessage && (
          <p className="text-[12px] text-[#d9d0bf] sm:text-[28px]">
            {actionMessage}
          </p>
        )}
        {onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="mt-2 min-h-[40px] rounded-md bg-rose-600 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-rose-700 sm:mt-4 sm:min-h-0 sm:px-4 sm:py-2 sm:text-[20px]"
          >
            Leave
          </button>
        )}
      </div>

      <div className="absolute right-2 top-2 z-20 text-right leading-none sm:right-8 sm:top-4">
        <div className="text-[22px] sm:text-[64px]">${pot}</div>
        <div className="text-[18px] sm:text-[58px]">Pot</div>
      </div> */}
    </>
  );
}
