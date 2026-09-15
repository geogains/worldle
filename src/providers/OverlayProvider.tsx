import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { OverlayContext } from '../hooks/useOverlays'

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [openCount, setOpenCount] = useState(0)
  const register = useCallback(() => {
    setOpenCount((n) => n + 1)
    return () => setOpenCount((n) => Math.max(0, n - 1))
  }, [])
  const value = useMemo(() => ({ openCount, register }), [openCount, register])
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
}
