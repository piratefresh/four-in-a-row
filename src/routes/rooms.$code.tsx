import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/rooms/$code')({
  component: RoomDetailsPage,
})

const PLAYER_TOKEN_STORAGE_KEY = 'fourinarow.playerToken'
const PLAYER_ROOM_CODE_STORAGE_KEY = 'fourinarow.roomCode'
const PLAYER_ID_STORAGE_KEY = 'fourinarow.playerId'
const HEARTBEAT_INTERVAL_MS = 30_000

function RoomDetailsPage() {
  const { code } = Route.useParams()
  const navigate = useNavigate()
  const roomData = useQuery(api.rooms.getRoomMembers, { code })
  const game = useQuery(api.games.getGameByRoom, {
    roomId: roomData?.room._id ?? '',
  })
  const playerHands = useQuery(
    api.games.getPlayerHands,
    game ? { gameId: game._id } : 'skip',
  )
  const leaveRoom = useMutation(api.rooms.leaveRoom)
  const heartbeat = useMutation(api.rooms.heartbeat)
  const createGameForRoom = useMutation(api.games.createGameForRoom)
  const startGame = useMutation(api.games.startGame)
  const advanceStage = useMutation(api.games.advanceStage)
  const check = useMutation((api as any).games.check)
  const call = useMutation((api as any).games.call)
  const raise = useMutation((api as any).games.raise)
  const fold = useMutation((api as any).games.fold)

  const [playerToken, setPlayerToken] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [joinedRoomCode, setJoinedRoomCode] = useState<string | null>(null)
  const [isLeavingRoom, setIsLeavingRoom] = useState(false)
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null)
  const [gameMessage, setGameMessage] = useState<string | null>(null)
  const [isCreatingGame, setIsCreatingGame] = useState(false)
  const [isStartingGame, setIsStartingGame] = useState(false)
  const [isAdvancingStage, setIsAdvancingStage] = useState(false)
  const [isBetting, setIsBetting] = useState(false)
  const [raiseAmount, setRaiseAmount] = useState('')

  // Calculate turn order and current player
  const turnOrderedHands = useMemo(
    () =>
      [...(playerHands ?? [])].sort((a, b) => {
        if (a.createdAt !== b.createdAt) {
          return a.createdAt - b.createdAt
        }
        return a.playerId.localeCompare(b.playerId)
      }),
    [playerHands],
  )

  const currentTurnPlayerId = useMemo(
    () =>
      game ? turnOrderedHands[game.currentPlayerIndex]?.playerId ?? null : null,
    [game, turnOrderedHands],
  )

  const myHand = useMemo(
    () =>
      playerId
        ? playerHands?.find((hand) => hand.playerId === playerId)
        : undefined,
    [playerId, playerHands],
  )

  const canCheck = useMemo(() => {
    if (!game || !myHand || currentTurnPlayerId !== playerId || game.status !== 'active') return false
    return game.currentBet === 0 || myHand.betThisRound === game.currentBet
  }, [game, myHand, currentTurnPlayerId, playerId])

  const canCall = useMemo(() => {
    if (!game || !myHand || currentTurnPlayerId !== playerId || game.status !== 'active') return false
    return game.currentBet > 0 && myHand.betThisRound < game.currentBet
  }, [game, myHand, currentTurnPlayerId, playerId])

  const callAmount = useMemo(() => {
    if (!game || !myHand) return 0
    return game.currentBet - myHand.betThisRound
  }, [game, myHand])

  const isMyTurn = currentTurnPlayerId === playerId && game?.status === 'active'

  useEffect(() => {
    if (typeof window === 'undefined') return
    setPlayerToken(window.localStorage.getItem(PLAYER_TOKEN_STORAGE_KEY))
    setPlayerId(window.localStorage.getItem(PLAYER_ID_STORAGE_KEY))
    setJoinedRoomCode(window.localStorage.getItem(PLAYER_ROOM_CODE_STORAGE_KEY))
  }, [])

  const canLeaveThisRoom =
    !!playerToken && !!joinedRoomCode && joinedRoomCode === code.toUpperCase()

  useEffect(() => {
    if (!playerToken || !canLeaveThisRoom) return

    const sendHeartbeat = async () => {
      try {
        const result = await heartbeat({ playerToken })
        const resolvedPlayerId = String(result.playerId)
        setPlayerId(resolvedPlayerId)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, resolvedPlayerId)
        }
      } catch {
        // Keep UI stable; leave/join flows will recover token issues.
      }
    }

    void sendHeartbeat()
    const intervalId = window.setInterval(() => {
      void sendHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [canLeaveThisRoom, heartbeat, playerToken])

  const handleLeaveRoom = async () => {
    if (!playerToken) {
      setLeaveMessage('No active room token found.')
      return
    }

    if (!canLeaveThisRoom) {
      setLeaveMessage('You are not currently joined in this room.')
      return
    }

    setIsLeavingRoom(true)
    setLeaveMessage(null)

    try {
      await leaveRoom({ playerToken })
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PLAYER_TOKEN_STORAGE_KEY)
        window.localStorage.removeItem(PLAYER_ROOM_CODE_STORAGE_KEY)
      }
      setPlayerToken(null)
      setJoinedRoomCode(null)
      await navigate({ to: '/' })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to leave room.'
      setLeaveMessage(message)
    } finally {
      setIsLeavingRoom(false)
    }
  }

  const handleCreateGame = async () => {
    if (!roomData) return
    setIsCreatingGame(true)
    setGameMessage(null)
    try {
      await createGameForRoom({ roomId: roomData.room._id })
      setGameMessage('Game created.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create game.'
      setGameMessage(message)
    } finally {
      setIsCreatingGame(false)
    }
  }

  const handleStartGame = async () => {
    if (!game?._id) return
    setIsStartingGame(true)
    setGameMessage(null)
    try {
      await startGame({ gameId: game._id })
      setGameMessage('Game started.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start game.'
      setGameMessage(message)
    } finally {
      setIsStartingGame(false)
    }
  }

  const handleAdvanceStage = async () => {
    if (!game?._id) return
    setIsAdvancingStage(true)
    setGameMessage(null)
    try {
      await advanceStage({ gameId: game._id })
      setGameMessage('Stage advanced.')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to advance stage.'
      setGameMessage(message)
    } finally {
      setIsAdvancingStage(false)
    }
  }

  const handleCheck = async () => {
    if (!game?._id || !playerId) return
    setIsBetting(true)
    setGameMessage(null)
    try {
      await check({ gameId: game._id, playerId })
      setGameMessage('Checked.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check.'
      setGameMessage(message)
    } finally {
      setIsBetting(false)
    }
  }

  const handleCall = async () => {
    if (!game?._id || !playerId) return
    setIsBetting(true)
    setGameMessage(null)
    try {
      await call({ gameId: game._id, playerId })
      setGameMessage(`Called ${callAmount} chips.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to call.'
      setGameMessage(message)
    } finally {
      setIsBetting(false)
    }
  }

  const handleRaise = async () => {
    if (!game?._id || !playerId) return
    const amount = parseInt(raiseAmount, 10)
    if (!Number.isFinite(amount) || amount <= (game.currentBet ?? 0)) {
      setGameMessage(
        `Raise amount must be greater than current bet of ${game.currentBet ?? 0}.`,
      )
      return
    }
    setIsBetting(true)
    setGameMessage(null)
    try {
      await raise({ gameId: game._id, playerId, raiseToAmount: amount })
      setGameMessage(`Raised to ${amount} chips.`)
      setRaiseAmount('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to raise.'
      setGameMessage(message)
    } finally {
      setIsBetting(false)
    }
  }

  const handleFold = async () => {
    if (!game?._id || !playerId) return
    setIsBetting(true)
    setGameMessage(null)
    try {
      await fold({ gameId: game._id, playerId })
      setGameMessage('Folded.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fold.'
      setGameMessage(message)
    } finally {
      setIsBetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Room {code}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleLeaveRoom()}
              disabled={!canLeaveThisRoom || isLeavingRoom}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {isLeavingRoom ? 'Leaving...' : 'Leave room'}
            </button>
            <Link
              to="/"
              className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
            >
              Back
            </Link>
          </div>
        </div>

        {leaveMessage && (
          <p className="mb-4 text-sm text-rose-300">{leaveMessage}</p>
        )}

        {roomData === undefined && (
          <p className="text-sm text-slate-300">Loading room...</p>
        )}

        {roomData === null && (
          <p className="text-sm text-rose-300">Room not found.</p>
        )}

        {roomData && (
          <div className="space-y-6">
            <div>
              <p className="mb-4 text-sm text-slate-300">
                Joined members: {roomData.members.length}/
                {roomData.room.maxPlayers}
              </p>
              {roomData.members.length === 0 && (
                <p className="text-sm text-slate-400">No members joined yet.</p>
              )}
              {roomData.members.length > 0 && (
                <ul className="space-y-3">
                  {roomData.members.map((member) => (
                    <li
                      key={member._id}
                      className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-cyan-300">
                          {member.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          Seat {member.seatIndex + 1}
                        </p>
                      </div>
                      {member.isHost && (
                        <span className="rounded bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-300">
                          Host
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Game (MVP)</h2>
                <span className="text-xs text-slate-400">
                  Room ID: {roomData.room._id}
                </span>
              </div>

              {!game && (
                <p className="mb-3 text-sm text-slate-300">
                  No game has been created for this room.
                </p>
              )}

              {game && (
                <>
                  <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                    <p className="text-slate-300">
                      Stage: <span className="text-cyan-300">{game.stage}</span>
                    </p>
                    <p className="text-slate-300">
                      Status: <span className="text-cyan-300">{game.status}</span>
                    </p>
                    <p className="text-slate-300">
                      Pot: <span className="text-cyan-300">{game.pot} chips</span>
                    </p>
                    <p className="text-slate-300">
                      Current Bet:{' '}
                      <span className="text-cyan-300">
                        {game.currentBet ?? 0} chips
                      </span>
                    </p>
                    {myHand && (
                      <>
                        <p className="text-slate-300">
                          Your Chips:{' '}
                          <span className="text-cyan-300">{myHand.chips} chips</span>
                        </p>
                        <p className="text-slate-300">
                          Your Bet This Round:{' '}
                          <span className="text-cyan-300">
                            {myHand.betThisRound} chips
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                  {isMyTurn && (
                    <div className="mb-3 rounded-md border border-amber-500 bg-amber-500/10 p-3">
                      <p className="text-sm font-semibold text-amber-300">
                        It's your turn!
                      </p>
                    </div>
                  )}
                  <div className="mb-3 rounded-md border border-slate-700 bg-slate-950/40 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                      Dealt Hands
                    </p>
                    {!playerHands && (
                      <p className="text-sm text-slate-400">Loading hands...</p>
                    )}
                    {playerHands && playerHands.length === 0 && (
                      <p className="text-sm text-slate-400">
                        No hands dealt yet. Start the game to distribute letters.
                      </p>
                    )}
                    {playerHands && playerHands.length > 0 && (
                      <ul className="space-y-2">
                        {playerHands.map((hand) => (
                          <li
                            key={hand._id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-300">
                              {hand.playerId === 'ai_dealer'
                                ? 'AI Dealer'
                                : hand.playerId}
                            </span>
                            <span className="text-cyan-300">
                              {hand.tiles
                                .map((tile) => `${tile.letter}(${tile.baseValue})`)
                                .join(' ')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {gameMessage && (
                <p className="mb-3 text-sm text-cyan-300">{gameMessage}</p>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCreateGame()}
                    disabled={!roomData || !!game || isCreatingGame}
                    className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {isCreatingGame ? 'Creating...' : 'Create game'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStartGame()}
                    disabled={!game || game.status !== 'waiting' || isStartingGame}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {isStartingGame ? 'Starting...' : 'Start game'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAdvanceStage()}
                    disabled={!game || game.status !== 'active' || isAdvancingStage}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                  >
                    {isAdvancingStage ? 'Advancing...' : 'Advance stage (Debug)'}
                  </button>
                </div>

                {game?.status === 'active' && isMyTurn && (
                  <div className="rounded-lg border border-amber-500 bg-amber-500/5 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
                      Betting Actions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {canCheck && (
                        <button
                          type="button"
                          onClick={() => void handleCheck()}
                          disabled={isBetting}
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                        >
                          {isBetting ? 'Betting...' : 'Check'}
                        </button>
                      )}
                      {canCall && (
                        <button
                          type="button"
                          onClick={() => void handleCall()}
                          disabled={isBetting}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                        >
                          {isBetting ? 'Betting...' : `Call ${callAmount}`}
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={raiseAmount}
                          onChange={(e) => setRaiseAmount(e.target.value)}
                          placeholder="Raise to..."
                          min={(game.currentBet ?? 0) + 1}
                          className="w-24 rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white"
                        />
                        <button
                          type="button"
                          onClick={() => void handleRaise()}
                          disabled={isBetting || !raiseAmount}
                          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                        >
                          {isBetting ? 'Betting...' : 'Raise'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleFold()}
                        disabled={isBetting}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                      >
                        {isBetting ? 'Betting...' : 'Fold'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
