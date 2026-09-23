import { useCallback, useMemo, useState } from 'react'
import { MultipleChoiceAnswers } from '../components/quiz/MultipleChoiceAnswers'
import { QuizProgress } from '../components/quiz/QuizProgress'
import { QuizResults } from '../components/quiz/QuizResults'
import { TypeAnswerInput } from '../components/quiz/TypeAnswerInput'
import { useQuizEngine } from '../hooks/useQuizEngine'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useRouter } from '../hooks/useRouter'
import { buildCountryAnswerDomain } from '../lib/quiz/countryAliases'
import { createFactQuestion, generateFactQuestions, type FactQuestion } from '../lib/quiz/factQuestions'
import { defaultRandom } from '../lib/quiz/random'
import type { QuizConfig } from '../lib/quiz/types'
import { PATHS } from '../lib/router/routes'

export interface FactsQuizScreenProps {
  /** Captured once by the caller (QuizPlayScreen) at mount — see its own comment for why. */
  config: QuizConfig
}

function buildInitialQuestions(config: QuizConfig): FactQuestion[] {
  if (config.questionCount === 'unlimited') {
    return [createFactQuestion(config.countryPool, config.answerStyle, [], defaultRandom)]
  }
  return generateFactQuestions(
    { countryPool: config.countryPool, answerStyle: config.answerStyle, questionCount: config.questionCount },
    defaultRandom,
  )
}

/** The reveal/data-attribute label for a question, regardless of answer style. */
function correctLabelOf(question: FactQuestion): string {
  if (question.revealAnswer) return question.revealAnswer
  return question.choices?.find((c) => c.id === question.correctChoiceId)?.label ?? ''
}

/**
 * `/quiz/facts` real gameplay — the fifth consumer of the shared quiz
 * engine, plugged in exactly the way Languages/Currencies were. A Facts
 * question is always "which country is this trivia about?", so — unlike
 * Capitals/Languages(forward)/Currencies(forward), which show the
 * country's flag alongside an already-named country — Facts never shows a
 * flag: the country is the answer being guessed, and showing its flag
 * would hand it over. The trivia sentence itself is the entire prompt.
 */
export function FactsQuizScreen({ config }: FactsQuizScreenProps) {
  const { navigate } = useRouter()
  const [runKey, setRunKey] = useState(0)
  const playAgain = useCallback(() => setRunKey((k) => k + 1), [])
  const changeQuiz = useCallback(() => navigate(PATHS.quiz), [navigate])

  return <FactsQuizRun key={runKey} config={config} onPlayAgain={playAgain} onChangeQuiz={changeQuiz} />
}

function FactsQuizRun({
  config,
  onPlayAgain,
  onChangeQuiz,
}: {
  config: QuizConfig
  onPlayAgain: () => void
  onChangeQuiz: () => void
}) {
  useDocumentTitle('Facts Quiz')
  const reducedMotion = usePrefersReducedMotion()

  const initialQuestions = useMemo(() => buildInitialQuestions(config), [config])
  const totalQuestions = config.questionCount === 'unlimited' ? null : config.questionCount

  const nextQuestion = useCallback(
    (previous: FactQuestion) => createFactQuestion(config.countryPool, config.answerStyle, [previous.country.id], defaultRandom),
    [config.countryPool, config.answerStyle],
  )

  const engine = useQuizEngine<FactQuestion>(initialQuestions, totalQuestions, {
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

  return (
    <div className="quiz-play-page">
      <div className="mode-bar shrink-0">
        <div className="mode-bar__status">
          <span className="eyebrow eyebrow--pill">Facts</span>
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
              inputLabel="Country"
              placeholder="Type a country…"
              phase={state.phase}
              lastSubmission={state.lastSubmission}
              correctLabel={correctLabelOf(currentQuestion)}
              onSubmit={submitText}
              answerDomain={buildCountryAnswerDomain(currentQuestion.acceptedCanonical?.[0] ?? '')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
