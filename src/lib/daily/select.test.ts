import { describe, expect, it } from 'vitest'
import { ANSWER_POOL, findCountryById } from '../../data/countries'
import { getDailyAnswer } from './select'

// The alphabetical 167-entry eligible-answer id set that existed before
// Taiwan was added (i.e. the pre-Taiwan ANSWER_POOL, unshuffled) — used
// below only to prove the historical block's *membership* is unchanged, not
// its order. It intentionally does NOT match getDailyAnswer's output, which
// is this same set after a seeded shuffle.
const ALPHABETICAL_167_IDS = [
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

// The exact getDailyAnswer(1..167) OUTPUT (i.e. the pre-Taiwan *shuffled*
// schedule) captured from the codebase before Taiwan was added. This is the
// real regression guard for "existing puzzle mappings have not changed" —
// DO NOT update it; if this test fails, the historical schedule broke.
const ORIGINAL_167_SCHEDULE = [
  'tanzania', 'slovakia', 'morocco', 'moldova', 'san-marino', 'samoa', 'india', 'ukraine',
  'cyprus', 'vanuatu', 'italy', 'syria', 'honduras', 'namibia', 'singapore', 'romania',
  'bolivia', 'albania', 'senegal', 'niger', 'comoros', 'grenada', 'saint-lucia', 'mauritius',
  'germany', 'kuwait', 'monaco', 'iraq', 'argentina', 'tuvalu', 'tonga', 'russia', 'bulgaria',
  'slovenia', 'norway', 'guinea', 'fiji', 'mexico', 'sweden', 'nepal', 'togo', 'somalia',
  'belgium', 'djibouti', 'turkey', 'barbados', 'armenia', 'peru', 'belize', 'kenya', 'gambia',
  'ecuador', 'rwanda', 'sri-lanka', 'finland', 'brunei', 'guyana', 'maldives', 'lebanon',
  'burundi', 'japan', 'croatia', 'bahamas', 'thailand', 'belarus', 'czechia', 'bhutan', 'cuba',
  'luxembourg', 'andorra', 'paraguay', 'cambodia', 'vietnam', 'yemen', 'uganda', 'gabon',
  'malaysia', 'latvia', 'cameroon', 'iran', 'angola', 'mongolia', 'serbia', 'ghana',
  'zimbabwe', 'ireland', 'ethiopia', 'portugal', 'montenegro', 'lesotho', 'uzbekistan',
  'benin', 'chile', 'liberia', 'kiribati', 'panama', 'sudan', 'south-sudan', 'nauru', 'greece',
  'france', 'mozambique', 'kyrgyzstan', 'qatar', 'myanmar', 'nicaragua', 'palestine',
  'kazakhstan', 'tajikistan', 'austria', 'nigeria', 'new-zealand', 'eswatini', 'chad',
  'bangladesh', 'suriname', 'costa-rica', 'malta', 'congo', 'spain', 'dr-congo', 'lithuania',
  'haiti', 'bahrain', 'estonia', 'south-korea', 'guatemala', 'poland', 'australia', 'egypt',
  'colombia', 'north-korea', 'brazil', 'hungary', 'uruguay', 'cabo-verde', 'china',
  'azerbaijan', 'indonesia', 'jordan', 'mauritania', 'el-salvador', 'jamaica', 'israel',
  'palau', 'ivory-coast', 'iceland', 'zambia', 'eritrea', 'malawi', 'denmark', 'micronesia',
  'canada', 'pakistan', 'botswana', 'mali', 'laos', 'georgia', 'tunisia', 'venezuela', 'oman',
  'libya', 'madagascar', 'algeria', 'dominica', 'seychelles', 'timor-leste',
]

describe('getDailyAnswer', () => {
  it('is deterministic', () => {
    expect(getDailyAnswer(1)).toBe(getDailyAnswer(1))
    expect(getDailyAnswer(42).id).toBe(getDailyAnswer(42).id)
  })
  it('adjacent puzzles map to predictable, in-pool answers', () => {
    for (let n = 1; n <= 50; n++) {
      const c = getDailyAnswer(n)
      expect(ANSWER_POOL).toContain(c)
      expect(c.length).toBeGreaterThanOrEqual(4)
      expect(c.length).toBeLessThanOrEqual(10)
    }
  })
  it('the schedule is stable (snapshot of the first 10 answers)', () => {
    // If this test fails you changed the dataset or the seed. That silently
    // changes every future daily answer — only do so deliberately.
    const first = Array.from({ length: 10 }, (_, i) => getDailyAnswer(i + 1).id)
    expect(first).toMatchSnapshot()
  })
  it('rejects out-of-range puzzle numbers', () => {
    expect(() => getDailyAnswer(0)).toThrow()
    expect(() => getDailyAnswer(-3)).toThrow()
    expect(() => getDailyAnswer(1.5)).toThrow()
  })

  describe('historical block (puzzles 1-167) — frozen, must never reshuffle', () => {
    it('reproduces the exact pre-Taiwan schedule, puzzle for puzzle', () => {
      const historical = Array.from({ length: 167 }, (_, i) => getDailyAnswer(i + 1).id)
      expect(historical).toEqual(ORIGINAL_167_SCHEDULE)
    })
    it('is exactly the pre-Taiwan pool, just reordered by the shuffle', () => {
      const historical = Array.from({ length: 167 }, (_, i) => getDailyAnswer(i + 1).id)
      expect([...historical].sort()).toEqual([...ALPHABETICAL_167_IDS].sort())
    })
    it('never assigns a newly added tail entry (Taiwan, Kosovo, England, Scotland, Wales) to a historical puzzle number', () => {
      for (let n = 1; n <= 167; n++) {
        const id = getDailyAnswer(n).id
        expect(id).not.toBe('taiwan')
        expect(id).not.toBe('kosovo')
        expect(id).not.toBe('england')
        expect(id).not.toBe('scotland')
        expect(id).not.toBe('wales')
      }
    })
    it('does not repeat within the historical block', () => {
      const ids = new Set(Array.from({ length: 167 }, (_, i) => getDailyAnswer(i + 1).id))
      expect(ids.size).toBe(167)
    })
  })

  describe('tail (puzzle 168 onward) — grows to include new eligible countries', () => {
    it('covers the full current pool exactly once per cycle, including Taiwan, Kosovo, England, Scotland and Wales', () => {
      const firstTailCycle = Array.from({ length: ANSWER_POOL.length }, (_, i) => getDailyAnswer(168 + i).id)
      expect(new Set(firstTailCycle).size).toBe(ANSWER_POOL.length)
      expect(firstTailCycle).toContain('taiwan')
      expect(firstTailCycle).toContain('kosovo')
      expect(firstTailCycle).toContain('england')
      expect(firstTailCycle).toContain('scotland')
      expect(firstTailCycle).toContain('wales')
    })
    it('a second tail cycle also covers the full pool, in a different order', () => {
      const poolSize = ANSWER_POOL.length
      const firstTailCycle = Array.from({ length: poolSize }, (_, i) => getDailyAnswer(168 + i).id)
      const secondTailCycle = Array.from({ length: poolSize }, (_, i) => getDailyAnswer(168 + poolSize + i).id)
      expect(new Set(secondTailCycle).size).toBe(poolSize)
      expect(secondTailCycle).not.toEqual(firstTailCycle)
    })
    it('Taiwan is reachable as a Daily answer with a valid puzzle number', () => {
      const puzzleNumber = 168 + Array.from({ length: ANSWER_POOL.length }, (_, i) => getDailyAnswer(168 + i).id).indexOf('taiwan')
      expect(puzzleNumber).toBeGreaterThanOrEqual(168)
      expect(getDailyAnswer(puzzleNumber).id).toBe('taiwan')
      expect(getDailyAnswer(puzzleNumber)).toBe(findCountryById('taiwan'))
    })
    it('Kosovo is reachable as a Daily answer with a valid puzzle number', () => {
      const puzzleNumber = 168 + Array.from({ length: ANSWER_POOL.length }, (_, i) => getDailyAnswer(168 + i).id).indexOf('kosovo')
      expect(puzzleNumber).toBeGreaterThanOrEqual(168)
      expect(getDailyAnswer(puzzleNumber).id).toBe('kosovo')
      expect(getDailyAnswer(puzzleNumber)).toBe(findCountryById('kosovo'))
    })
    it('England, Scotland and Wales are each reachable as a Daily answer with a valid puzzle number, automatically via NEW_POOL', () => {
      for (const id of ['england', 'scotland', 'wales']) {
        const puzzleNumber = 168 + Array.from({ length: ANSWER_POOL.length }, (_, i) => getDailyAnswer(168 + i).id).indexOf(id)
        expect(puzzleNumber, id).toBeGreaterThanOrEqual(168)
        expect(getDailyAnswer(puzzleNumber).id, id).toBe(id)
        expect(getDailyAnswer(puzzleNumber), id).toBe(findCountryById(id))
      }
    })
    // NOTE: the tail's first cycle is an independent shuffle of the full
    // (historical + new) pool, so — unlike within a single cycle — a country
    // CAN reappear sooner than a full pool-length gap right at the seam
    // between the historical block and the tail (e.g. puzzle 168 may repeat
    // puzzle 1's answer). This is the accepted cost of never reshuffling the
    // historical block when the pool grows; it self-corrects after puzzle
    // 168, since every tail cycle from then on is internally non-repeating.
  })
})
