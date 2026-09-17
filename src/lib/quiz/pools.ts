import { COUNTRIES, findCountryById, type Country } from '../../data/countries'
import type { CountryPool } from './types'

/**
 * Curated, explicit classification for the "Familiar" quiz pool — the most
 * globally recognisable countries. Deliberately a plain, hand-maintained
 * list (not derived from population/GDP/any external ranking) so it stays
 * simple to review and adjust. ~45 entries, within the ~40-60 target.
 *
 * Every id here must be a real canonical country id (see pools.test.ts) —
 * if a future rename ever breaks one, resolveCountryPool() below drops it
 * safely (via findCountryById) rather than throwing.
 */
export const FAMILIAR_COUNTRY_IDS: readonly string[] = [
  'united-kingdom', 'ireland', 'france', 'germany', 'spain', 'portugal', 'italy',
  'netherlands', 'belgium', 'switzerland', 'austria', 'sweden', 'norway', 'denmark',
  'finland', 'poland', 'greece', 'turkey', 'russia',
  'united-states', 'canada', 'mexico', 'brazil', 'argentina', 'chile', 'colombia',
  'australia', 'new-zealand',
  'china', 'japan', 'south-korea', 'india', 'pakistan', 'indonesia', 'thailand',
  'vietnam', 'philippines', 'saudi-arabia', 'united-arab-emirates', 'israel',
  'egypt', 'morocco', 'south-africa', 'nigeria', 'kenya',
]

/**
 * Additional countries that join Familiar to form "Explorer" — moderately
 * less obvious, but still a broad, generally-recognised set. Explorer is
 * always FAMILIAR ∪ this list (see EXPLORER_COUNTRY_IDS below), never a
 * separately-authored list, so the nesting Familiar ⊂ Explorer ⊂ World
 * Expert can never drift out of sync by editing one list and forgetting
 * the other. ~72 entries; combined with Familiar's 45 that's ~117, within
 * the ~100-140 target.
 */
export const EXPLORER_EXTRA_COUNTRY_IDS: readonly string[] = [
  'senegal', 'cameroon', 'ghana', 'tanzania', 'uganda', 'ethiopia', 'namibia', 'botswana',
  'bolivia', 'paraguay', 'ecuador', 'uruguay',
  'slovenia', 'slovakia', 'serbia', 'croatia', 'albania', 'georgia', 'armenia',
  'jordan', 'oman', 'qatar', 'bahrain',
  'nepal', 'sri-lanka', 'laos', 'cambodia', 'mongolia',
  'iceland', 'czechia', 'hungary', 'romania', 'bulgaria', 'ukraine', 'belarus',
  'cuba', 'peru', 'venezuela', 'dominican-republic', 'jamaica', 'costa-rica', 'panama', 'guatemala',
  'malaysia', 'singapore', 'myanmar', 'bangladesh',
  'iran', 'iraq', 'syria', 'lebanon', 'kuwait', 'yemen',
  'algeria', 'tunisia', 'libya', 'sudan',
  'zimbabwe', 'zambia', 'mozambique', 'angola', 'madagascar',
  'ivory-coast', 'mali', 'burkina-faso', 'niger', 'chad', 'dr-congo', 'congo', 'gabon', 'rwanda',
  'fiji', 'papua-new-guinea', 'samoa',
]

/** Familiar ∪ its extras — never a separately-typed list. */
export const EXPLORER_COUNTRY_IDS: readonly string[] = [
  ...FAMILIAR_COUNTRY_IDS,
  ...EXPLORER_EXTRA_COUNTRY_IDS,
]

function resolveIds(ids: readonly string[]): Country[] {
  const seen = new Set<string>()
  const out: Country[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    const country = findCountryById(id)
    // Skip cleanly rather than throwing if a curated id ever stops
    // resolving (e.g. a future rename) — pools.test.ts is what actually
    // guards against that happening silently.
    if (!country) continue
    seen.add(id)
    out.push(country)
  }
  return out
}

/**
 * Resolves the user-facing Country Pool setting to real Country records.
 * World Expert derives directly from the canonical COUNTRIES array (not a
 * hand-maintained list), so it stays future-proof: any country added to
 * data/countries.ts automatically becomes part of World Expert with no
 * change needed here.
 */
export function resolveCountryPool(pool: CountryPool): readonly Country[] {
  switch (pool) {
    case 'familiar':
      return resolveIds(FAMILIAR_COUNTRY_IDS)
    case 'explorer':
      return resolveIds(EXPLORER_COUNTRY_IDS)
    case 'world-expert':
      return COUNTRIES
  }
}
