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
  phase: _phase,
  roomCode: _roomCode,
  raisesThisRound: _raisesThisRound,
  maxRaisesPerRound: _maxRaisesPerRound,
  anteAmount: _anteAmount,
  actionMessage: _actionMessage,
  pot: _pot,
  onLeaveRoom: _onLeaveRoom,
}: RoomBoardHeaderProps) {
  return null;
}
