import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { RoomDrawer } from '@/components/RoomDrawer'

export const Route = createFileRoute('/')({ component: App })

interface StatCardProps {
  title: string
  subtitle: string
}

function StatCard({ title, subtitle }: StatCardProps) {
  return (
    <div className="rounded-lg bg-[#252525] p-4">
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const convexAuthUser = useQuery(api.auth.getCurrentUser)
  const rooms = useQuery(api.rooms.listRooms)
  const stats = useQuery(api.stats.getAllTimeStats)
  const ensureSeedRooms = useMutation(api.rooms.ensureSeedRooms)
  const joinRoom = useMutation(api.rooms.joinRoom)
  const debugRejoinRoom = useMutation(api.rooms.debugRejoinRoom)
  const debugFillRoomWithBots = useMutation(api.rooms.debugFillRoomWithBots)
  const seededRef = useRef(false)
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null)
  const [joinMessage, setJoinMessage] = useState<string | null>(null)
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null)
  const [isDevRejoining, setIsDevRejoining] = useState(false)
  const [isDevAddingBots, setIsDevAddingBots] = useState(false)

  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    void ensureSeedRooms({})
  }, [ensureSeedRooms])

  const handleOpenDrawer = (roomCode: string) => {
    if (!session?.user) {
      void navigate({ to: '/login' })
      return
    }

    if (convexAuthUser === undefined) {
      setJoinMessage('Checking authentication, please try again in a moment.')
      return
    }

    if (!convexAuthUser) {
      setJoinMessage('Convex auth is not ready. Please sign out and sign back in.')
      return
    }

    setSelectedRoomCode(roomCode)
  }

  const handleJoinSeat = async (seatIndex: number) => {
    if (!selectedRoomCode || !session?.user) return

    const displayName = session.user.name?.trim() || session.user.email || 'Player'
    setJoiningRoomCode(selectedRoomCode)
    setJoinMessage(null)

    try {
      const result = await joinRoom({ code: selectedRoomCode, name: displayName })
      await navigate({ to: '/rooms/$code', params: { code: result.code } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join room.'
      setJoinMessage(message)
    } finally {
      setJoiningRoomCode(null)
    }
  }

  const handleDevRejoin = async () => {
    if (!import.meta.env.DEV || !selectedRoomCode || !session?.user) return

    const displayName = session.user.name?.trim() || session.user.email || 'Dev Player'
    setIsDevRejoining(true)
    setJoinMessage(null)

    try {
      const result = await debugRejoinRoom({ code: selectedRoomCode, name: displayName })
      await navigate({ to: '/rooms/$code', params: { code: result.code } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rejoin room.'
      setJoinMessage(message)
    } finally {
      setIsDevRejoining(false)
    }
  }

  const handleDevAddBots = async () => {
    if (!import.meta.env.DEV || !selectedRoomCode) return

    setIsDevAddingBots(true)
    setJoinMessage(null)

    try {
      const result = await debugFillRoomWithBots({ code: selectedRoomCode, count: 2 })
      setJoinMessage(
        result.added > 0
          ? `Added ${result.added} test player${result.added === 1 ? '' : 's'}.`
          : 'No open seats available for test players.',
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add test players.'
      setJoinMessage(message)
    } finally {
      setIsDevAddingBots(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#1a1a1a] px-4 py-6 text-white">
      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard
          title={stats?.longestWord || 'Loading...'}
          subtitle="Longest word"
        />
        <StatCard
          title={stats?.biggestWinner || 'Loading...'}
          subtitle="Biggest winner"
        />
        <StatCard
          title={stats?.highestScoringWord || 'Loading...'}
          subtitle={`Most valuable (${stats?.highestWordScore || 0} pts)`}
        />
      </div>

      {/* Error/Info Message */}
      {joinMessage && (
        <div className="mb-4 rounded-lg bg-cyan-900/30 p-3 text-center text-sm text-cyan-300">
          {joinMessage}
        </div>
      )}

      {/* Games List Header */}
      <div className="mb-3 text-lg font-semibold">Active Games</div>

      {/* Games Table */}
      {rooms === undefined ? (
        <div className="py-8 text-center text-sm text-slate-400">Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">No active games yet.</div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-[#252525]">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-700 px-4 py-3 text-sm font-medium text-slate-300">
            <div>Game</div>
            <div className="text-right">Players</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-800">
            {rooms.map((room) => {
              const disabled =
                joiningRoomCode === room.code ||
                isSessionPending ||
                !session?.user ||
                convexAuthUser === undefined ||
                !convexAuthUser ||
                room.activePlayers >= room.maxPlayers

              const isJoining = joiningRoomCode === room.code
              const isFull = room.activePlayers >= room.maxPlayers

              return (
                <button
                  key={room._id}
                  onClick={() => handleOpenDrawer(room.code)}
                  disabled={disabled}
                  className="grid w-full grid-cols-[1fr_auto] gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-800/50 active:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div>
                    <div className="font-medium text-white">
                      {isJoining && joiningRoomCode === room.code ? 'Joining...' : `Poker game ${room.code}`}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {isFull ? 'Room full' : 'Tap to join'}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="rounded-full bg-slate-700 px-3 py-1 text-sm font-medium">
                      {room.activePlayers}/{room.maxPlayers}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer spacer */}
      <div className="h-8" />

      {/* Room Drawer */}
      <RoomDrawer
        roomCode={selectedRoomCode}
        onClose={() => setSelectedRoomCode(null)}
        onJoinSeat={handleJoinSeat}
        isJoining={joiningRoomCode !== null}
        onDevRejoin={handleDevRejoin}
        onDevAddBots={handleDevAddBots}
        isDevRejoining={isDevRejoining}
        isDevAddingBots={isDevAddingBots}
        showDevTools={import.meta.env.DEV}
      />
    </main>
  )
}
