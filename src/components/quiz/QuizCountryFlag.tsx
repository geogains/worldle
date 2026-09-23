import type { Country } from '../../data/countries'
import { countryCodeForSlug, flagUrlForCode } from '../../data/countryDetails/flags'

export interface QuizCountryFlagProps {
  country: Country
}

/**
 * Shared "supporting" flag image for quiz question types where the country
 * is already named/implied by the prompt — originally Capitals' "What is
 * the capital of:", now reused as-is (same asset, same CSS treatment) by
 * forward-direction Languages questions rather than building a second,
 * visually different flag component. Not used by Flags' own gameplay
 * image (a different, larger, deliberately-generic-alt "guess this flag"
 * treatment — see .quiz-play__flag) and never rendered for a question
 * direction where the flag would hand the player the answer (e.g. reverse
 * Languages questions — the caller decides that, not this component).
 */
export function QuizCountryFlag({ country }: QuizCountryFlagProps) {
  const flagCode = countryCodeForSlug(country.id)
  const flagUrl = flagCode ? flagUrlForCode(flagCode) : null

  return flagUrl ? (
    <img
      className="quiz-play__country-flag"
      src={flagUrl}
      alt={`Flag of ${country.name}`}
      width={512}
      height={512}
      decoding="async"
    />
  ) : (
    <div className="quiz-play__country-flag-placeholder" aria-hidden="true" />
  )
}
