import { branding } from '../../config/branding'
import type { CountryDetails } from '../../data/countryDetails'

export interface PageMeta {
  title: string
  description: string
}

/**
 * Per-country page metadata for `/results/:slug`. Kept as a pure function so
 * a future prerender / SEO step (sitemap, og tags) can reuse it verbatim.
 */
export function countryResultsMeta(details: CountryDetails): PageMeta {
  return {
    title: `${branding.name} — ${details.name} Results`,
    description: `Facts about ${details.name}: capital, population, continent, currency and languages. Play ${branding.name}, the daily country word puzzle.`,
  }
}
