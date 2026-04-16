import {
  PHASE_BADGE_OPPONENT_POSITION_CLASS,
  PhasePlayerBadge,
} from "./PhasePlayerBadge";

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
    <div className="absolute inset-0">
      <div className="absolute left-1/2 top-[42%] h-[370px] w-[224px] -translate-x-1/2 -translate-y-1/2 rounded-[90px] border-[14px] border-[#181a1f] bg-[#c0c0c0] shadow-[inset_0_0_40px_rgba(0,0,0,0.35)] sm:top-[45%] [@media(max-height:460px)]:top-[38%]" />
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
      <div className="absolute bottom-[calc(18%+2.25rem)] left-1/2 z-30 -translate-x-1/2">
        <PhasePlayerBadge
          name={bottomPlayer.name}
          avatarUrl={bottomPlayer.avatarUrl}
          chips={bottomPlayer.chips}
          bet={bottomPlayer.bet}
          avatarSizeClass="h-20 w-20 sm:h-24 sm:w-24"
          initialsClass="text-[16px] sm:text-[18px]"
          infoCardClassName="min-w-[112px] px-3 py-1.5 sm:min-w-[132px] sm:px-4 sm:py-2"
          betClassName="left-auto right-0 translate-x-1/4"
        />
      </div>
    </div>
  );
}
