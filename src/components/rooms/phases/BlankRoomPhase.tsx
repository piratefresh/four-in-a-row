import {
  PHASE_BADGE_OPPONENT_POSITION_CLASS,
  PhasePlayerBadge,
} from "./PhasePlayerBadge";
import { RoomTable } from "../board/RoomTable";

const HIDDEN_BET_POSITION_CLASS = {
  top: "",
  left: "",
  right: "",
  bottom: "",
} as const;

type BlankRoomPhasePlayer = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  chips: number;
  bet?: number;
  position: "top" | "left" | "right";
};

type BlankRoomPhaseProps = {
  opponents: BlankRoomPhasePlayer[];
  bottomPlayer: {
    name: string;
    avatarUrl?: string | null;
    chips: number;
    bet?: number;
  };
};

export function BlankRoomPhase({
  opponents,
  bottomPlayer,
}: BlankRoomPhaseProps) {
  return (
    <div className="relative z-10 flex items-center justify-center px-4">
      <div className="relative flex min-h-[420px] min-w-[360px] items-center justify-center">
        <RoomTable
          isPhase1={false}
          pot={0}
          communityTiles={[]}
          opponentBets={[]}
          bottomBet={0}
          betPositionClass={HIDDEN_BET_POSITION_CLASS}
          showCenterPot={false}
        />

        {opponents.map((opponent) => (
          <div
            key={opponent.id}
            className={`absolute ${PHASE_BADGE_OPPONENT_POSITION_CLASS[opponent.position]} z-20`}
          >
            <PhasePlayerBadge
              name={opponent.name}
              avatarUrl={opponent.avatarUrl}
              chips={opponent.chips}
              bet={opponent.bet}
              avatarSizeClass="h-12 w-12 sm:h-14 sm:w-14"
              initialsClass="text-[10px] sm:text-[12px]"
              infoCardClassName="min-w-[102px] px-2.5 py-1 sm:min-w-[118px] sm:px-3 sm:py-1.5"
            />
          </div>
        ))}

        <div className="absolute bottom-[11%] left-1/2 z-30 -translate-x-1/2 translate-y-1/4 sm:bottom-[12%]">
          <PhasePlayerBadge
            name={bottomPlayer.name}
            avatarUrl={bottomPlayer.avatarUrl}
            chips={bottomPlayer.chips}
            bet={bottomPlayer.bet}
            isCurrentPlayer
            avatarSizeClass="h-20 w-20 sm:h-24 sm:w-24"
            initialsClass="text-[16px] sm:text-[18px]"
            infoCardClassName="min-w-[112px] px-3 py-1.5 sm:min-w-[132px] sm:px-4 sm:py-2"
            betClassName="left-auto right-0 translate-x-1/4"
          />
        </div>
      </div>
    </div>
  );
}
