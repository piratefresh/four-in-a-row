type ActionButtonProps = {
  variant: 'check' | 'call' | 'raise' | 'fold' | 'submit'
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

const VARIANT_STYLES = {
  check: 'bg-emerald-600 text-white hover:bg-emerald-700',
  call: 'bg-blue-600 text-white hover:bg-blue-700',
  raise: 'bg-amber-600 text-white hover:bg-amber-700',
  fold: 'bg-rose-600 text-white hover:bg-rose-700',
  submit: 'bg-[#d9d9d9] text-[#111111] hover:bg-[#ececec]',
}

export function ActionButton({ variant, onClick, disabled, children }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        min-h-[44px] min-w-[108px] whitespace-nowrap rounded-[14px] px-3 py-2 text-[14px] leading-none font-semibold
        sm:min-w-[138px] sm:rounded-[20px] sm:px-7 sm:py-3 sm:text-[20px]
        shadow-[0_6px_20px_rgba(0,0,0,0.25)] transition-all duration-150
        hover:-translate-y-0.5 active:translate-y-0
        disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0 disabled:shadow-none
        ${VARIANT_STYLES[variant]}
      `}
    >
      {children}
    </button>
  )
}
