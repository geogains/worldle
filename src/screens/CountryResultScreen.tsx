import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { GameView } from '../components/game/GameView'
import { ShareButton } from '../components/game/ShareButton'
import { CountryResultCard } from '../components/results/CountryResultCard'
import { CountryResultOverlay } from '../components/results/CountryResultOverlay'
import { branding } from '../config/branding'
import { adjacentCountries } from '../data/countries'
import { getCountryDetails, type CountryDetails } from '../data/countryDetails'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useRouter } from '../hooks/useRouter'
import { formatPuzzleDate } from '../lib/daily/date'
import { createPracticeGame } from '../lib/practice/session'
import { resolveResultContext, type ResultContext } from '../lib/results/context'
import { countryResultsMeta } from '../lib/results/meta'
import { PATHS } from '../lib/router/routes'
import { NotFoundScreen } from './NotFoundScreen'

export interface CountryResultScreenProps {
  countrySlug: string
  /** Opens the app-level Statistics modal (offered as a quiet action after a daily game). */
  onOpenStats?: () => void
}

/**
 * `/results/:countrySlug` — the one reusable country results page.
 *
 * slug -> country-details lookup -> (completed game context?) -> card.
 *
 * With a matching completed game in storage, the real board/keyboard for that
 * game is rendered beneath the card so the page reads as a continuation of
 * the game that just ended (and survives a refresh, since it is restored from
 * the same store the game was played from). Without one, the card is the
 * page: an educational country page with no performance data and nothing
 * fabricated.
 */
export function CountryResultScreen({ countrySlug, onOpenStats }: CountryResultScreenProps) {
  const details = useMemo(() => getCountryDetails(countrySlug), [countrySlug])
  const context = useMemo(() => (details ? resolveResultContext(countrySlug) : null), [countrySlug, details])
  useDocumentTitle(details ? countryResultsMeta(details).title : null)

  if (!details) {
    return (
      <NotFoundScreen
        title={`That country isn't in ${branding.name}`}
        message="We couldn't find a results page for that country."
      />
    )
  }
  if (!context) return <StandaloneCountryPage details={details} />
  return <CompletedGameResults details={details} context={context} onOpenStats={onOpenStats} />
}

/* ------------------------------------------------------------------ */

function ModeLabel({ context }: { context: ResultContext }) {
  switch (context.source) {
    case 'practice':
      return (
        <>
          <span className="eyebrow eyebrow--pill">Practice</span>
          <span>
            Unlimited games <span aria-hidden>·</span> Doesn't affect stats
          </span>
        </>
      )
    case 'daily':
      return (
        <>
          <span className="font-semibold text-ink">
            {branding.name} #{context.puzzleNumber}
          </span>
          <span aria-hidden> · </span>
          {formatPuzzleDate(context.puzzleNumber ?? 1)}
        </>
      )
    case 'archive':
      return (
        <>
          <span className="font-semibold text-ink">Archive #{context.puzzleNumber}</span>
          <span aria-hidden> · </span>
          {formatPuzzleDate(context.puzzleNumber ?? 1)} · Replay
        </>
      )
  }
}

function shareLabel(context: ResultContext): string | undefined {
  if (context.source === 'practice') return `${branding.name} Practice`
  if (context.source === 'archive') return `${branding.name} Archive`
  return undefined
}

function CompletedGameResults({
  details,
  context,
  onOpenStats,
}: {
  details: CountryDetails
  context: ResultContext
  onOpenStats?: () => void
}) {
  const { navigate } = useRouter()
  const [cardOpen, setCardOpen] = useState(true)
  const openCard = useCallback(() => setCardOpen(true), [])
  const closeCard = useCallback(() => setCardOpen(false), [])

  // Same new-game path as the Practice screen's own "Play again".
  const playAgain = useCallback(() => {
    createPracticeGame(context.country.id)
    navigate(PATHS.practice)
  }, [context.country.id, navigate])

  let primaryAction: ReactNode
  let tertiaryAction: ReactNode = null
  switch (context.source) {
    case 'practice':
      primaryAction = (
        <button type="button" className="btn btn--primary" onClick={playAgain}>
          Play again
        </button>
      )
      // No tertiary action here — see the fullscreen result's compact
      // hierarchy (flag, name, badge, message, facts, fun fact, actions).
      break
    case 'daily':
      primaryAction = (
        <button type="button" className="btn btn--primary" onClick={() => navigate(PATHS.practice)}>
          Play practice
        </button>
      )
      tertiaryAction = onOpenStats ? (
        <button type="button" className="btn btn--text" onClick={onOpenStats}>
          View statistics
        </button>
      ) : null
      break
    case 'archive':
      primaryAction = (
        <button type="button" className="btn btn--primary" onClick={() => navigate(PATHS.archive)}>
          Back to archive
        </button>
      )
      tertiaryAction = (
        <button type="button" className="btn btn--text" onClick={() => navigate(PATHS.daily)}>
          Today's puzzle
        </button>
      )
      break
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <GameView
        key={`results-${context.source}-${context.country.id}-${context.puzzleNumber ?? ''}`}
        answer={context.country}
        initialGuesses={context.guesses}
        label={<ModeLabel context={context} />}
        completedAction={
          <>
            <button type="button" className="btn btn--secondary btn--sm" onClick={openCard} data-results-button>
              Results
            </button>
            {context.source === 'practice' && (
              <button type="button" className="btn btn--primary btn--sm" onClick={playAgain}>
                Play again
              </button>
            )}
          </>
        }
      />
      <CountryResultOverlay
        open={cardOpen}
        onClose={closeCard}
        details={details}
        context={context}
        primaryAction={primaryAction}
        secondaryAction={
          <ShareButton
            guesses={context.guesses}
            answer={context.country.normalized}
            won={context.status === 'won'}
            label={shareLabel(context)}
            puzzleNumber={context.puzzleNumber}
            variant="secondary"
          />
        }
        tertiaryAction={tertiaryAction}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */

function StandaloneCountryPage({ details }: { details: CountryDetails }) {
  const { navigate } = useRouter()
  // Same canonical, alphabetically-ordered COUNTRIES collection the Study
  // grid renders from — Previous/Next can never drift out of sync with it.
  // Null only for a country with no results page (details wouldn't have
  // resolved either), so this is effectively always present here.
  const nav = useMemo(() => adjacentCountries(details.slug), [details.slug])
  return (
    <div className="country-result-page">
      <div className="country-result-page__panel modal-panel">
        <CountryResultCard
          details={details}
          context={null}
          headingLevel="h1"
          navigation={
            nav
              ? {
                  previousName: nav.previous.name,
                  nextName: nav.next.name,
                  onPrevious: () => navigate(PATHS.results(nav.previous.id)),
                  onNext: () => navigate(PATHS.results(nav.next.id)),
                }
              : undefined
          }
          primaryAction={
            <button type="button" className="btn btn--primary" onClick={() => navigate(PATHS.quiz)}>
              Quiz
            </button>
          }
          secondaryAction={
            <button type="button" className="btn btn--secondary" onClick={() => navigate(PATHS.study)}>
              Back to Study
            </button>
          }
        />
      </div>
    </div>
  )
}
