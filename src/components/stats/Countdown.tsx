import { useCountdown } from '../../hooks/useDailyClock'
import { formatCountdown, splitCountdown } from '../../lib/daily/date'

export function Countdown() {
  const ms = useCountdown()
  const { hours, minutes, seconds } = splitCountdown(ms)
  return (
    <time
      className="font-display text-[1.9rem] font-semibold tabular-nums text-ink"
      aria-label={`${hours} hours, ${minutes} minutes and ${seconds} seconds`}
    >
      {formatCountdown(ms)}
    </time>
  )
}
