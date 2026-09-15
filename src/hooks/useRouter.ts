import { createContext, useContext } from 'react'
import type { Route } from '../lib/router/routes'

export interface RouterValue {
  route: Route
  path: string
  navigate: (path: string, options?: { replace?: boolean }) => void
}

export const RouterContext = createContext<RouterValue | null>(null)

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter must be used within RouterProvider')
  return ctx
}
