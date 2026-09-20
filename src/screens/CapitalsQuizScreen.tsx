import { useCallback, useMemo, useState } from 'react'
import { MultipleChoiceAnswers } from '../components/quiz/MultipleChoiceAnswers'
import { QuizProgress } from '../components/quiz/QuizProgress'
import { QuizResults } from '../components/quiz/QuizResults'
import { TypeAnswerInput } from '../components/quiz/TypeAnswerInput'
import { useQuizEngine } from '../hooks/useQuizEngine'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useRouter } from '../hooks/useRouter'
import { flagUrlForCode, countryCodeForSlug } from '../data/countryDetails/flags'
import { capitalOf } from '../lib/quiz/capitals'
import { createCapitalQuestion, generateCapitalQuestions, type CapitalQuestion } from '../lib/quiz/capitalQuestions'
import { defaultRandom } from '../lib/quiz/random'
import type { QuizConfig } from '../lib/quiz/types'
import { normalizeCountryName } from '../lib/text/normalize'
import { PATHS } from '../lib/router/routes'

export interface CapitalsQuizScreenProps {
  /** Captured once by the caller (QuizPlayScreen) at mount — see its own comment for why. */
  config: QuizConfig
}

function buildInitialQuestions(config: QuizConfig): CapitalQuestion[] {
  if (config.questionCount === 'unlimited') {
    return [createCapitalQuestion(config.countryPool, config.answerStyle, [], defaultRandom)]
  }
  return generateCapitalQuestions(
    { countryPool: config.countryPool, answerStyle: config.answerStyle, questionCount: config.questionCount },
    defaultRandom,
  )
}

/**
 * `/quiz/capitals` real gameplay — the second consumer of the shared quiz
 * engine (useQuizEngine), plugged in exactly the way FlagsQuizScreen was:
 * its own question generator (capitalQuestions.ts) feeding the same
 * engine/progress/results/Play-Again/Change-Quiz machinery, with only the
 * central question presentation swapped from a flag image to a prominent
 * country name (see FlagsQuizScreen.tsx's own comment for why Play Again is
 * a `key` bump rather than an in-place reset).
 */
export function CapitalsQuizScreen({ config }: CapitalsQuizScreenProps) {
  const { navigate } = useRouter()
  const [runKey, setRunKey] = useState(0)
  const playAgain = useCallback(() => setRunKey((k) => k + 1), [])
  const changeQuiz = useCallback(() => navigate(PATHS.quiz), [navigate])

  return <CapitalsQuizRun key={runKey} config={config} onPlayAgain={playAgain} onChangeQuiz={changeQuiz} />
}

function CapitalsQuizRun({
  config,
  onPlayAgain,
  onChangeQuiz,
}: {
  config: QuizConfig
  onPlayAgain: () => void
  onChangeQuiz: () => void
}) {
  useDocumentTitle('Capitals Quiz')
  const reducedMotion = usePrefersReducedMotion()

  const initialQuestions = useMemo(() => buildInitialQuestions(config), [config])
  const totalQuestions = config.questionCount === 'unlimited' ? null : config.questionCount

  const nextQuestion = useCallback(
    (previous: CapitalQuestion) => createCapitalQuestion(config.countryPool, config.answerStyle, [previous.country.id], defaultRandom),
    [config.countryPool, config.answerStyle],
  )

  const engine = useQuizEngine<CapitalQuestion>(initialQuestions, totalQuestions, {
    getCorrectAnswerId: (q) => q.country.id,
    reducedMotion,
    nextQuestion,
  })
  const { state, currentQuestion, submitChoice, submitText, endQuiz } = engine

  if (state.phase === 'complete') {
    return (
      <div className="quiz-play-page">
        <div className="quiz-play-wrap mx-auto flex w-full max-w-[560px] flex-1 items-center justify-center px-3 py-4">
          <QuizResults config={config} correct={state.correctCount} total={state.totalAnswered} onPlayAgain={onPlayAgain} onChangeQuiz={onChangeQuiz} />
        </div>
      </div>
    )
  }

  if (!currentQuestion) return null

  const flagCode = countryCodeForSlug(currentQuestion.country.id)
  const flagUrl = flagCode ? flagUrlForCode(flagCode) : null

  const handleTypeSubmit = (text: string) => {
    // Same normalization technique FlagsQuizScreen uses for country names
    // (strip diacritics, uppercase, letters only) — it handles capitalization,
    // whitespace, repeated spaces and punctuation (e.g. "Washington, D.C.")
    // identically, with no capital-specific matching rules needed.
    const isCorrect = normalizeCountryName(text) === normalizeCountryName(currentQuestion.capital)
    submitText(isCorrect)
  }

  return (
    <div className="quiz-play-page">
      <div className="mode-bar shrink-0">
        <div className="mode-bar__status">
          <span className="eyebrow eyebrow--pill">Capitals</span>
          <span>Score: {state.correctCount}</span>
        </div>
        {totalQuestions === null && (
          <div className="mode-bar__actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={endQuiz}>
              End Quiz
            </button>
          </div>
        )}
      </div>

      <div className="quiz-play-wrap mx-auto w-full max-w-[560px] flex-1 px-3 py-4">
        <div
          className="quiz-play__card"
          data-quiz-correct-id={currentQuestion.country.id}
          data-quiz-correct-name={currentQuestion.capital}
        >
          <QuizProgress index={state.index} total={totalQuestions} />

          <h1 className="quiz-play__question">What is the capital of:</h1>

          {flagUrl ? (
            // Unlike Flags' own deliberately-generic alt text (the flag *is*
            // the puzzle there), the country name is already shown here, so
            // a descriptive alt follows the same "already revealed" pattern
            // as CountryResultCard's flag (alt="Flag of {name}").
            <img
              className="quiz-play__capital-flag"
              src={flagUrl}
              alt={`Flag of ${currentQuestion.country.name}`}
              width={512}
              height={512}
              decoding="async"
            />
          ) : (
            <div className="quiz-play__capital-flag-placeholder" aria-hidden="true" />
          )}

          <p className="quiz-play__capital-name">{currentQuestion.country.name}</p>

          {currentQuestion.choices ? (
            <MultipleChoiceAnswers
              groupLabel="Answer options"
              choices={currentQuestion.choices.map((c) => ({ id: c.id, label: capitalOf(c) ?? c.name }))}
              correctId={currentQuestion.country.id}
              selectedId={state.lastSubmission?.selectedId ?? null}
              phase={state.phase}
              onSelect={submitChoice}
            />
          ) : (
            <TypeAnswerInput
              key={state.index}
              inputLabel="Capital city"
              placeholder="Type a capital…"
              phase={state.phase}
              lastSubmission={state.lastSubmission}
              correctLabel={currentQuestion.capital}
              onSubmit={handleTypeSubmit}
            />
          )}
        </div>
      </div>
    </div>
  )
}
