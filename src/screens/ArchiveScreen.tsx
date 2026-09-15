import { useMemo } from 'react'
import { branding } from '../config/branding'
import { useRouter } from '../hooks/useRouter'
import { useStats } from '../hooks/useStats'
import { formatPuzzleDate } from '../lib/daily/date'
import { PATHS } from '../lib/router/routes'
import { loadArchive } from '../lib/storage/schema'

export function ArchiveScreen({ todayNumber }: { todayNumber: number }) {
  const { navigate } = useRouter()
  const { stats } = useStats()
  const archive = useMemo(() => loadArchive(), [])
  const previous = useMemo(
    () => Array.from({ length: todayNumber - 1 }, (_, i) => todayNumber - 1 - i),
    [todayNumber],
  )

  const statusFor = (n: number): { text: string; tone: 'won' | 'lost' | 'muted' } => {
    const replay = archive[String(n)]
    if (replay && replay.status === 'won') return { text: `Solved in ${replay.guesses.length}`, tone: 'won' }
    if (replay && replay.status === 'lost') return { text: 'Not solved', tone: 'lost' }
    if (replay && replay.guesses.length > 0) return { text: 'In progress', tone: 'muted' }
    if (stats.completedPuzzles.includes(n)) return { text: 'Played on the day', tone: 'muted' }
    return { text: 'Not played', tone: 'muted' }
  }

  return (
    <div className="mx-auto w-full max-w-[520px] flex-1 overflow-y-auto px-4 py-5">
      <h1 className="text-[1.5rem] font-extrabold tracking-[-0.01em]">Archive</h1>
      <p className="mt-1 text-[0.9rem] text-muted">
        Replay past puzzles for fun. Archive games never change your daily statistics or streak.
      </p>

      <button
        type="button"
        className="mt-5 flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-2"
        onClick={() => navigate(PATHS.daily)}
      >
        <span>
          <span className="block font-bold">Today · #{todayNumber}</span>
          <span className="block text-[0.85rem] text-muted">{formatPuzzleDate(todayNumber)}</span>
        </span>
        <span className="text-[0.85rem] font-semibold text-muted">Play daily →</span>
      </button>

      {previous.length === 0 ? (
        <p className="mt-8 text-center text-[0.95rem] text-muted">
          No previous puzzles yet. Today is the very first {branding.name}. Come back tomorrow!
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-divider rounded-xl border border-line" aria-label="Previous puzzles">
          {previous.map((n) => {
            const s = statusFor(n)
            return (
              <li key={n}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-2"
                  onClick={() => navigate(PATHS.archiveGame(n))}
                >
                  <span>
                    <span className="block font-bold">#{n}</span>
                    <span className="block text-[0.85rem] text-muted">{formatPuzzleDate(n)}</span>
                  </span>
                  <span
                    className={`text-[0.85rem] font-semibold ${
                      s.tone === 'won' ? 'text-correct' : s.tone === 'lost' ? 'text-present' : 'text-muted'
                    }`}
                  >
                    {s.text}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
