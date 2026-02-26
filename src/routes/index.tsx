import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { PokerTable } from '@/components/PokerTable'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const navigate = useNavigate()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const convexAuthUser = useQuery(api.auth.getCurrentUser)
  const rooms = useQuery(api.rooms.listRooms)
  const ensureSeedRooms = useMutation(api.rooms.ensureSeedRooms)
  const joinRoom = useMutation(api.rooms.joinRoom)
  const seededRef = useRef(false)
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null)
  const [joinMessage, setJoinMessage] = useState<string | null>(null)

  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    void ensureSeedRooms({})
  }, [ensureSeedRooms])

  const handleJoinRoom = async (roomCode: string) => {
    if (!session?.user) {
      await navigate({ to: '/login' })
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

    const displayName = session.user.name?.trim() || session.user.email || 'Player'
    setJoiningRoomCode(roomCode)
    setJoinMessage(null)

    try {
      const result = await joinRoom({ code: roomCode, name: displayName })
      await navigate({ to: '/rooms/$code', params: { code: result.code } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join room.'
      setJoinMessage(message)
    } finally {
      setJoiningRoomCode(null)
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#252525] px-8 py-12 text-white">
      <div className="w-full max-w-[1200px]">
        {joinMessage ? <p className="mb-5 text-center text-sm text-cyan-300">{joinMessage}</p> : null}
        {rooms === undefined ? (
          <p className="text-center text-sm text-slate-300">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <p className="text-center text-sm text-slate-300">No rooms yet.</p>
        ) : (
          <ul className="grid w-full grid-cols-1 justify-items-center gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => {
              const disabled =
                joiningRoomCode === room.code ||
                isSessionPending ||
                !session?.user ||
                convexAuthUser === undefined ||
                !convexAuthUser

              return (
                <li key={room._id} className="flex w-[360px] flex-col items-center justify-center gap-4">
                  <PokerTable
                    variant="roomCard"
                    disabled={disabled}
                    onClick={() => void handleJoinRoom(room.code)}
                  >
                    {joiningRoomCode === room.code ? '...' : `${room.activePlayers}/${room.maxPlayers}`}
                  </PokerTable>
                  <p className="text-center text-sm font-medium tracking-wide text-slate-200">
                    Room ID: {room.code}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
