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

type CommunityCardsSectionProps = {
  tiles: Tile[]
  currentBet?: number
  betLabel?: string
}

export function CommunityCardsSection({ tiles, currentBet, betLabel }: CommunityCardsSectionProps) {
  return (
    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4">
      {/* Label */}
      <div className="text-sm font-semibold uppercase tracking-wider text-white/80">
        Community Letters
      </div>

      {/* Cards */}
      <div className="flex items-center gap-3">
        {Array.from({ length: 5 }).map((_, index) => {
          const tile = tiles[index]
          const isRevealed = tile?.revealed ?? false
          const isChoice = tile?.kind === 'choice'

          return (
            <div key={`community-${index}`} className="transition-transform hover:scale-105">
              <ScrabbleTile
                letter={
                  isRevealed && !isChoice && tile.kind === 'single' ? tile.letter : undefined
                }
                letters={
                  isRevealed && isChoice && tile.kind === 'choice' ? tile.options : undefined
                }
                baseValue={
                  isRevealed && !isChoice && tile.kind === 'single' ? tile.baseValue : undefined
                }
                baseValues={
                  isRevealed && isChoice && tile.kind === 'choice' ? tile.baseValues : undefined
                }
                isChoice={isChoice}
                showValue={false}
                size="md"
                variant={isRevealed ? 'community' : 'hidden'}
              />
            </div>
          )
        })}
      </div>

      {/* Current bet indicator */}
      {currentBet !== undefined && currentBet > 0 && (
        <div className="mt-2 rounded-lg bg-[#0a0a0a]/80 px-4 py-2 shadow-lg backdrop-blur-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-[#9ca3af]">
            {betLabel || 'Current Bet'}
          </div>
          <div className="text-center text-lg font-bold text-white">${currentBet}</div>
        </div>
      )}
    </div>
  )
}
