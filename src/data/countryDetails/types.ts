/**
 * Educational / results metadata for a country. This is the *resolved* shape
 * the UI consumes: every field is present, with placeholders filled in for
 * anything not yet populated (see index.ts), so components never branch on
 * missing data.
 */
export interface CountryDetails {
  /** Public URL slug and dataset id, e.g. "tanzania". */
  slug: string
  /** Display name from the canonical gameplay dataset. */
  name: string
  /** ISO 3166-1 alpha-2 code driving the flag asset, or null until mapped. */
  countryCode: string | null
  /** Public URL of the flag asset (`/flags/TZ.png`), or null until mapped. */
  flagUrl: string | null

  capital: string
  population: string
  continent: string
  currency: string
  languages: string[]
  funFact: string

  /**
   * Which of the educational fields hold verified data. Lets the UI (or a
   * future audit script) tell real facts apart from "Coming soon" without
   * string-comparing against the placeholder text.
   */
  verified: Readonly<Record<CountryFactKey, boolean>>
}

/** The educational fields that get populated per country. */
export type CountryFactKey = 'capital' | 'population' | 'continent' | 'currency' | 'languages' | 'funFact'

/** Authoring shape for a per-country record: everything optional so the dataset can grow incrementally. */
export interface CountryFactsRecord {
  capital?: string
  population?: string
  continent?: string
  currency?: string
  languages?: string[]
  funFact?: string
}
