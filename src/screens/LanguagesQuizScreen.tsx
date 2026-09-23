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
import { buildLanguageAnswerDomain } from '../lib/quiz/languageAliases'
import { createLanguageQuestion, generateLanguageQuestions, type LanguageQuestion } from '../lib/quiz/languageQuestions'
import { defaultRandom } from '../lib/quiz/random'
import type { QuizConfig } from '../lib/quiz/types'
import { PATHS } from '../lib/router/routes'

export interface LanguagesQuizScreenProps {
  /** Captured once by the caller (QuizPlayScreen) at mount — see its own comment for why. */
  config: QuizConfig
}

function buildInitialQuestions(config: QuizConfig): LanguageQuestion[] {
  if (config.questionCount === 'unlimited') {
    return [createLanguageQuestion(config.countryPool, config.answerStyle, [], defaultRandom)]
  }
  return generateLanguageQuestions(
    { countryPool: config.countryPool, answerStyle: config.answerStyle, questionCount: config.questionCount },
    defaultRandom,
  )
}

/** The reveal/data-attribute label for a question, regardless of which mechanic produced it. */
function correctLabelOf(question: LanguageQuestion): string {
  if (question.revealAnswer) return question.revealAnswer
  return question.choices?.find((c) => c.id === question.correctChoiceId)?.label ?? ''
}

/**
 * `/quiz/languages` real gameplay — the third consumer of the shared quiz
 * engine, plugged in exactly the way Flags/Capitals were. Unlike Flags
 * (a large "guess this flag" image) and Capitals (a supporting flag above
 * a prominent country name), a Languages question's prompt sentence
 * already carries the country/language it's about, so there's no separate
 * country-name line — only the 'complete' kind (Expert Type Answer) adds
 * one extra line: the still-visible partial language list above the input.
 *
 * Forward-direction questions (every kind except 'reverse') DO show the
 * same supporting flag Capitals uses (via the shared QuizCountryFlag
 * component — same asset, same CSS, not a Languages-specific visual
 * treatment), since the country is already explicitly named. Reverse
 * questions ("Japanese is the language of which country?") never show it —
 * `question.country` is still the correct answer there, so rendering its
 * flag would hand the player the answer. Flag visibility is keyed off
 * `kind`, not difficulty: reverse questions only ever occur at Medium/
 * Expert, but so do plenty of forward ones (the single-language fallback,
 * 'set'/'exclude'/'complete' for multi-language countries), and those
 * still show the flag. The user-facing category label stays "Languages"
 * throughout — the internal "Principal Languages" rebuild that determines
 * *which* languages populate the underlying data is never exposed in this
 * screen's copy.
 */
export function LanguagesQuizScreen({ config }: LanguagesQuizScreenProps) {
  const { navigate } = useRouter()
  const [runKey, setRunKey] = useState(0)
  const playAgain = useCallback(() => setRunKey((k) => k + 1), [])
  const changeQuiz = useCallback(() => navigate(PATHS.quiz), [navigate])

  return <LanguagesQuizRun key={runKey} config={config} onPlayAgain={playAgain} onChangeQuiz={changeQuiz} />
}

function LanguagesQuizRun({
  config,
  onPlayAgain,
  onChangeQuiz,
}: {
  config: QuizConfig
  onPlayAgain: () => void
  onChangeQuiz: () => void
}) {
  useDocumentTitle('Languages Quiz')
  const reducedMotion = usePrefersReducedMotion()

  const initialQuestions = useMemo(() => buildInitialQuestions(config), [config])
  const totalQuestions = config.questionCount === 'unlimited' ? null : config.questionCount

  const nextQuestion = useCallback(
    (previous: LanguageQuestion) => createLanguageQuestion(config.countryPool, config.answerStyle, [previous.country.id], defaultRandom),
    [config.countryPool, config.answerStyle],
  )

  const engine = useQuizEngine<LanguageQuestion>(initialQuestions, totalQuestions, {
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
          <span className="eyebrow eyebrow--pill">Languages</span>
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

          {currentQuestion.kind !== 'reverse' && <QuizCountryFlag country={currentQuestion.country} />}

          {currentQuestion.kind === 'complete' && currentQuestion.displayedLanguages && (
            <p className="quiz-play__language-list">
              {currentQuestion.displayedLanguages.join(', ')}
              <span className="quiz-play__language-blank">, _____</span>
            </p>
          )}

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
              inputLabel="Language"
              placeholder="Type a language…"
              phase={state.phase}
              lastSubmission={state.lastSubmission}
              correctLabel={correctLabelOf(currentQuestion)}
              onSubmit={submitText}
              answerDomain={buildLanguageAnswerDomain(currentQuestion.acceptedCanonical ?? [])}
            />
          )}
        </div>
      </div>
    </div>
  )
}
