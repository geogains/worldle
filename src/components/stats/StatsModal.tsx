import { branding } from '../../config/branding'
import type { Country } from '../../data/countries'
import { getCurrentStreak, getWinPercentage, type Stats } from '../../lib/stats/stats'
import type { GameStatus } from '../../lib/game/types'
import { Modal } from '../ui/Modal'
import { Countdown } from './Countdown'
import { Distribution } from './Distribution'
import { ShareButton } from '../game/ShareButton'
import { PostGameSlot } from '../game/PostGameSlot'

export interface DailySnapshot {
  puzzleNumber: number
  answer: Country
  guesses: string[]
  status: GameStatus
}

export interface StatsModalProps {
  open: boolean
  onClose: () => void
  stats: Stats
  todayNumber: number
  /** Today's daily game, if known. */
  daily: DailySnapshot | null
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[2rem] leading-none font-medium tabular-nums">{value}</span>
      <span className="mt-1 text-center text-[0.72rem] leading-tight">{label}</span>
    </div>
  )
}

export function StatsModal({ open, onClose, stats, todayNumber, daily }: StatsModalProps) {
  const completed = daily !== null && daily.status !== 'active'
  const won = daily?.status === 'won'
  const highlight = won && daily.puzzleNumber === todayNumber ? daily.guesses.length : null

  return (
    <Modal open={open} onClose={onClose} title="Statistics">
      <div className="grid grid-cols-4 gap-2">
        <Stat value={stats.played} label="Played" />
        <Stat value={getWinPercentage(stats)} label="Win %" />
        <Stat value={getCurrentStreak(stats, todayNumber)} label="Current Streak" />
        <Stat value={stats.maxStreak} label="Max Streak" />
      </div>

      <h3 className="mt-6 mb-2 text-[0.8rem] font-bold tracking-[0.12em] uppercase">Guess distribution</h3>
      {stats.played === 0 ? (
        <p className="text-[0.9rem] text-muted">No data yet. Finish today's puzzle to start your record.</p>
      ) : (
        <Distribution distribution={stats.distribution} highlightAttempt={highlight} />
      )}

      {completed && daily && (
        <>
          <p className="mt-6 text-center text-[0.95rem]">
            {won ? "Today's country was" : 'The country was'}{' '}
            <strong className="font-extrabold uppercase">{daily.answer.name}</strong>
          </p>
          <PostGameSlot country={daily.answer} mode="daily" />
        </>
      )}

      <div className="mt-6 flex items-center border-t border-divider pt-5">
        <div className="flex flex-1 flex-col items-center">
          <span className="text-center text-[0.72rem] font-bold tracking-[0.1em] uppercase sm:text-[0.8rem]">Next {branding.shortName}</span>
          <Countdown />
        </div>
        {completed && daily && (
          <>
            <div className="mx-4 h-12 w-px bg-divider" aria-hidden />
            <div className="flex flex-1 justify-center">
              <ShareButton
                puzzleNumber={daily.puzzleNumber}
                guesses={daily.guesses}
                answer={daily.answer.normalized}
                won={won}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
