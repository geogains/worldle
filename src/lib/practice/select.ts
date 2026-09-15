import { ANSWER_POOL, type Country } from '../../data/countries'

/**
 * Random practice answer. Avoids immediately repeating `excludeId` when the
 * pool has more than one entry. Uses Math.random (practice is not shared).
 */
export function pickPracticeAnswer(
  excludeId: string | null = null,
  pool: readonly Country[] = ANSWER_POOL,
  random: () => number = Math.random,
): Country {
  if (pool.length === 0) throw new Error('Answer pool is empty')
  const candidates = pool.length > 1 ? pool.filter((c) => c.id !== excludeId) : pool
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  return candidates[index] as Country
}
