import type { ReactNode } from 'react'
import { PokerTable as SharedPokerTable } from '@/components/PokerTable'

type PokerTableProps = {
  children: ReactNode
}

export function PokerTable({ children }: PokerTableProps) {
  return <SharedPokerTable variant="game">{children}</SharedPokerTable>
}
