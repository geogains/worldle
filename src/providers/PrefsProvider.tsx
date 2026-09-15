import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { PrefsContext, type PrefsValue, type ResolvedTheme } from '../hooks/usePrefs'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { loadPrefs, savePrefs, type Prefs } from '../lib/storage/schema'

function applyThemeToDocument(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = theme === 'dark' ? '#121213' : '#f7f6f2'
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolvedTheme: ResolvedTheme =
    prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme

  useEffect(() => {
    applyThemeToDocument(resolvedTheme)
  }, [resolvedTheme])

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  const value = useMemo<PrefsValue>(
    () => ({
      prefs,
      resolvedTheme,
      setTheme: (theme) => update({ theme }),
      toggleTheme: () => update({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' }),
      markHelpSeen: () => update({ hasSeenHelp: true }),
    }),
    [prefs, resolvedTheme, update],
  )

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}
