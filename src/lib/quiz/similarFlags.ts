import { findCountryById } from '../../data/countries'

/**
 * Curated V1 "looks similar" groups for the World Expert Multiple Choice
 * distractor strategy (see distractors.ts) — deliberately small and
 * hand-picked rather than an attempt to classify every flag or compute
 * visual similarity. Canonical country ids, not display strings, so a
 * rename is caught by similarFlags.test.ts rather than silently going
 * stale. A country can appear in more than one group (e.g. Russia is both
 * a "horizontal tricolour" and a "Slavic tricolour" confusable).
 *
 * Any id here that stops resolving to a real country (see
 * getSimilarCountryIds()) is skipped cleanly, never thrown on — this file
 * has no opinion on what's currently supported, data/countries.ts does.
 */
export const SIMILAR_FLAG_GROUPS: readonly (readonly string[])[] = [
  ['romania', 'chad', 'moldova', 'andorra'],
  ['indonesia', 'monaco', 'poland', 'singapore'],
  ['ireland', 'ivory-coast', 'italy'],
  ['netherlands', 'luxembourg', 'russia', 'france'],
  ['australia', 'new-zealand', 'fiji', 'tuvalu'],
  ['colombia', 'ecuador', 'venezuela'],
  ['slovenia', 'slovakia', 'russia', 'serbia', 'croatia'],
  ['norway', 'iceland', 'denmark', 'sweden', 'finland'], // Nordic cross flags
  ['guinea', 'mali', 'senegal'],
  ['hungary', 'bulgaria', 'iran', 'tajikistan'],
  ['egypt', 'iraq', 'syria', 'yemen'],
  ['jordan', 'palestine', 'sudan', 'kuwait'],
  ['qatar', 'bahrain'],
  ['haiti', 'liechtenstein'],
  ['united-states', 'liberia', 'malaysia'],
]

/** Every group filtered down to ids that currently resolve to a real country. */
const SUPPORTED_GROUPS: readonly (readonly string[])[] = SIMILAR_FLAG_GROUPS.map((group) =>
  group.filter((id) => findCountryById(id) !== undefined),
)

const SIMILAR_BY_ID: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, Set<string>>()
  for (const group of SUPPORTED_GROUPS) {
    for (const id of group) {
      const others = map.get(id) ?? new Set<string>()
      for (const other of group) {
        if (other !== id) others.add(other)
      }
      map.set(id, others)
    }
  }
  return new Map(Array.from(map.entries()).map(([id, set]) => [id, Array.from(set)]))
})()

/**
 * All ids that are curated as visually confusable with `id`, deduplicated
 * across every group it appears in. Empty array if `id` isn't in any group
 * (most countries aren't — this is intentionally a small V1 set).
 */
export function getSimilarCountryIds(id: string): readonly string[] {
  return SIMILAR_BY_ID.get(id) ?? []
}
