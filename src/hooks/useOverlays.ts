import { createContext, useContext } from 'react'

/**
 * Counts open overlays (modals/menus) so the game can ignore physical
 * keyboard input while any of them is open.
 */
export interface OverlayValue {
  openCount: number
  register: () => () => void
}

export const OverlayContext = createContext<OverlayValue | null>(null)

export function useOverlays(): OverlayValue {
  const ctx = useContext(OverlayContext)
  if (!ctx) throw new Error('useOverlays must be used within OverlayProvider')
  return ctx
}
