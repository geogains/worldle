import { useEffect, useState } from 'react'
import { getPuzzleNumber, msUntilNextReset } from '../lib/daily/date'

/**
 * Tracks today's puzzle number and notices the UTC rollover while the app is
 * open. Re-renders only when the number actually changes.
 */
export function useTodayPuzzleNumber(): number {
  const [number, setNumber] = useState<number>(() => getPuzzleNumber())
  useEffect(() => {
    const check = () => {
      const next = getPuzzleNumber()
      setNumber((prev) => (prev === next ? prev : next))
    }
    const interval = setInterval(check, 1000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return number
}

/** Milliseconds until the next daily reset, ticking every second. */
export function useCountdown(): number {
  const [ms, setMs] = useState<number>(() => msUntilNextReset())
  useEffect(() => {
    const tick = () => setMs(msUntilNextReset())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])
  return ms
}
