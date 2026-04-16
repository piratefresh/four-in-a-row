import type { HTMLAttributes } from 'react'

type ScrabbleTileSize = 'xs' | 'sm' | 'md' | 'lg'
type ScrabbleTileVariant = 'default' | 'community' | 'hidden'

type ScrabbleTileProps = {
  letter?: string
  letters?: string[] // For choice cards
  baseValue?: number
  baseValues?: number[] // For choice cards
  showValue?: boolean
  size?: ScrabbleTileSize
  variant?: ScrabbleTileVariant
  isChoice?: boolean
  selectedLetter?: string // For showing which letter is selected from choice card
} & HTMLAttributes<HTMLDivElement>

const sizeClasses: Record<ScrabbleTileSize, string> = {
  xs: 'h-16 w-16 text-xl',
  sm: 'h-18 w-18 text-2xl',
  md: 'h-20 w-20 text-2xl',
  lg: 'h-28 w-28 text-6xl',
}

const valueClasses: Record<ScrabbleTileSize, string> = {
  xs: 'bottom-1 right-1 text-sm',
  sm: 'bottom-1 right-1.5 text-sm',
  md: 'bottom-1 right-2 text-base',
  lg: 'bottom-2 right-2 text-xl',
}

export function ScrabbleTile({
  letter,
  letters,
  baseValue,
  baseValues,
  showValue = true,
  size = 'md',
  variant = 'default',
  isChoice = false,
  selectedLetter,
  className,
  ...divProps
}: ScrabbleTileProps) {
  const styleByVariant: Record<ScrabbleTileVariant, string> = {
    default:
      'border-amber-900/60 text-amber-950 shadow-[0_8px_16px_rgba(15,23,42,0.45)]',
    community:
      'border-red-800/70 bg-red-600 text-white shadow-[0_8px_16px_rgba(127,29,29,0.45)]',
    hidden:
      'bg-[#181818] text-transparent shadow-lg',
  }

  const insetByVariant: Record<ScrabbleTileVariant, string> = {
    default: 'border-amber-100/50',
    community: 'border-red-300/35',
    hidden: '',
  }

  // Determine if this is a choice card
  const isChoiceCard = isChoice || (letters && letters.length > 1)
  const displayLetters = isChoiceCard ? letters : letter ? [letter] : []
  const displayValues = isChoiceCard ? baseValues : baseValue ? [baseValue] : []

  return (
    <div
      className={`relative flex items-center justify-center ${variant === 'hidden' ? 'rounded-[12px]' : 'rounded-[6px] border'} ${styleByVariant[variant]} ${sizeClasses[size]} ${className ?? ''}`}
      style={
        variant === 'default'
          ? {
              background:
                'linear-gradient(145deg, #f7e8c5 0%, #ecd7aa 45%, #d9be85 100%)',
            }
          : variant === 'hidden'
            ? {
                width: '45px',
                height: '60px',
              }
            : undefined
      }
      {...divProps}
    >
      {variant !== 'hidden' && (
        <div
          className={`pointer-events-none absolute inset-0.5 rounded-lg border ${insetByVariant[variant]}`}
        />
      )}
      {isChoiceCard ? (
        <div className="relative flex h-full w-full items-center justify-center">
          {selectedLetter ? (
            <>
              {/* Show selected letter same size/position as single letters */}
              <span className="font-bold leading-none tracking-wide">{selectedLetter}</span>
              {/* Show all options small at bottom left inside the tile */}
              <div className={`absolute left-1.5 flex items-center gap-0.5 rounded bg-amber-100/60 px-1 py-0.5 text-[10px] font-semibold leading-none text-amber-950/80 ${
                size === 'lg' ? 'bottom-2' : size === 'md' ? 'bottom-1.5' : 'bottom-1'
              }`}>
                {displayLetters?.map((l, i) => (
                  <span key={i} className={l === selectedLetter ? 'text-amber-950 font-bold' : ''}>
                    {l}
                    {i < (displayLetters?.length ?? 0) - 1 && <span className="mx-px">/</span>}
                  </span>
                ))}
              </div>
              {/* Show selected value in bottom right corner like single tiles */}
              {showValue && displayValues && (
                <span
                  className={`absolute font-bold leading-none rounded px-1.5 py-0.5 ${valueClasses[size]} ${
                    variant === 'community'
                      ? 'bg-red-800/80 text-white'
                      : 'bg-amber-200/80 text-amber-950'
                  }`}
                >
                  {displayValues[displayLetters?.indexOf(selectedLetter) ?? 0]}
                </span>
              )}
            </>
          ) : (
            <>
              {/* No selection yet - show all options centered */}
              <div className="flex items-center gap-1 text-base font-bold leading-none">
                {displayLetters?.map((l, i) => (
                  <span key={i}>
                    {l}
                    {i < (displayLetters?.length ?? 0) - 1 && <span className="mx-0.5 opacity-50">/</span>}
                  </span>
                ))}
              </div>
              {/* Show values in bottom right corner like single tiles */}
              {showValue && displayValues && displayValues.length > 0 && (
                <div
                  className={`absolute flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${valueClasses[size]} ${
                    variant === 'community'
                      ? 'bg-red-800/80 text-white'
                      : 'bg-amber-200/90 text-amber-950'
                  }`}
                >
                  {displayValues.map((v, i) => (
                    <span key={i}>
                      {v}
                      {i < displayValues.length - 1 && <span className="mx-px">/</span>}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <span className="font-bold leading-none tracking-wide">{displayLetters[0]}</span>
          {showValue && typeof baseValue === 'number' && (
            <span
              className={`absolute font-bold leading-none rounded px-1.5 py-0.5 ${valueClasses[size]} ${
                variant === 'community'
                  ? 'bg-red-800/80 text-white'
                  : 'bg-amber-200/80 text-amber-950'
              }`}
            >
              {baseValue}
            </span>
          )}
        </>
      )}
    </div>
  )
}
