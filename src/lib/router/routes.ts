import { isQuizMode, type QuizMode } from '../quiz/types'

export type Route =
  | { name: 'daily' }
  | { name: 'practice' }
  | { name: 'archive' }
  | { name: 'archive-game'; puzzleNumber: number }
  | { name: 'study' }
  | { name: 'quiz' }
  | { name: 'quiz-play'; mode: QuizMode }
  | { name: 'results'; countrySlug: string }
  | { name: 'not-found'; path: string }

export const PATHS = {
  daily: '/',
  practice: '/practice',
  archive: '/archive',
  archiveGame: (n: number) => `/archive/${n}`,
  study: '/study',
  quiz: '/quiz',
  /** Future per-mode gameplay route, e.g. /quiz/flags. */
  quizPlay: (mode: QuizMode) => `/quiz/${mode}`,
  /** Country results page, e.g. /results/tanzania (slug = Country.id). */
  results: (countrySlug: string) => `/results/${countrySlug}`,
} as const

/** Pure path -> route parser (base URL already stripped). */
export function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { name: 'daily' }
  if (path === '/practice') return { name: 'practice' }
  if (path === '/archive') return { name: 'archive' }
  if (path === '/study') return { name: 'study' }
  if (path === '/quiz') return { name: 'quiz' }
  const m = /^\/archive\/(\d{1,6})$/.exec(path)
  if (m) return { name: 'archive-game', puzzleNumber: Number(m[1]) }
  // Only a real QuizMode is a valid gameplay route; anything else under
  // /quiz/* (typo, stale link, future non-mode path) falls through to
  // not-found rather than being guessed at.
  const q = /^\/quiz\/([a-z-]{1,40})$/.exec(path)
  if (q && isQuizMode(q[1])) return { name: 'quiz-play', mode: q[1] as QuizMode }
  // Slug shape only; whether it names a real country is decided by the
  // screen (data lookup), so an unknown country still gets a graceful page.
  const r = /^\/results\/([A-Za-z0-9-]{1,80})$/.exec(path)
  if (r) return { name: 'results', countrySlug: (r[1] as string).toLowerCase() }
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
    case 'study':
      return PATHS.study
    case 'quiz':
      return PATHS.quiz
    case 'quiz-play':
      return PATHS.quizPlay(route.mode)
    case 'results':
      return PATHS.results(route.countrySlug)
    case 'not-found':
      return route.path
  }
}
