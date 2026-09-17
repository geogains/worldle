import type { Country } from '../../data/countries'
import { countryCodeForSlug, flagUrlForCode } from '../../data/countryDetails/flags'
import { useRouter } from '../../hooks/useRouter'
import { PATHS } from '../../lib/router/routes'
import { GlobeIcon } from '../ui/icons'

export interface StudyTileProps {
  country: Country
}

/**
 * One Study browsing tile: flag + name, the whole tile is a single button
 * that navigates to the existing /results/:slug page. Deliberately derives
 * only id/name/flag from `country` — no getCountryDetails()/COUNTRY_RECORDS
 * lookup here, since the index page never renders capital/population/etc.
 * (see StudyScreen); the full facts are resolved lazily, once, by
 * CountryResultScreen after navigation.
 */
export function StudyTile({ country }: StudyTileProps) {
  const { navigate } = useRouter()
  const code = countryCodeForSlug(country.id)
  const flagUrl = code ? flagUrlForCode(code) : null

  return (
    <button
      type="button"
      className="study-tile"
      onClick={() => navigate(PATHS.results(country.id))}
      data-study-tile={country.id}
    >
      {flagUrl ? (
        <img
          className="study-tile__flag"
          src={flagUrl}
          alt={`Flag of ${country.name}`}
          loading="lazy"
          width={512}
          height={512}
          decoding="async"
        />
      ) : (
        <div className="study-tile__flag-placeholder" aria-hidden="true">
          <GlobeIcon size={28} />
        </div>
      )}
      <span className="study-tile__name">{country.name}</span>
    </button>
  )
}
