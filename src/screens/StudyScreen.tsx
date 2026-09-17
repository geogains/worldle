import { useMemo, useState } from 'react'
import { StudyGrid } from '../components/study/StudyGrid'
import { COUNTRIES } from '../data/countries'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { normalizeCountryName } from '../lib/text/normalize'

/**
 * `/study` — a browsing/reference index over every canonical country
 * (COUNTRIES, all 200), independent of ANSWER_POOL. Each tile only shows a
 * flag + name and navigates to the existing /results/:slug page for the
 * full reference facts — this screen never resolves CountryDetails itself.
 */
export function StudyScreen() {
  useDocumentTitle('Study')
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const normalizedQuery = normalizeCountryName(query)
    if (!normalizedQuery) return COUNTRIES
    return COUNTRIES.filter((country) => normalizeCountryName(country.name).includes(normalizedQuery))
  }, [query])

  return (
    <div className="w-full min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1000px] px-4 py-5">
        <h1 className="text-[1.5rem] font-extrabold tracking-[-0.01em]">Study</h1>
        <p className="mt-1 text-[0.9rem] text-muted">
          Explore every country, learn its flag, capital, population, currency and more.
        </p>

        <div className="study-search">
          <label className="study-search__label" htmlFor="study-search-input">
            Search countries
          </label>
          <input
            id="study-search-input"
            type="search"
            className="study-search__input"
            placeholder="Search countries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <p className="study-status" aria-live="polite">
          {results.length === 0
            ? 'No countries found.'
            : `${results.length} ${results.length === 1 ? 'country' : 'countries'}`}
        </p>

        {results.length > 0 && <StudyGrid countries={results} />}
      </div>
    </div>
  )
}
