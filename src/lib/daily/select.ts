import { ANSWER_POOL, type Country } from '../../data/countries'
import { seededShuffle } from './random'

/**
 * Deterministic puzzle number -> answer mapping.
 *
 * The eligible pool is shuffled with a fixed seed into a "cycle". Puzzle n
 * takes entry (n - 1) mod poolSize from the cycle numbered floor((n-1)/poolSize).
 * Each cycle uses a different seed, so no answer repeats until every eligible
 * country has been used, and consecutive cycles are ordered differently.
 *
 * Because the mapping depends on the eligible pool, changing the dataset
 * changes the schedule. src/lib/daily/select.test.ts snapshots the first
 * answers so any change is a deliberate one.
 */
const BASE_SEED = 0x57524c44 // "WRLD"

const cycleCache = new Map<number, Country[]>()

function getCycle(cycle: number, pool: readonly Country[]): Country[] {
  const cached = cycleCache.get(cycle)
  if (cached && pool === ANSWER_POOL) return cached
  const shuffled = seededShuffle(pool, BASE_SEED + cycle * 7919)
  if (pool === ANSWER_POOL) cycleCache.set(cycle, shuffled)
  return shuffled
}

export function getDailyAnswer(
  puzzleNumber: number,
  pool: readonly Country[] = ANSWER_POOL,
): Country {
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) {
    throw new RangeError(`Invalid puzzle number: ${puzzleNumber}`)
  }
  if (pool.length === 0) throw new Error('Answer pool is empty')
  const index = puzzleNumber - 1
  const cycle = Math.floor(index / pool.length)
  const position = index % pool.length
  return getCycle(cycle, pool)[position] as Country
}
