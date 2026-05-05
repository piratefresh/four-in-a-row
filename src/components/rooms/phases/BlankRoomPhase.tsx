import { PhasePlayerBadge } from "./PhasePlayerBadge";
import {
  ROOM_BOTTOM_BADGE_POSITION_CLASS,
  ROOM_OPPONENT_POSITION_CLASS,
} from "../board/roomBoardLayout";
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
    <div className="relative z-10 flex items-center justify-center px-2 xs:px-4">
      <div className="relative flex items-center justify-center">
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
            className={`absolute ${ROOM_OPPONENT_POSITION_CLASS[opponent.position]} z-20`}
          >
            <PhasePlayerBadge
              name={opponent.name}
              avatarUrl={opponent.avatarUrl}
              chips={opponent.chips}
              bet={opponent.bet}
              avatarSizeClass="h-9 w-9 xs:h-10 xs:w-10 sm:h-14 sm:w-14"
              initialsClass="text-[8px] xs:text-[9px] sm:text-[12px]"
              infoCardClassName="min-w-[82px] px-1.5 py-1 xs:min-w-[92px] xs:px-2 sm:min-w-[118px] sm:px-3 sm:py-1.5"
              infoLayout="compact"
            />
          </div>
        ))}

        <div className={ROOM_BOTTOM_BADGE_POSITION_CLASS}>
          <PhasePlayerBadge
            name={bottomPlayer.name}
            avatarUrl={bottomPlayer.avatarUrl}
            chips={bottomPlayer.chips}
            bet={bottomPlayer.bet}
            isCurrentPlayer
            avatarSizeClass="h-9 w-9 xs:h-10 xs:w-10 sm:h-14 sm:w-14"
            initialsClass="text-[8px] xs:text-[9px] sm:text-[12px]"
            infoCardClassName="min-w-[84px] px-2 py-1 xs:min-w-[92px] xs:px-2 xs:py-1 sm:min-w-[132px] sm:px-4 sm:py-2"
            betClassName="left-auto right-0 translate-x-1/4"
            mobileInfoPlacement="top"
            infoLayout="compact"
          />
        </div>
      </div>
    </div>
  );
}
