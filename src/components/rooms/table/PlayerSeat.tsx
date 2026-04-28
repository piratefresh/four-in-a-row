import { ScrabbleTile } from './ScrabbleTile'

type PlayerSeatProps = {
  position: 'top' | 'left' | 'right'
  name: string
  chips: number
  currentBet?: number
  betAction?: 'ante' | 'raise' | 'call'
  hasSubmitted?: boolean
  isRevealed?: boolean
  tiles?: Array<{ letter?: string; baseValue?: number }>
  word?: string
  score?: number
}

const POSITION_STYLES = {
  top: 'top-[10%] left-1/2 -translate-x-1/2',
  left: 'left-[8%] top-1/2 -translate-y-1/2',
  right: 'right-[8%] top-1/2 -translate-y-1/2',
}

export function PlayerSeat({
  position,
  name,
  chips,
  currentBet,
  betAction,
  hasSubmitted,
  isRevealed,
  tiles = [],
  word,
  score,
}: PlayerSeatProps) {
  return (
    <div className={`absolute ${POSITION_STYLES[position]}`}>
      <div className="flex flex-col items-center gap-3">
        {/* Player info card */}
        <div className="flex flex-col items-center gap-2 rounded-xl bg-[#0a0a0a]/90 px-4 py-3 shadow-xl backdrop-blur-sm">
          <div className="text-sm font-bold text-white">{name}</div>
          <div className="text-xs font-semibold text-[#d4af37]">${chips}</div>
        </div>

        {/* Current bet badge */}
        {currentBet !== undefined && currentBet > 0 && (
          <div className="rounded-lg bg-[#3b82f6]/20 px-3 py-1.5 shadow-lg backdrop-blur-sm">
            <div className="text-xs font-bold uppercase text-[#3b82f6]">
              {betAction === 'ante' ? 'Ante' : betAction === 'raise' ? 'Raise' : 'Call'} ${currentBet}
            </div>
          </div>
        )}

        {/* Cards/Tiles display */}
        {isRevealed && tiles && word && score !== undefined ? (
          /* Showdown complete - show revealed word */
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-1.5">
              {tiles.map((tile, idx) => (
                <ScrabbleTile
                  key={`tile-${idx}`}
                  letter={tile.letter || ''}
                  baseValue={tile.baseValue}
                  showValue={true}
                  size="sm"
                  variant="default"
                />
              ))}
            </div>
            <div className="rounded-lg bg-white px-3 py-1.5 shadow-md">
              <div className="text-xs font-bold text-slate-800">
                {word.toUpperCase()} • {score}
              </div>
            </div>
          </div>
        ) : hasSubmitted ? (
          /* Submitted but not revealed */
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: tiles.length || 2 }).map((_, idx) => (
                <ScrabbleTile
                  key={`hidden-${idx}`}
                  letter=""
                  showValue={false}
                  size="sm"
                  variant="empty"
                />
              ))}
            </div>
            <div className="rounded-lg bg-[#22c55e]/20 px-3 py-1.5 shadow-md backdrop-blur-sm">
              <div className="text-xs font-bold text-[#22c55e]">Submitted ✓</div>
            </div>
          </div>
        ) : (
          /* Not submitted - show hidden cards */
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: tiles.length || 2 }).map((_, idx) => (
              <ScrabbleTile
                key={`hidden-${idx}`}
                letter=""
                showValue={false}
                size="sm"
                variant="empty"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
