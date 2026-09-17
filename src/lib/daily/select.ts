import { ANSWER_POOL, findCountryById, type Country } from '../../data/countries'
import { seededShuffle } from './random'

/**
 * Deterministic puzzle number -> answer mapping, split into a frozen
 * "historical" block plus a growable "tail" so the eligible pool can gain
 * new countries (e.g. Taiwan, then Kosovo, then England/Scotland/Wales)
 * without reshuffling puzzles that are already scheduled or played.
 *
 * Naively re-deriving the shuffle from the live `ANSWER_POOL` every time the
 * dataset changes does NOT extend the old schedule — Fisher-Yates consumes
 * one PRNG draw per array index counting down from the end, so changing the
 * pool's *length* shifts every draw, producing an essentially unrelated
 * permutation even for entries that were already in the pool. Simply adding
 * a country to the dataset would have silently reassigned puzzle #1 (and
 * every other puzzle) to a different answer.
 *
 * HISTORICAL_ANSWER_IDS is a permanent, frozen snapshot of the 167-entry
 * eligible pool exactly as it existed before Taiwan was added (same ids,
 * same order the original `ANSWER_POOL` had). It — not the live pool — is
 * what puzzles 1-167 are shuffled from, so that block reproduces the
 * original schedule bit-for-bit forever, regardless of later dataset growth.
 *
 * Once puzzle numbers move past the historical block, scheduling switches to
 * a "tail" scheme built from the *current* full eligible pool (historical +
 * any new entries, e.g. Taiwan), shuffled the same way the original scheme
 * always worked (fixed seed per cycle, no repeat within a cycle). Because no
 * puzzle past #167 existed yet when Taiwan was added, this tail is free to
 * define its own schedule without breaking anything already played.
 *
 * DO NOT edit HISTORICAL_ANSWER_IDS. To add another eligible country in
 * future without reshuffling puzzles already reached in the tail, take a new
 * snapshot: set HISTORICAL_ANSWER_IDS to the current FULL_POOL id order
 * (below) before adding the new country, so the tail-so-far becomes the new
 * frozen historical block and only puzzles beyond it use the new pool.
 */
const HISTORICAL_ANSWER_IDS: readonly string[] = [
  'albania', 'algeria', 'andorra', 'angola', 'argentina', 'armenia', 'australia', 'austria',
  'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium', 'belize',
  'benin', 'bhutan', 'bolivia', 'botswana', 'brazil', 'brunei', 'bulgaria', 'burundi',
  'cabo-verde', 'cambodia', 'cameroon', 'canada', 'chad', 'chile', 'china', 'colombia',
  'comoros', 'congo', 'costa-rica', 'croatia', 'cuba', 'cyprus', 'czechia', 'denmark',
  'djibouti', 'dominica', 'dr-congo', 'ecuador', 'egypt', 'el-salvador', 'eritrea', 'estonia',
  'eswatini', 'ethiopia', 'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia', 'germany',
  'ghana', 'greece', 'grenada', 'guatemala', 'guinea', 'guyana', 'haiti', 'honduras', 'hungary',
  'iceland', 'india', 'indonesia', 'iran', 'iraq', 'ireland', 'israel', 'italy', 'ivory-coast',
  'jamaica', 'japan', 'jordan', 'kazakhstan', 'kenya', 'kiribati', 'kuwait', 'kyrgyzstan',
  'laos', 'latvia', 'lebanon', 'lesotho', 'liberia', 'libya', 'lithuania', 'luxembourg',
  'madagascar', 'malawi', 'malaysia', 'maldives', 'mali', 'malta', 'mauritania', 'mauritius',
  'mexico', 'micronesia', 'moldova', 'monaco', 'mongolia', 'montenegro', 'morocco',
  'mozambique', 'myanmar', 'namibia', 'nauru', 'nepal', 'new-zealand', 'nicaragua', 'niger',
  'nigeria', 'north-korea', 'norway', 'oman', 'pakistan', 'palau', 'palestine', 'panama',
  'paraguay', 'peru', 'poland', 'portugal', 'qatar', 'romania', 'russia', 'rwanda',
  'saint-lucia', 'samoa', 'san-marino', 'senegal', 'serbia', 'seychelles', 'singapore',
  'slovakia', 'slovenia', 'somalia', 'south-korea', 'south-sudan', 'spain', 'sri-lanka',
  'sudan', 'suriname', 'sweden', 'syria', 'tajikistan', 'tanzania', 'thailand', 'timor-leste',
  'togo', 'tonga', 'tunisia', 'turkey', 'tuvalu', 'uganda', 'ukraine', 'uruguay', 'uzbekistan',
  'vanuatu', 'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe',
]

const HISTORICAL_POOL: readonly Country[] = HISTORICAL_ANSWER_IDS.map((id) => {
  const country = findCountryById(id)
  if (!country) throw new Error(`Historical answer id missing from dataset: ${id}`)
  return country
})

const historicalIdSet = new Set(HISTORICAL_ANSWER_IDS)

/**
 * New eligible entries not in the frozen historical block — computed
 * automatically from ANSWER_POOL, so any future addition to the dataset
 * joins this the same way with no logic change here. Currently: Taiwan,
 * Kosovo, England, Scotland, Wales.
 */
const NEW_POOL: readonly Country[] = ANSWER_POOL.filter((c) => !historicalIdSet.has(c.id))

/** Full pool used for tail scheduling: historical block + new entries, in that order. */
const FULL_POOL: readonly Country[] = [...HISTORICAL_POOL, ...NEW_POOL]

const BASE_SEED = 0x57524c44 // "WRLD" — historical block seed, unchanged since V1.
const TAIL_BASE_SEED = 0x57524c45 // distinct seed for the post-historical tail.

const historicalCycleCache = new Map<number, Country[]>()
const tailCycleCache = new Map<number, Country[]>()

function shuffleCycle(
  cache: Map<number, Country[]>,
  cycle: number,
  pool: readonly Country[],
  seed: number,
): Country[] {
  const cached = cache.get(cycle)
  if (cached) return cached
  const shuffled = seededShuffle(pool, seed + cycle * 7919)
  cache.set(cycle, shuffled)
  return shuffled
}

/**
 * Deterministic puzzle number -> answer mapping.
 *
 * For the default pool (the live `ANSWER_POOL`), puzzles 1..167 always come
 * from the frozen historical shuffle (see above); puzzle 168 onward comes
 * from a normal seeded-cycle shuffle of the full current pool, exactly the
 * way the whole schedule used to work before there was a historical/tail
 * split to protect. A custom `pool` (e.g. in tests) bypasses the split
 * entirely and uses that original single-pool scheme directly.
 */
export function getDailyAnswer(
  puzzleNumber: number,
  pool: readonly Country[] = ANSWER_POOL,
): Country {
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) {
    throw new RangeError(`Invalid puzzle number: ${puzzleNumber}`)
  }
  if (pool.length === 0) throw new Error('Answer pool is empty')
  const index = puzzleNumber - 1

  if (pool !== ANSWER_POOL) {
    // Custom pool (e.g. tests): the original single-pool scheme, uncached —
    // callers passing a custom pool are rare and don't need memoization.
    const cycle = Math.floor(index / pool.length)
    const position = index % pool.length
    return seededShuffle(pool, BASE_SEED + cycle * 7919)[position] as Country
  }

  if (index < HISTORICAL_POOL.length) {
    // Always cycle 0: HISTORICAL_POOL.length (167) has never grown, so every
    // historical puzzle number falls in the single original cycle.
    return shuffleCycle(historicalCycleCache, 0, HISTORICAL_POOL, BASE_SEED)[index] as Country
  }

  const tailIndex = index - HISTORICAL_POOL.length
  const cycle = Math.floor(tailIndex / FULL_POOL.length)
  const position = tailIndex % FULL_POOL.length
  return shuffleCycle(tailCycleCache, cycle, FULL_POOL, TAIL_BASE_SEED)[position] as Country
}
