export type Route =
  | { name: 'daily' }
  | { name: 'practice' }
  | { name: 'archive' }
  | { name: 'archive-game'; puzzleNumber: number }
  | { name: 'not-found'; path: string }

export const PATHS = {
  daily: '/',
  practice: '/practice',
  archive: '/archive',
  archiveGame: (n: number) => `/archive/${n}`,
} as const

/** Pure path -> route parser (base URL already stripped). */
export function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { name: 'daily' }
  if (path === '/practice') return { name: 'practice' }
  if (path === '/archive') return { name: 'archive' }
  const m = /^\/archive\/(\d{1,6})$/.exec(path)
  if (m) return { name: 'archive-game', puzzleNumber: Number(m[1]) }
  return { name: 'not-found', path }
}

export function routeToPath(route: Route): string {
  switch (route.name) {
    case 'daily':
      return PATHS.daily
    case 'practice':
      return PATHS.practice
    case 'archive':
      return PATHS.archive
    case 'archive-game':
      return PATHS.archiveGame(route.puzzleNumber)
    case 'not-found':
      return route.path
  }
}
