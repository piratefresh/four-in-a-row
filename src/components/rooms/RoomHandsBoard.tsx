import { useEffect, useMemo, useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ScrabbleTile } from './ScrabbleTile'

type Tile = {
  letter: string
  baseValue: number
}

type PlayerHand = {
  _id: string
  playerId: string
  tiles: Tile[]
  bet?: number
}

type RoomHandsBoardProps = {
  gameId: Id<'games'>
  communityTiles: Tile[]
  hands: PlayerHand[]
  getPlayerName: (playerId: string, handIndex: number) => string
  bottomPlayerId?: string
}

type BuilderTile = {
  id: string
  letter: string
  baseValue: number
  source: 'hand' | 'community'
  disabled?: boolean
}

function getOpponentSeat(index: number, totalOpponents: number) {
  if (totalOpponents <= 1) {
    return { x: 50, y: 15 }
  }

  if (totalOpponents === 2) {
    return index === 0 ? { x: 10, y: 50 } : { x: 90, y: 50 }
  }

  if (totalOpponents === 3) {
    if (index === 0) return { x: 10, y: 50 }
    if (index === 1) return { x: 50, y: 15 }
    return { x: 90, y: 50 }
  }

  const t = index / (totalOpponents - 1)
  return {
    x: 10 + t * 80,
    y: 15 + Math.abs(t - 0.5) * 10,
  }
}

type SortableBuilderTileProps = {
  tile: BuilderTile
  onToggleDisabled: (id: string) => void
}

function sortDisabledToEnd(tiles: BuilderTile[]) {
  return [...tiles].sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled))
}

function SortableBuilderTile({ tile, onToggleDisabled }: SortableBuilderTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tile.id, disabled: tile.disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleDisabled(tile.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`touch-none select-none ${isDragging ? 'opacity-0' : ''} ${tile.disabled ? 'translate-y-2 opacity-50' : ''} transition-all`}
    >
      <div
        className={tile.disabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}
        onClick={handleClick}
        {...(!tile.disabled ? { ...attributes, ...listeners } : {})}
      >
        <ScrabbleTile
          letter={tile.letter}
          baseValue={tile.baseValue}
          showValue={tile.source === 'hand'}
          size="lg"
          variant={tile.source === 'community' ? 'community' : 'default'}
        />
      </div>
    </div>
  )
}

export function RoomHandsBoard({
  gameId,
  communityTiles,
  hands,
  getPlayerName,
  bottomPlayerId,
}: RoomHandsBoardProps) {
  const submitWord = useAction(api.games.submitWord)
  const [builderTiles, setBuilderTiles] = useState<BuilderTile[]>([])
  const [activeTile, setActiveTile] = useState<BuilderTile | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const bottomHand = useMemo(() => {
    if (bottomPlayerId) {
      return hands.find((hand) => hand.playerId === bottomPlayerId) ?? hands[0]
    }
    return hands[0]
  }, [bottomPlayerId, hands])

  const bottomHandIndex = useMemo(
    () => (bottomHand ? hands.findIndex((hand) => hand._id === bottomHand._id) : -1),
    [bottomHand, hands],
  )

  const opponents = useMemo(
    () => (bottomHand ? hands.filter((hand) => hand._id !== bottomHand._id) : []),
    [bottomHand, hands],
  )

  useEffect(() => {
    if (!bottomHand) {
      setBuilderTiles([])
      return
    }

    const nextTiles: BuilderTile[] = [
      ...bottomHand.tiles.map((tile, index) => ({
        id: `hand-${bottomHand._id}-${index}-${tile.letter}-${tile.baseValue}`,
        letter: tile.letter,
        baseValue: tile.baseValue,
        source: 'hand' as const,
        disabled: true,
      })),
      ...communityTiles.map((tile, index) => ({
        id: `community-${index}-${tile.letter}-${tile.baseValue}`,
        letter: tile.letter,
        baseValue: tile.baseValue,
        source: 'community' as const,
        disabled: true,
      })),
    ]

    setBuilderTiles((previous) => {
      const nextById = new Map(nextTiles.map((tile) => [tile.id, tile]))
      const preserved = previous
        .map((tile) => nextById.get(tile.id))
        .filter((tile): tile is BuilderTile => !!tile)
      const preservedIds = new Set(preserved.map((tile) => tile.id))
      const missing = nextTiles.filter((tile) => !preservedIds.has(tile.id))
      return sortDisabledToEnd([...preserved, ...missing])
    })
  }, [bottomHand, communityTiles])

  const wordPreview = useMemo(
    () => builderTiles.filter((tile) => !tile.disabled).map((tile) => tile.letter).join(''),
    [builderTiles],
  )

  const handleToggleDisabled = (id: string) => {
    setBuilderTiles((prev) =>
      sortDisabledToEnd(
        prev.map((tile) => (tile.id === id ? { ...tile, disabled: !tile.disabled } : tile)),
      ),
    )
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    const tile = builderTiles.find((item) => item.id === String(active.id)) ?? null
    setActiveTile(tile)
  }

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveTile(null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTile(null)
    if (!over || active.id === over.id) return
    setBuilderTiles((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id)
      const newIndex = prev.findIndex((item) => item.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return sortDisabledToEnd(arrayMove(prev, oldIndex, newIndex))
    })
  }

  const handleSubmitWord = async () => {
    if (!wordPreview || wordPreview.length < 2) {
      setValidationError('Word must be at least 2 letters')
      return
    }

    if (!bottomHand) {
      setValidationError('No player hand available')
      return
    }

    setIsValidating(true)
    setValidationError(null)

    try {
      // Prepare tiles for submission
      const tiles = builderTiles
        .filter((tile) => !tile.disabled)
        .map((tile) => ({
          letter: tile.letter,
          baseValue: tile.baseValue,
          source: tile.source,
        }))

      // Submit to backend
      const result = await submitWord({
        gameId,
        playerId: bottomHand.playerId,
        word: wordPreview,
        tiles,
      })

      console.log('Word submitted successfully:', result)
      alert(`Valid word: ${result.word}\nScore: ${result.score}`)

      // Clear the word after successful submission
      setBuilderTiles([])
      setIsValidating(false)
    } catch (error) {
      console.error('Error submitting word:', error)
      const message = error instanceof Error ? error.message : 'Error submitting word. Please try again.'
      setValidationError(message)
      setIsValidating(false)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="relative mx-auto h-[60vh] w-full overflow-hidden rounded-2xl border border-slate-300 bg-[#e7e7e7]">
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4">
          {Array.from({ length: 5 }).map((_, index) => {
            const tile = communityTiles[index]
            return (
              <ScrabbleTile
                key={`community-${index}`}
                letter={tile?.letter ?? ''}
                baseValue={tile?.baseValue}
                showValue={false}
                size="md"
                variant={tile ? 'community' : 'hidden'}
              />
            )
          })}
        </div>

        {opponents.map((hand, opponentIndex) => {
          const seat = getOpponentSeat(opponentIndex, opponents.length)
          const label = getPlayerName(hand.playerId, hands.findIndex((h) => h._id === hand._id))
          const labelClass =
            seat.x < 20
              ? '-rotate-90 origin-center'
              : seat.x > 80
                ? 'rotate-90 origin-center'
                : ''

          return (
            <div
              key={`opponent-${hand._id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
            >
              <p className={`mb-2 text-center text-sm text-slate-900 ${labelClass}`}>{label}</p>
              <div className="flex items-center justify-center gap-2">
                {hand.tiles.map((_, tileIndex) => (
                  <ScrabbleTile
                    key={`opponent-${hand._id}-tile-${tileIndex}`}
                    letter=""
                    showValue={false}
                    size="sm"
                    variant="hidden"
                  />
                ))}
              </div>
            </div>
          )
        })}

        {bottomHand && (
          <div className="absolute bottom-6 left-1/2 w-full max-w-[94%] -translate-x-1/2">
            <div className="mb-2 text-center text-sm text-slate-900">
              {getPlayerName(bottomHand.playerId, bottomHandIndex)}
            </div>
            <div className="mb-2 text-center text-xs uppercase tracking-[0.16em] text-slate-600">
              Drag cards to build a word. Click a letter to enable it.
            </div>
            <SortableContext
              items={builderTiles.map((tile) => tile.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap items-center justify-center gap-3">
                {builderTiles.map((tile) => (
                  <SortableBuilderTile key={tile.id} tile={tile} onToggleDisabled={handleToggleDisabled} />
                ))}
              </div>
            </SortableContext>
            <div className="mt-3 flex flex-col items-center gap-2">
              <div className="text-center text-lg font-semibold tracking-[0.2em] text-slate-800">
                {wordPreview || ' '}
              </div>
              {wordPreview && wordPreview.length >= 2 && (
                <button
                  onClick={handleSubmitWord}
                  disabled={isValidating}
                  className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {isValidating ? 'Validating...' : 'Submit Word'}
                </button>
              )}
              {validationError && (
                <div className="text-sm font-medium text-red-600">{validationError}</div>
              )}
            </div>
          </div>
        )}

        {bottomHand && (
          <div className="absolute bottom-4 right-4 flex h-24 w-24 flex-col items-center justify-center rounded-full border border-slate-400 bg-slate-300 text-slate-900 shadow-sm md:h-28 md:w-28">
            <span className="text-[11px] uppercase tracking-[0.08em] text-slate-700">
              Score
            </span>
            <span className="text-xl font-semibold leading-none md:text-2xl">
              {bottomHand.bet ?? 0}
            </span>
          </div>
        )}
      </div>
      <DragOverlay>
        {activeTile ? (
          <div style={{ cursor: 'grabbing' }}>
            <ScrabbleTile
              letter={activeTile.letter}
              baseValue={activeTile.baseValue}
              showValue={activeTile.source === 'hand'}
              size="lg"
              variant={activeTile.source === 'community' ? 'community' : 'default'}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
