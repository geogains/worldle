import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { StatsContext } from '../hooks/useStats'
import { applyDailyResult, type DailyResult, type Stats } from '../lib/stats/stats'
import { loadStats, saveStats } from '../lib/storage/schema'

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(loadStats)

  const recordDailyResult = useCallback((result: DailyResult) => {
    setStats((prev) => {
      const next = applyDailyResult(prev, result)
      if (next !== prev) saveStats(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ stats, recordDailyResult }), [stats, recordDailyResult])
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>
}
