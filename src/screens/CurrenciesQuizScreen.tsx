import { useCallback, useMemo, useState } from 'react'
import { MultipleChoiceAnswers } from '../components/quiz/MultipleChoiceAnswers'
import { QuizCountryFlag } from '../components/quiz/QuizCountryFlag'
import { QuizProgress } from '../components/quiz/QuizProgress'
import { QuizResults } from '../components/quiz/QuizResults'
import { TypeAnswerInput } from '../components/quiz/TypeAnswerInput'
import { useQuizEngine } from '../hooks/useQuizEngine'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useRouter } from '../hooks/useRouter'
import type { AnswerDomainSpec } from '../lib/quiz/answerValidation'
import { buildCountryAnswerDomain } from '../lib/quiz/countryAliases'
import { buildCurrencyAnswerDomain, buildCurrencyCodeAnswerDomain } from '../lib/quiz/currencyAliases'
import { createCurrencyQuestion, generateCurrencyQuestions, type CurrencyQuestion } from '../lib/quiz/currencyQuestions'
import { defaultRandom } from '../lib/quiz/random'
import type { QuizConfig } from '../lib/quiz/types'
import { PATHS } from '../lib/router/routes'

export interface CurrenciesQuizScreenProps {
  /** Captured once by the caller (QuizPlayScreen) at mount — see its own comment for why. */
  config: QuizConfig
}

function buildInitialQuestions(config: QuizConfig): CurrencyQuestion[] {
  if (config.questionCount === 'unlimited') {
    return [createCurrencyQuestion(config.countryPool, config.answerStyle, [], defaultRandom)]
  }
  return generateCurrencyQuestions(
    { countryPool: config.countryPool, answerStyle: config.answerStyle, questionCount: config.questionCount },
    defaultRandom,
  )
}

/** The reveal/data-attribute label for a question, regardless of which mechanic produced it. */
function correctLabelOf(question: CurrencyQuestion): string {
  if (question.revealAnswer) return question.revealAnswer
  return question.choices?.find((c) => c.id === question.correctChoiceId)?.label ?? ''
}

/**
 * A Type Answer submission means a different thing depending on `kind`:
 * an ISO code for 'code-forward' (its own domain — see
 * buildCurrencyCodeAnswerDomain, Did You Mean disabled), a plain country
 * name for 'reverse' (reuses the same country domain Flags uses — currency
 * aliases don't apply to a country-name answer), or a currency name (with
 * alias/shorthand expansion) for 'forward'/'code-reverse'.
 */
function answerDomainFor(question: CurrencyQuestion): AnswerDomainSpec {
  const accepted = question.acceptedCanonical ?? []
  switch (question.kind) {
    case 'code-forward':
      return buildCurrencyCodeAnswerDomain(accepted[0] ?? '')
    case 'reverse':
      return buildCountryAnswerDomain(accepted[0] ?? '')
    default:
      return buildCurrencyAnswerDomain(accepted)
  }
}

/**
 * `/quiz/currencies` real gameplay — the fourth consumer of the shared
 * quiz engine, plugged in exactly the way Languages was. Like Languages,
 * every question's prompt sentence already carries the country/code it's
 * about, so there's no separate country-name line — just the shared
 * supporting flag (via QuizCountryFlag, same asset/CSS Capitals and
 * Languages already use) for forward-direction questions.
 *
 * Flag visibility is keyed off `kind`, not difficulty: 'forward' (Easy,
 * and Medium's shared-currency fallback) and 'code-forward' (Expert Form
 * A) explicitly name the country, so they show its flag; 'reverse'
 * (Medium) and 'code-reverse' (Expert Form B) have the country/currency as
 * the answer, so they never do — showing it would hand over the answer.
 */
export function CurrenciesQuizScreen({ config }: CurrenciesQuizScreenProps) {
  const { navigate } = useRouter()
  const [runKey, setRunKey] = useState(0)
  const playAgain = useCallback(() => setRunKey((k) => k + 1), [])
  const changeQuiz = useCallback(() => navigate(PATHS.quiz), [navigate])

  return <CurrenciesQuizRun key={runKey} config={config} onPlayAgain={playAgain} onChangeQuiz={changeQuiz} />
}

function CurrenciesQuizRun({
  config,
  onPlayAgain,
  onChangeQuiz,
}: {
  config: QuizConfig
  onPlayAgain: () => void
  onChangeQuiz: () => void
}) {
  useDocumentTitle('Currencies Quiz')
  const reducedMotion = usePrefersReducedMotion()

  const initialQuestions = useMemo(() => buildInitialQuestions(config), [config])
  const totalQuestions = config.questionCount === 'unlimited' ? null : config.questionCount

  const nextQuestion = useCallback(
    (previous: CurrencyQuestion) => createCurrencyQuestion(config.countryPool, config.answerStyle, [previous.country.id], defaultRandom),
    [config.countryPool, config.answerStyle],
  )

  const engine = useQuizEngine<CurrencyQuestion>(initialQuestions, totalQuestions, {
    getCorrectAnswerId: (q) => q.correctChoiceId ?? q.id,
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

  const showsFlag = currentQuestion.kind === 'forward' || currentQuestion.kind === 'code-forward'

  return (
    <div className="quiz-play-page">
      <div className="mode-bar shrink-0">
        <div className="mode-bar__status">
          <span className="eyebrow eyebrow--pill">Currencies</span>
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
          className="quiz-play__card quiz-play__card--compact"
          data-quiz-correct-id={currentQuestion.country.id}
          data-quiz-correct-name={correctLabelOf(currentQuestion)}
        >
          <QuizProgress index={state.index} total={totalQuestions} />

          <h1 className="quiz-play__question">{currentQuestion.prompt}</h1>

          {showsFlag && <QuizCountryFlag country={currentQuestion.country} />}

          {currentQuestion.choices ? (
            <MultipleChoiceAnswers
              groupLabel="Answer options"
              choices={currentQuestion.choices}
              correctId={currentQuestion.correctChoiceId ?? ''}
              selectedId={state.lastSubmission?.selectedId ?? null}
              phase={state.phase}
              onSelect={submitChoice}
            />
          ) : (
            <TypeAnswerInput
              key={state.index}
              inputLabel={currentQuestion.kind === 'code-forward' ? 'Currency code' : currentQuestion.kind === 'reverse' ? 'Country' : 'Currency'}
              placeholder={currentQuestion.kind === 'code-forward' ? 'Type a currency code…' : currentQuestion.kind === 'reverse' ? 'Type a country…' : 'Type a currency…'}
              phase={state.phase}
              lastSubmission={state.lastSubmission}
              correctLabel={correctLabelOf(currentQuestion)}
              onSubmit={submitText}
              answerDomain={answerDomainFor(currentQuestion)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
