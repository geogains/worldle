import { createContext, useContext } from 'react'
import type { Prefs, ThemePreference } from '../lib/storage/schema'

export type ResolvedTheme = 'light' | 'dark'

export interface PrefsValue {
  prefs: Prefs
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
  toggleTheme: () => void
  markHelpSeen: () => void
}

export const PrefsContext = createContext<PrefsValue | null>(null)

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider')
  return ctx
}
