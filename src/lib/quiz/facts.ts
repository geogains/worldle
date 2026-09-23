import { findCountryById, type Country } from '../../data/countries'
import { FACT_ENTRIES, type FactEntry } from './factsData'
import type { AnswerStyle, CountryPool } from './types'

/**
 * Trivia-difficulty rank for each CountryPool value, used to make the
 * Facts tiers nest the same way FAMILIAR_COUNTRY_IDS/EXPLORER_COUNTRY_IDS
 * already nest in pools.ts: Easy's pool is 'familiar' entries only,
 * Medium's is 'familiar' + 'explorer', Expert's is every entry. See
 * factsData.ts's module doc comment for why "tier" means trivia difficulty
 * here rather than the geographic-familiarity meaning CountryPool has for
 * every other quiz mode.
 */
const TIER_RANK: Record<CountryPool, number> = { familiar: 0, explorer: 1, 'world-expert': 2 }

/** Every curated FactEntry whose tier is at or below `pool`'s rank. */
export function eligibleFactEntries(pool: CountryPool): FactEntry[] {
  const maxRank = TIER_RANK[pool]
  return FACT_ENTRIES.filter((e) => TIER_RANK[e.tier] <= maxRank)
}

/**
 * Every FactEntry usable for the given pool + answer style — for
 * 'type-answer', further restricted to entries deliberately assessed as
 * having one defensible answer without Multiple Choice options to lean on
 * (see FactEntry.typeAnswerEligible's doc comment).
 */
export function eligibleFactEntriesFor(pool: CountryPool, answerStyle: AnswerStyle): FactEntry[] {
  const entries = eligibleFactEntries(pool)
  return answerStyle === 'type-answer' ? entries.filter((e) => e.typeAnswerEligible) : entries
}

const FACT_ENTRY_BY_COUNTRY_ID: ReadonlyMap<string, FactEntry> = new Map(FACT_ENTRIES.map((e) => [e.countryId, e]))

/** The curated FactEntry for a country, or null if it has none (every canonical country currently has one — see factQuestions.test.ts's 200/200 coverage check). */
export function factEntryFor(country: Country): FactEntry | null {
  return FACT_ENTRY_BY_COUNTRY_ID.get(country.id) ?? null
}

/** Resolves a FactEntry's distractor ids to real Country records, silently dropping any id that somehow fails to resolve rather than throwing. */
export function resolveDistractors(entry: FactEntry): Country[] {
  return entry.distractorIds.map((id) => findCountryById(id)).filter((c): c is Country => c !== undefined)
}
