import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { RouterContext, type RouterValue } from '../hooks/useRouter'
import { parseRoute } from '../lib/router/routes'

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

function currentPath(): string {
  if (typeof window === 'undefined') return '/'
  const p = window.location.pathname
  return p.startsWith(BASE) ? p.slice(BASE.length) || '/' : p
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(currentPath)

  useEffect(() => {
    const onPop = () => setPath(currentPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const full = `${BASE}${to}`
    try {
      if (options?.replace) window.history.replaceState(null, '', full)
      else window.history.pushState(null, '', full)
    } catch {
      // history API unavailable; fall back to in-memory routing
    }
    setPath(to)
  }, [])

  const value = useMemo<RouterValue>(() => ({ route: parseRoute(path), path, navigate }), [path, navigate])
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}
