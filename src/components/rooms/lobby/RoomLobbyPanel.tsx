import { ShowdownResultsPanel } from "./ShowdownResultsPanel";
import { useRoomPageContext } from "../context/RoomPageContext";

export function RoomLobbyPanel() {
  const { state, actions, meta } = useRoomPageContext();
  const {
    roomData,
    game,
    playerHands,
    showdownResults,
    playerId,
    myPlayerReady,
    leaveMessage,
    gameMessage,
    isTogglingReady,
    isBetting,
    isMyTurn,
    canCheck,
    canCall,
    canRaise,
    callAmount,
    effectiveNextRaiseLevel,
    hasDevTools,
    isDevRejoining,
    isDevFillingBots,
  } = state;
  const {
    toggleReady,
    check,
    call,
    raise,
    fold,
    devRejoinRoom,
    devFillRoomWithBots,
  } = actions;
  const { getPlayerName } = meta;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 py-12">
      <div className="mx-auto rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        {leaveMessage ? (
          <p className="mb-4 text-sm text-rose-300">{leaveMessage}</p>
        ) : null}

        {roomData === null ? (
          <p className="text-sm text-rose-300">Room not found.</p>
        ) : null}

        {roomData ? (
          <div className="space-y-6">
            <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Players</h2>
              {roomData.members.length === 0 ? (
                <p className="text-sm text-slate-400">No members joined yet.</p>
              ) : (
                <div className="space-y-2">
                  {roomData.members.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between rounded-md bg-slate-800/50 p-3"
                    >
                      <div className="text-sm font-medium text-white">
                        {member.name}
                        {member.isHost ? (
                          <span className="ml-2 rounded-md bg-amber-600 px-2 py-0.5 text-xs text-white">
                            Host
                          </span>
                        ) : null}
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          member.readyStatus
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-600 text-slate-300"
                        }`}
                      >
                        {member.readyStatus ? "Ready" : "Not Ready"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {hasDevTools ? (
              <section className="rounded-lg border border-cyan-700 bg-cyan-950/20 p-4">
                <h2 className="mb-3 text-lg font-semibold text-white">
                  Development
                </h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void devRejoinRoom?.();
                    }}
                    disabled={isDevRejoining}
                    className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {isDevRejoining ? "Rejoining..." : "Rejoin this room"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void devFillRoomWithBots?.();
                    }}
                    disabled={
                      isDevFillingBots ||
                      !roomData ||
                      roomData.members.length >= 3
                    }
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {isDevFillingBots
                      ? "Adding AI bots..."
                      : "Add 2 AI bots 🤖"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  Rejoin reactivates your player in this room. AI bots fill open
                  seats with intelligent betting and word-building.
                </p>
              </section>
            ) : null}

            <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Game (MVP)</h2>
                <span className="text-xs text-slate-400">
                  Room ID: {roomData.room._id}
                </span>
              </div>

              {!game ? (
                <p className="mb-3 text-sm text-slate-300">
                  No game has been created for this room.
                </p>
              ) : null}

              {game ? (
                <>
                  {!playerHands ? (
                    <p className="text-sm text-slate-400">Loading hands...</p>
                  ) : null}
                  {playerHands && playerHands.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No hands dealt yet. Start the game to distribute letters.
                    </p>
                  ) : null}

                  {showdownResults ? (
                    <ShowdownResultsPanel
                      showdownResults={showdownResults}
                      playerId={playerId}
                      getPlayerName={getPlayerName}
                    />
                  ) : null}
                </>
              ) : null}

              {gameMessage ? (
                <p className="mb-3 text-sm text-cyan-300">{gameMessage}</p>
              ) : null}

              <div className="space-y-3">
                {game?.status === "waiting" && roomData.members ? (
                  roomData.members.every((member) => member.readyStatus) ? (
                    <div
                      className="rounded-lg border border-transparent"
                      style={{
                        background:
                          "linear-gradient(145deg,rgba(16,185,129,0.15),rgba(5,150,105,0.25)) padding-box, conic-gradient(from var(--border-angle), theme(colors.emerald.600/.48) 80%, theme(colors.emerald.500) 86%, theme(colors.emerald.300) 90%, theme(colors.emerald.500) 94%, theme(colors.emerald.600/.48)) border-box",
                        animation: "border 4s linear infinite",
                      }}
                    >
                      <div className="rounded-lg bg-emerald-500/5 p-3">
                        <p className="mb-2 text-sm font-semibold text-emerald-300">
                          All players ready! Starting...
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void toggleReady();
                          }}
                          disabled={isTogglingReady}
                          className="rounded-md bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                        >
                          {isTogglingReady ? "..." : "Not Ready"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-500 bg-emerald-500/5 p-3">
                      <p className="mb-2 text-sm text-slate-300">
                        {`Waiting for players... (${roomData.members.filter((member) => member.readyStatus).length}/${roomData.members.length} ready)`}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          void toggleReady();
                        }}
                        disabled={isTogglingReady}
                        className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-600 ${
                          myPlayerReady
                            ? "bg-slate-600 hover:bg-slate-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {isTogglingReady
                          ? "..."
                          : myPlayerReady
                            ? "Not Ready"
                            : "I'm Ready!"}
                      </button>
                    </div>
                  )
                ) : null}

                {game?.status === "active" &&
                game.stage !== "final" &&
                game.stage !== "showdown" &&
                isMyTurn ? (
                  <div className="rounded-lg border border-amber-500 bg-amber-500/5 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
                      Betting Actions
                    </p>
                    <p className="mb-2 text-xs text-slate-300">
                      Next Raise:{" "}
                      <span className="text-cyan-300">
                        {effectiveNextRaiseLevel !== undefined
                          ? `${effectiveNextRaiseLevel} chips`
                          : "Max level reached"}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {canCheck ? (
                        <button
                          type="button"
                          onClick={() => {
                            void check();
                          }}
                          disabled={isBetting}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                        >
                          {isBetting ? "Betting..." : "Check"}
                        </button>
                      ) : null}
                      {canCall ? (
                        <button
                          type="button"
                          onClick={() => {
                            void call();
                          }}
                          disabled={isBetting}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                        >
                          {isBetting ? "Betting..." : `Match ${callAmount}`}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          void raise();
                        }}
                        disabled={isBetting || !canRaise}
                        className="rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                      >
                        {isBetting
                          ? "Betting..."
                          : effectiveNextRaiseLevel !== undefined
                            ? `Raise to ${effectiveNextRaiseLevel}`
                            : "Raise Maxed"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void fold();
                        }}
                        disabled={isBetting}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                      >
                        {isBetting ? "Betting..." : "Fold"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
