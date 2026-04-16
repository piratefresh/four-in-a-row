type PotDisplayProps = {
  amount: number
}

export function PotDisplay({ amount }: PotDisplayProps) {
  return (
    <div className="fixed right-8 top-8 z-50 flex flex-col items-end">
      <div className="flex flex-col items-center gap-0.5 rounded-lg bg-black px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Pot
        </span>
        <span className="text-2xl font-bold text-[#d4af37]">${amount}</span>
      </div>
    </div>
  )
}
