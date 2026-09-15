import { createContext, useContext } from 'react'
import type { DailyResult, Stats } from '../lib/stats/stats'

export interface StatsValue {
  stats: Stats
  /** Records an official Daily result. Idempotent per puzzle number. */
  recordDailyResult: (result: DailyResult) => void
}

export const StatsContext = createContext<StatsValue | null>(null)

export function useStats(): StatsValue {
  const ctx = useContext(StatsContext)
  if (!ctx) throw new Error('useStats must be used within StatsProvider')
  return ctx
}
