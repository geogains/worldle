import { MAX_ATTEMPTS } from '../../lib/game/types'

export interface DistributionProps {
  distribution: readonly number[]
  /** 1-based attempt count to highlight (today's win). */
  highlightAttempt?: number | null
}

export function Distribution({ distribution, highlightAttempt }: DistributionProps) {
  const max = Math.max(1, ...distribution)
  return (
    <div className="space-y-1" role="list" aria-label="Guess distribution">
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const count = distribution[i] ?? 0
        const highlighted = highlightAttempt === i + 1
        const width = count === 0 ? 7 : Math.max(7, (count / max) * 100)
        return (
          <div
            key={i}
            className="flex items-center gap-2 text-[0.85rem]"
            role="listitem"
            aria-label={`${i + 1} guess${i === 0 ? '' : 'es'}: ${count} game${count === 1 ? '' : 's'}`}
          >
            <span className="w-3 text-right font-semibold tabular-nums">{i + 1}</span>
            <div className="flex-1">
              <div
                className={`flex h-5 min-w-[1.25rem] items-center justify-end rounded-sm pr-1.5 text-[0.8rem] font-bold transition-[width] duration-300 ${
                  highlighted ? 'bg-correct text-on-correct' : 'bg-absent text-on-absent'
                }`}
                style={{ width: `${width}%` }}
              >
                {count}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
