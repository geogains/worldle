import { findCountryById } from '../../data/countries'

/**
 * Curated V1 "commonly confused capital" relationships for the World Expert
 * Multiple Choice distractor strategy (see capitalDistractors.ts) —
 * deliberately small and hand-picked, not a semantic similarity engine.
 * Keyed by the *question* country's id, mapping to other countries whose
 * capital is a strong, geographically-plausible distractor for it.
 *
 * Directional (unlike similarFlags.ts's symmetric groups) because "commonly
 * confused with X" is not always a two-way relationship, and the source
 * list this was curated from was itself directional (e.g. Canada's group
 * includes Australia, but Australia's own group does not need Canada back).
 *
 * Every value here must be a real capital *actually in the supported
 * dataset* — famous non-capital cities (Sydney, Melbourne, Rio de Janeiro,
 * São Paulo, Istanbul, Dubai, …) are deliberately excluded from every group
 * below even where a common "confusable city" list would include them, so
 * this file only ever produces factually correct distractors.
 *
 * Any id here that stops resolving to a real country (see
 * getSimilarCapitalCountryIds()) is skipped cleanly, never thrown on — this
 * file has no opinion on what's currently supported, data/countries.ts does.
 */
export const CAPITAL_CONFUSION_GROUPS: Readonly<Record<string, readonly string[]>> = {
  // Canberra vs Sydney/Melbourne (not capitals, excluded) / Wellington.
  australia: ['new-zealand'],
  // Brasília vs Rio de Janeiro/São Paulo (not capitals, excluded) / Buenos Aires.
  brazil: ['argentina'],
  // Ankara vs Athens / Sofia / Tbilisi.
  turkey: ['greece', 'bulgaria', 'georgia'],
  // Bern vs Vienna / Brussels / Luxembourg — small, easily-confused European capitals.
  switzerland: ['austria', 'belgium', 'luxembourg'],
  // Ottawa vs Washington, D.C. / Canberra / Wellington.
  canada: ['united-states', 'australia', 'new-zealand'],
  // Rabat vs Tunis / Algiers / Cairo — North African capitals.
  morocco: ['tunisia', 'algeria', 'egypt'],
  // Dodoma vs Nairobi / Kampala / Kigali — East African capitals.
  tanzania: ['kenya', 'uganda', 'rwanda'],
  // Abuja vs Accra / Yaoundé / Dakar — West/Central African capitals.
  nigeria: ['ghana', 'cameroon', 'senegal'],
  // Abu Dhabi vs Doha / Muscat / Riyadh — Gulf capitals.
  'united-arab-emirates': ['qatar', 'oman', 'saudi-arabia'],
  // Astana vs Tashkent / Bishkek / Dushanbe — Central Asian capitals.
  kazakhstan: ['uzbekistan', 'kyrgyzstan', 'tajikistan'],
}

const SUPPORTED_GROUPS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.entries(CAPITAL_CONFUSION_GROUPS)
    .filter(([id]) => findCountryById(id) !== undefined)
    .map(([id, others]) => [id, others.filter((otherId) => findCountryById(otherId) !== undefined)]),
)

/**
 * Ids curated as capital-confusable with `id`, for the World Expert
 * distractor strategy. Empty array if `id` isn't in the curated set (most
 * countries aren't — this is intentionally a small V1 set).
 */
export function getSimilarCapitalCountryIds(id: string): readonly string[] {
  return SUPPORTED_GROUPS[id] ?? []
}
