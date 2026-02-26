import type { ReactNode } from 'react'

type BottomPlayerAreaProps = {
  name: string
  chips: number
  children: ReactNode
  actions?: ReactNode
}

export function BottomPlayerArea({ name, chips, children, actions }: BottomPlayerAreaProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
      {/* Semi-transparent overlay background */}
      <div className="w-full bg-gradient-to-t from-[#0a0a0a]/95 to-transparent pb-6 pt-12">
        <div className="mx-auto flex w-full max-w-[95%] flex-col items-center gap-4">
          {/* Player info bar */}
          <div className="flex w-full items-center justify-between px-4">
            <div className="rounded-lg bg-[#0a0a0a]/90 px-4 py-2 shadow-lg backdrop-blur-sm">
              <div className="text-sm font-bold text-white">{name}</div>
            </div>
            <div className="rounded-lg bg-[#0a0a0a]/90 px-4 py-2 shadow-lg backdrop-blur-sm">
              <div className="text-sm font-bold text-[#d4af37]">${chips}</div>
            </div>
          </div>

          {/* Main content area (word builder / revealed word) */}
          <div className="w-full">{children}</div>

          {/* Action buttons */}
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
    </div>
  )
}
