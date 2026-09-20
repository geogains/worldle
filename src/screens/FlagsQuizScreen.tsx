import { useCallback, useMemo, useState } from 'react'
import { MultipleChoiceAnswers } from '../components/quiz/MultipleChoiceAnswers'
import { QuizProgress } from '../components/quiz/QuizProgress'
import { QuizResults } from '../components/quiz/QuizResults'
import { TypeAnswerInput } from '../components/quiz/TypeAnswerInput'
import { flagUrlForCode, countryCodeForSlug } from '../data/countryDetails/flags'
import { useQuizEngine } from '../hooks/useQuizEngine'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useRouter } from '../hooks/useRouter'
import { createFlagQuestion, generateFlagQuestions, type FlagQuestion } from '../lib/quiz/flagQuestions'
import { defaultRandom } from '../lib/quiz/random'
import type { QuizConfig } from '../lib/quiz/types'
import { normalizeCountryName } from '../lib/text/normalize'
import { PATHS } from '../lib/router/routes'

export interface FlagsQuizScreenProps {
  /** Captured once by the caller (QuizPlayScreen) at mount — see its own comment for why. */
  config: QuizConfig
}

function buildInitialQuestions(config: QuizConfig): FlagQuestion[] {
  if (config.questionCount === 'unlimited') {
    return [createFlagQuestion(config.countryPool, config.answerStyle, [], defaultRandom)]
  }
  return generateFlagQuestions(
    { countryPool: config.countryPool, answerStyle: config.answerStyle, questionCount: config.questionCount },
    defaultRandom,
  )
}

/**
 * `/quiz/flags` real gameplay — the first consumer of the shared quiz
 * engine (useQuizEngine). `config` is captured once by QuizPlayScreen and
 * never re-read from storage mid-run, so Play Again can guarantee the
 * exact same configuration even if storage changed for any reason.
 *
 * Play Again is implemented as a `key` bump on the inner `<FlagsQuizRun>`
 * rather than resetting state in place: useQuizEngine's internal
 * useReducer only evaluates its lazy initializer on mount, so re-running
 * buildInitialQuestions() with a new value alone would never actually
 * reset the engine — remounting the whole run (fresh question set, fresh
 * engine, fresh TypeAnswerInput text) is the correct way to restart, and
 * matches how this codebase already remounts CountryResultScreen by slug.
 */
export function FlagsQuizScreen({ config }: FlagsQuizScreenProps) {
  const { navigate } = useRouter()
  const [runKey, setRunKey] = useState(0)
  const playAgain = useCallback(() => setRunKey((k) => k + 1), [])
  const changeQuiz = useCallback(() => navigate(PATHS.quiz), [navigate])

  return <FlagsQuizRun key={runKey} config={config} onPlayAgain={playAgain} onChangeQuiz={changeQuiz} />
}

function FlagsQuizRun({
  config,
  onPlayAgain,
  onChangeQuiz,
}: {
  config: QuizConfig
  onPlayAgain: () => void
  onChangeQuiz: () => void
}) {
  useDocumentTitle('Flags Quiz')
  const reducedMotion = usePrefersReducedMotion()

  const initialQuestions = useMemo(() => buildInitialQuestions(config), [config])
  const totalQuestions = config.questionCount === 'unlimited' ? null : config.questionCount

  const nextQuestion = useCallback(
    (previous: FlagQuestion) => createFlagQuestion(config.countryPool, config.answerStyle, [previous.country.id], defaultRandom),
    [config.countryPool, config.answerStyle],
  )

  const engine = useQuizEngine<FlagQuestion>(initialQuestions, totalQuestions, {
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
    // Reuses the exact same normalization the Daily/Practice game already
    // applies to guesses (strip diacritics, uppercase, letters only) — so
    // case, whitespace, repeated spaces and punctuation are all handled
    // consistently with the rest of the app, with no new matching rules.
    const isCorrect = normalizeCountryName(text) === currentQuestion.country.normalized
    submitText(isCorrect)
  }

  return (
    <div className="quiz-play-page">
      <div className="mode-bar shrink-0">
        <div className="mode-bar__status">
          <span className="eyebrow eyebrow--pill">Flags</span>
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
          data-quiz-correct-name={currentQuestion.country.name}
        >
          <QuizProgress index={state.index} total={totalQuestions} />

          <h1 className="quiz-play__question">Which country does this flag belong to?</h1>

          {flagUrl ? (
            // Deliberately not "Flag of {name}" — that would hand the answer
            // to a screen reader while a sighted player still has to work it
            // out. A generic, meaningful (non-empty) alt says an image is
            // there without revealing the answer either way.
            <img className="quiz-play__flag" src={flagUrl} alt="Country flag" width={512} height={512} decoding="async" />
          ) : (
            <div className="quiz-play__flag-placeholder" aria-hidden="true" />
          )}

          {currentQuestion.choices ? (
            <MultipleChoiceAnswers
              groupLabel="Answer options"
              choices={currentQuestion.choices.map((c) => ({ id: c.id, label: c.name }))}
              correctId={currentQuestion.country.id}
              selectedId={state.lastSubmission?.selectedId ?? null}
              phase={state.phase}
              onSelect={submitChoice}
            />
          ) : (
            <TypeAnswerInput
              key={state.index}
              inputLabel="Country name"
              phase={state.phase}
              lastSubmission={state.lastSubmission}
              correctLabel={currentQuestion.country.name}
              onSubmit={handleTypeSubmit}
            />
          )}
        </div>
      </div>
    </div>
  )
}
