import type { HTMLAttributes } from 'react'

type ScrabbleTileSize = 'xs' | 'sm' | 'md' | 'lg'
type ScrabbleTileVariant = 'default' | 'community' | 'hidden'

type ScrabbleTileProps = {
  letter: string
  baseValue?: number
  showValue?: boolean
  size?: ScrabbleTileSize
  variant?: ScrabbleTileVariant
} & HTMLAttributes<HTMLDivElement>

const sizeClasses: Record<ScrabbleTileSize, string> = {
  xs: 'h-8 w-8 text-sm',
  sm: 'h-9 w-9 text-base',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-3xl',
}

const valueClasses: Record<ScrabbleTileSize, string> = {
  xs: 'bottom-0.5 right-0.5 text-[8px]',
  sm: 'bottom-0.5 right-0.5 text-[8px]',
  md: 'bottom-0.5 right-1 text-[9px]',
  lg: 'bottom-1 right-1 text-xs',
}

export function ScrabbleTile({
  letter,
  baseValue,
  showValue = true,
  size = 'md',
  variant = 'default',
  className,
  ...divProps
}: ScrabbleTileProps) {
  const styleByVariant: Record<ScrabbleTileVariant, string> = {
    default:
      'border-amber-900/60 text-amber-950 shadow-[0_8px_16px_rgba(15,23,42,0.45)]',
    community:
      'border-red-800/70 bg-red-600 text-white shadow-[0_8px_16px_rgba(127,29,29,0.45)]',
    hidden:
      'border-slate-900/80 bg-black text-transparent shadow-[0_8px_16px_rgba(2,6,23,0.5)]',
  }

  const insetByVariant: Record<ScrabbleTileVariant, string> = {
    default: 'border-amber-100/50',
    community: 'border-red-300/35',
    hidden: 'border-slate-700/40',
  }

  return (
    <div
      className={`relative flex items-center justify-center rounded-[6px] border ${styleByVariant[variant]} ${sizeClasses[size]} ${className ?? ''}`}
      style={
        variant === 'default'
          ? {
              background:
                'linear-gradient(145deg, #f7e8c5 0%, #ecd7aa 45%, #d9be85 100%)',
            }
          : undefined
      }
      {...divProps}
    >
      <div
        className={`pointer-events-none absolute inset-[2px] rounded-[4px] border ${insetByVariant[variant]}`}
      />
      <span className="font-bold leading-none tracking-wide">{letter}</span>
      {variant === 'default' && showValue && typeof baseValue === 'number' && (
        <span
          className={`absolute font-semibold leading-none text-amber-900/80 ${valueClasses[size]}`}
        >
          {baseValue}
        </span>
      )}
    </div>
  )
}
