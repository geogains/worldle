import type { ReactNode } from 'react'
import { PLACEHOLDER, type CountryDetails } from '../../data/countryDetails'
import type { ResultContext } from '../../lib/results/context'
import { resultSourceLabel, resultSummary } from '../../lib/results/format'
import { GlobeIcon } from '../ui/icons'

export interface CountryResultCardProps {
  details: CountryDetails
  /** How the player got here; null renders the card as a standalone country page (no performance data). */
  context: ResultContext | null
  /** Coral primary CTA, e.g. "Play again". */
  primaryAction: ReactNode
  /** e.g. the Share button. */
  secondaryAction?: ReactNode
  /** Quiet text action rendered last. */
  tertiaryAction?: ReactNode
  /** Heading level for the country name (the overlay already announces a dialog title). */
  headingLevel?: 'h1' | 'h2' | 'h3'
}

interface Fact {
  key: keyof CountryDetails
  label: string
  value: string
  verified: boolean
}

function facts(details: CountryDetails): Fact[] {
  return [
    { key: 'capital', label: 'Capital', value: details.capital, verified: details.verified.capital },
    { key: 'population', label: 'Population', value: details.population, verified: details.verified.population },
    { key: 'continent', label: 'Continent', value: details.continent, verified: details.verified.continent },
    { key: 'currency', label: 'Currency', value: details.currency, verified: details.verified.currency },
    { key: 'languages', label: 'Languages', value: details.languages.join(', '), verified: details.verified.languages },
  ]
}

/**
 * The central educational result surface: flag + name, the player's result
 * (when there is one), a fact grid and a "Did you know?" section, then the
 * actions. Purely presentational — data comes from the country-details layer
 * and the result context, actions from the caller — so the same card serves
 * the post-game overlay and a standalone country page.
 */
export function CountryResultCard(props: CountryResultCardProps) {
  const { details, context, primaryAction, secondaryAction, tertiaryAction, headingLevel = 'h3' } = props
  const Heading = headingLevel
  return (
    <div className="country-result" data-country-result={details.slug}>
      <div className="country-result__header">
        {details.flagUrl ? (
          <img
            className="country-result__flag"
            src={details.flagUrl}
            alt={`Flag of ${details.name}`}
            width={512}
            height={512}
            decoding="async"
          />
        ) : (
          <div className="country-result__flag-placeholder" aria-hidden="true">
            <GlobeIcon size={28} />
          </div>
        )}
        <Heading className="country-result__name">{details.name}</Heading>
        {context && (
          <div className="country-result__result">
            <span className="eyebrow eyebrow--pill">{resultSourceLabel(context)}</span>
            <p
              className={`country-result__summary ${context.status === 'won' ? 'country-result__summary--won' : 'country-result__summary--lost'}`}
            >
              {resultSummary(context)}
            </p>
          </div>
        )}
      </div>

      <dl className="country-result__facts" aria-label={`${details.name} facts`}>
        {facts(details).map((f) => (
          <div className="country-result__fact" key={f.key}>
            <dt className="country-result__fact-label">{f.label}</dt>
            <dd className={`country-result__fact-value ${f.verified ? '' : 'country-result__fact-value--placeholder'}`}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="country-result__fun-fact" aria-labelledby={`fun-fact-${details.slug}`}>
        <h4 id={`fun-fact-${details.slug}`} className="eyebrow country-result__fun-fact-title">
          Did you know?
        </h4>
        <p className={`country-result__fun-fact-text ${details.verified.funFact ? '' : 'country-result__fact-value--placeholder'}`}>
          {details.funFact || PLACEHOLDER.funFact}
        </p>
      </section>

      <div className="country-result__actions">
        {primaryAction}
        {secondaryAction}
      </div>
      {tertiaryAction && <div className="country-result__tertiary">{tertiaryAction}</div>}
    </div>
  )
}
