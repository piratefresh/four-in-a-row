import type { ReactNode } from 'react'

type PokerTableVariant = 'game' | 'roomCard'

type PokerTableProps = {
  children?: ReactNode
  className?: string
  contentClassName?: string
  onClick?: () => void
  disabled?: boolean
  variant?: PokerTableVariant
}

const GAME_CONTAINER_CLASS =
  'relative h-screen w-screen overflow-hidden bg-[#1D1D1D]'

const GAME_TABLE_CLASS = 'relative overflow-visible bg-[#114D28]'

const ROOM_CARD_SHELL_CLASS =
  'relative flex h-[310px] w-[199px] items-center justify-center rounded-[176px] border-[40px] border-[#1D1D1D] bg-[#114D28] text-white shadow-[inset_0_0_40px_rgba(0,0,0,0.25)] transition-all'

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ')
}

export function PokerTable({
  children,
  className,
  contentClassName,
  onClick,
  disabled,
  variant = 'game',
}: PokerTableProps) {
  if (variant === 'roomCard') {
    const content = (
      <div
        className={joinClasses(
          'flex items-center justify-center text-[52px] font-semibold leading-none',
          contentClassName,
        )}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {children}
      </div>
    )

    const sharedClassName = joinClasses(
      ROOM_CARD_SHELL_CLASS,
      onClick && !disabled && 'hover:scale-[1.02]',
      disabled && 'cursor-not-allowed opacity-70',
      className,
    )

    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={sharedClassName}
          style={{ transform: 'rotate(90deg)' }}
        >
          {content}
        </button>
      )
    }

    return (
      <div className={sharedClassName} style={{ transform: 'rotate(90deg)' }}>
        {content}
      </div>
    )
  }

  return (
    <div className={joinClasses(GAME_CONTAINER_CLASS, className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={joinClasses(GAME_TABLE_CLASS, contentClassName)}
          style={{
            width: 'clamp(600px, 70vw, 880px)',
            height: 'clamp(500px, 75vh, 700px)',
            borderRadius: '50% / 40%',
            border: '40px solid #1D1D1D',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
          }}
        >
          <div className="relative h-full w-full">{children}</div>
        </div>
      </div>
    </div>
  )
}
