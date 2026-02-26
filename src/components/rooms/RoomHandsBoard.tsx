import { useEffect, useMemo, useState } from 'react'
import { useAction, useQuery } from 'convex/react'
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

type Tile =
  | {
      kind: 'single'
      letter: string
      baseValue: number
      revealed?: boolean
      multiplier?: '2L' | '3L'
    }
  | {
      kind: 'choice'
      options: string[]
      baseValues: number[]
      revealed?: boolean
      multiplier?: '2L' | '3L'
    }

type PlayerHand = {
  _id: string
  playerId: string
  tiles: Tile[]
  bet?: number
}

type RoomHandsBoardProps = {
  gameId: Id<'games'>
  gameStage: 'preflop' | 'flop' | 'turn' | 'river' | 'final' | 'showdown'
  communityTiles: Tile[]
  hands: PlayerHand[]
  getPlayerName: (playerId: string, handIndex: number) => string
  bottomPlayerId?: string
}

type BuilderTile = {
  id: string
  letter?: string
  letters?: string[] // For choice cards
  baseValue?: number
  baseValues?: number[] // For choice cards
  source: 'hand' | 'community'
  disabled?: boolean
  isChoice?: boolean
  cardIndex?: number // Track which card this is for choice resolution
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

function sortDisabledToEnd(tiles: BuilderTile[]) {
  return [...tiles].sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled))
}

type SortableBuilderTileProps = {
  tile: BuilderTile
  onToggleDisabled: (id: string) => void
  selectedLetter?: string
}

function SortableBuilderTile({ tile, onToggleDisabled, selectedLetter }: SortableBuilderTileProps) {
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
          letters={tile.letters}
          baseValue={tile.baseValue}
          baseValues={tile.baseValues}
          isChoice={tile.isChoice}
          selectedLetter={selectedLetter}
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
  gameStage,
  communityTiles,
  hands,
  getPlayerName,
  bottomPlayerId,
}: RoomHandsBoardProps) {
  const submitWord = useAction(api.games.submitWord)
  const wordSubmissions = useQuery(api.games.getWordSubmissions, { gameId })
  const [builderTiles, setBuilderTiles] = useState<BuilderTile[]>([])
  const [activeTile, setActiveTile] = useState<BuilderTile | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showReveal, setShowReveal] = useState(false)
  // Track selected letter for each choice card: tileId -> selectedLetter
  const [choiceSelections, setChoiceSelections] = useState<Record<string, string>>({})
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
      ...bottomHand.tiles.map((tile, index) => {
        if (tile.kind === 'choice') {
          return {
            id: `hand-${bottomHand._id}-${index}-choice-${tile.options.join('/')}`,
            letters: tile.options,
            baseValues: tile.baseValues,
            source: 'hand' as const,
            disabled: true,
            isChoice: true,
            cardIndex: index,
          }
        }
        return {
          id: `hand-${bottomHand._id}-${index}-${tile.letter}-${tile.baseValue}`,
          letter: tile.letter,
          baseValue: tile.baseValue,
          source: 'hand' as const,
          disabled: true,
          cardIndex: index,
        }
      }),
      ...communityTiles
        .filter((tile) => tile.revealed) // Only include revealed community tiles
        .map((tile, index) => {
          if (tile.kind === 'choice') {
            return {
              id: `community-${index}-choice-${tile.options.join('/')}`,
              letters: tile.options,
              baseValues: tile.baseValues,
              source: 'community' as const,
              disabled: true,
              isChoice: true,
              cardIndex: index,
            }
          }
          return {
            id: `community-${index}-${tile.letter}-${tile.baseValue}`,
            letter: tile.letter,
            baseValue: tile.baseValue,
            source: 'community' as const,
            disabled: true,
            cardIndex: index,
          }
        }),
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
    () =>
      builderTiles
        .filter((tile) => !tile.disabled)
        .map((tile) => {
          if (tile.isChoice) {
            // Use selected letter if available, otherwise show first option with indicator
            return choiceSelections[tile.id] || `[${tile.letters?.[0]}]`
          }
          return tile.letter ?? ''
        })
        .join(''),
    [builderTiles, choiceSelections],
  )

  // Check if all enabled choice cards have selections
  const unresolvedChoices = useMemo(() => {
    return builderTiles
      .filter((tile) => !tile.disabled && tile.isChoice)
      .filter((tile) => !choiceSelections[tile.id])
  }, [builderTiles, choiceSelections])

  const hasUnresolvedChoices = unresolvedChoices.length > 0

  // Get current player's submission if available
  const mySubmission = useMemo(() => {
    if (!bottomHand || !wordSubmissions?.submissions) return null
    return wordSubmissions.submissions.find(s => s.playerId === bottomHand.playerId)
  }, [bottomHand, wordSubmissions])

  // Get other players' submissions
  const otherSubmissions = useMemo(() => {
    if (!bottomHand || !wordSubmissions?.submissions) return []
    return wordSubmissions.submissions.filter(s => s.playerId !== bottomHand.playerId)
  }, [bottomHand, wordSubmissions])

  const handleToggleDisabled = (id: string) => {
    setBuilderTiles((prev) => {
      const tile = prev.find((t) => t.id === id)
      // If disabling a tile, clear its choice selection
      if (tile && !tile.disabled) {
        setChoiceSelections((selections) => {
          const { [id]: _, ...rest } = selections
          return rest
        })
      }
      return sortDisabledToEnd(
        prev.map((tile) => (tile.id === id ? { ...tile, disabled: !tile.disabled } : tile)),
      )
    })
  }

  const handleChoiceSelect = (tileId: string, letter: string) => {
    setChoiceSelections((prev) => ({
      ...prev,
      [tileId]: letter,
    }))
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

    if (hasUnresolvedChoices) {
      setValidationError('Please select a letter for each choice card')
      return
    }

    if (!bottomHand) {
      setValidationError('No player hand available')
      return
    }

    setIsValidating(true)
    setValidationError(null)

    try {
      const enabledTiles = builderTiles.filter((tile) => !tile.disabled)

      // Prepare tiles for submission
      const tiles = enabledTiles.map((tile) => {
        if (tile.isChoice) {
          const selectedLetter = choiceSelections[tile.id]
          const optionIndex = tile.letters?.indexOf(selectedLetter) ?? 0
          const selectedValue = tile.baseValues?.[optionIndex] ?? 1
          return {
            letter: selectedLetter,
            baseValue: selectedValue,
            source: tile.source,
            cardIndex: tile.cardIndex,
            wasChoice: true,
          }
        }
        return {
          letter: tile.letter!,
          baseValue: tile.baseValue!,
          source: tile.source,
          cardIndex: tile.cardIndex,
          wasChoice: false,
        }
      })

      // Build choice resolutions map
      const choiceResolutions: {
        hand?: Record<string, string>
        community?: Record<string, string>
      } = {}

      enabledTiles.forEach((tile) => {
        if (tile.isChoice && tile.cardIndex !== undefined) {
          const selectedLetter = choiceSelections[tile.id]
          const resolutionKey = tile.source === 'hand' ? 'hand' : 'community'
          if (!choiceResolutions[resolutionKey]) {
            choiceResolutions[resolutionKey] = {}
          }
          choiceResolutions[resolutionKey]![String(tile.cardIndex)] = selectedLetter
        }
      })

      // Submit to backend
      const result = await submitWord({
        gameId,
        playerId: bottomHand.playerId,
        word: wordPreview.replace(/\[|\]/g, ''), // Remove brackets from unselected choices
        tiles,
        choiceResolutions: Object.keys(choiceResolutions).length > 0 ? choiceResolutions : undefined,
      })

      if (result?.forfeited) {
        alert(result.message ?? 'Invalid word. You forfeited this showdown.')
        setBuilderTiles([])
        setIsValidating(false)
      } else {
        console.log('Word submitted successfully:', result)
        // Trigger reveal animation
        setIsValidating(false)

        // Start reveal animation after a short delay
        setTimeout(() => {
          setShowReveal(true)
        }, 500)
      }
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
            const isRevealed = tile?.revealed ?? false
            const isChoice = tile?.kind === 'choice'
            return (
              <ScrabbleTile
                key={`community-${index}`}
                letter={isRevealed && !isChoice && tile.kind === 'single' ? tile.letter : undefined}
                letters={isRevealed && isChoice && tile.kind === 'choice' ? tile.options : undefined}
                baseValue={isRevealed && !isChoice && tile.kind === 'single' ? tile.baseValue : undefined}
                baseValues={isRevealed && isChoice && tile.kind === 'choice' ? tile.baseValues : undefined}
                isChoice={isChoice}
                showValue={false}
                size="md"
                variant={isRevealed ? 'community' : 'hidden'}
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

          // Check if this opponent has submitted
          const opponentSubmission = otherSubmissions.find(s => s.playerId === hand.playerId)

          return (
            <div
              key={`opponent-${hand._id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
            >
              <p className={`mb-2 text-center text-sm text-slate-900 ${labelClass}`}>{label}</p>
              {opponentSubmission && wordSubmissions?.isCompleted ? (
                /* Showdown complete - reveal their word */
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center gap-1.5">
                    {opponentSubmission.tiles.map((tile: any, tileIndex: number) => (
                      <ScrabbleTile
                        key={`opponent-${hand._id}-tile-${tileIndex}`}
                        letter={tile.letter}
                        baseValue={tile.baseValue}
                        showValue={true}
                        size="sm"
                        variant="default"
                      />
                    ))}
                  </div>
                  <div className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow">
                    {opponentSubmission.word.toUpperCase()} • {opponentSubmission.score}
                  </div>
                </div>
              ) : opponentSubmission ? (
                /* Submitted but not revealed yet */
                <div className="flex flex-col items-center gap-2">
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
                  <div className="rounded bg-green-200 px-2 py-1 text-xs font-semibold text-green-800">
                    Submitted ✓
                  </div>
                </div>
              ) : (
                /* Not submitted yet */
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
              )}
            </div>
          )
        })}

        {bottomHand && (
          <div className="absolute bottom-6 left-1/2 w-full max-w-[94%] -translate-x-1/2">
            <div className="mb-2 text-center text-sm text-slate-900">
              {getPlayerName(bottomHand.playerId, bottomHandIndex)}
            </div>
            {mySubmission ? (
              /* Reveal mode - show submitted word with score */
              <div className="flex flex-col items-center gap-4">
                <div className="text-center text-xs uppercase tracking-[0.16em] text-green-600">
                  {showReveal ? 'Word Submitted!' : 'Submitting...'}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {mySubmission.tiles.map((tile: any, index: number) => (
                    <div
                      key={`revealed-${index}`}
                      className={`transition-all duration-500 ${
                        showReveal
                          ? 'opacity-100 scale-100 translate-y-0'
                          : 'opacity-0 scale-95 translate-y-4'
                      }`}
                      style={{ transitionDelay: showReveal ? `${index * 100}ms` : '0ms' }}
                    >
                      <ScrabbleTile
                        letter={tile.letter}
                        baseValue={tile.baseValue}
                        showValue={true}
                        size="lg"
                        variant="default"
                      />
                    </div>
                  ))}
                </div>
                {showReveal && (
                  <div className="animate-in fade-in zoom-in-95 rounded-lg bg-green-100 px-6 py-3 text-center shadow-md duration-500">
                    <div className="text-2xl font-bold text-green-800">{mySubmission.word.toUpperCase()}</div>
                    <div className="mt-1 text-lg font-semibold text-green-700">Score: {mySubmission.score}</div>
                  </div>
                )}
              </div>
            ) : (
              /* Build mode - drag and drop word builder */
              <>
                <div className="mb-2 text-center text-xs uppercase tracking-[0.16em] text-slate-600">
                  Drag cards to build a word. Click a letter to enable it.
                </div>
                <SortableContext
                  items={builderTiles.map((tile) => tile.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    {builderTiles.map((tile) => (
                      <div
                        key={tile.id}
                        className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${
                          isValidating && tile.disabled ? 'opacity-30' : 'opacity-100'
                        }`}
                      >
                        {/* Choice selection buttons - show ABOVE card when enabled, choice card, and NO selection yet */}
                        {!tile.disabled && tile.isChoice && tile.letters && !choiceSelections[tile.id] && (
                          <div className="flex gap-1.5 rounded-lg border-2 border-blue-300 bg-white px-3 py-2 shadow-md">
                            {tile.letters.map((letter, idx) => (
                              <button
                                key={letter}
                                onClick={() => handleChoiceSelect(tile.id, letter)}
                                className="rounded-lg bg-slate-100 px-3 py-1.5 text-base font-bold text-slate-700 transition-all hover:bg-blue-100 hover:shadow-sm"
                                title={`Select ${letter} (value: ${tile.baseValues?.[idx]})`}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                        )}
                        <SortableBuilderTile
                          tile={tile}
                          onToggleDisabled={handleToggleDisabled}
                          selectedLetter={choiceSelections[tile.id]}
                        />
                      </div>
                    ))}
                  </div>
                </SortableContext>
                <div className="mt-3 flex flex-col items-center gap-2">
                  <div className="text-center text-lg font-semibold tracking-[0.2em] text-slate-800">
                    {wordPreview || ' '}
                  </div>
                  {hasUnresolvedChoices && (
                    <div className="text-xs italic text-amber-600">
                      Please select a letter for each choice card (shown in brackets)
                    </div>
                  )}
                  {gameStage === 'showdown' ? (
                    wordPreview && wordPreview.length >= 2 && (
                      <button
                        onClick={handleSubmitWord}
                        disabled={isValidating || hasUnresolvedChoices}
                        className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        {isValidating ? 'Validating...' : hasUnresolvedChoices ? 'Select Letters First' : 'Submit Word'}
                      </button>
                    )
                  ) : (
                    <div className="text-center text-xs italic text-slate-500">
                      Practice mode: only revealed community tiles are usable until showdown.
                    </div>
                  )}
                  {validationError && (
                    <div className="text-sm font-medium text-red-600">{validationError}</div>
                  )}
                </div>
              </>
            )}
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
              letters={activeTile.letters}
              baseValue={activeTile.baseValue}
              baseValues={activeTile.baseValues}
              isChoice={activeTile.isChoice}
              selectedLetter={choiceSelections[activeTile.id]}
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
