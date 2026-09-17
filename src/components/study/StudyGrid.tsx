import type { Country } from '../../data/countries'
import { StudyTile } from './StudyTile'

export interface StudyGridProps {
  countries: readonly Country[]
}

/** Responsive grid of StudyTile — purely presentational, no data fetching. */
export function StudyGrid({ countries }: StudyGridProps) {
  return (
    <ul className="study-grid" aria-label="Countries">
      {countries.map((country) => (
        <li key={country.id} className="study-grid__item">
          <StudyTile country={country} />
        </li>
      ))}
    </ul>
  )
}
