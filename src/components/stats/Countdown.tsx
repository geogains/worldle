import { useCountdown } from '../../hooks/useDailyClock'
import { formatCountdown, splitCountdown } from '../../lib/daily/date'

export function Countdown() {
  const ms = useCountdown()
  const { hours, minutes, seconds } = splitCountdown(ms)
  return (
    <time
      className="text-[1.9rem] font-medium tabular-nums"
      aria-label={`${hours} hours, ${minutes} minutes and ${seconds} seconds`}
    >
      {formatCountdown(ms)}
    </time>
  )
}
