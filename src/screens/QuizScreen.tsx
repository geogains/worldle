import { useState, type ReactNode } from 'react'
import { DifficultyCarousel } from '../components/quiz/DifficultyCarousel'
import { QuizOptionCard } from '../components/quiz/QuizOptionCard'
import { QuizOptionGroup } from '../components/quiz/QuizOptionGroup'
import {
  ANSWER_STYLE_OPTIONS,
  COUNTRY_POOL_OPTIONS,
  QUESTION_COUNT_OPTIONS,
  QUIZ_MODE_OPTIONS,
  formatQuizSummary,
} from '../lib/quiz/config'
import { loadQuizConfig, saveQuizConfig } from '../lib/quiz/storage'
import type { AnswerStyle, QuestionCount, QuizConfig, QuizMode } from '../lib/quiz/types'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useRouter } from '../hooks/useRouter'
import { PATHS } from '../lib/router/routes'

// Decorative only — the visible label beside each one already names the
// quiz type, so these are marked aria-hidden by QuizOptionCard's own icon
// wrapper rather than announced individually. All six are the illustrated
// PNGs now (Facts joined the other five), each sized/aligned identically
// via the shared .quiz-option__icon-img class.
const MODE_ICONS: Record<QuizMode, ReactNode> = {
  flags: <img src="/icons/flags.png" alt="" className="quiz-option__icon-img" />,
  capitals: <img src="/icons/capitals.png" alt="" className="quiz-option__icon-img" />,
  currencies: <img src="/icons/currencies.png" alt="" className="quiz-option__icon-img" />,
  languages: <img src="/icons/languages.png" alt="" className="quiz-option__icon-img" />,
  facts: <img src="/icons/facts.png" alt="" className="quiz-option__icon-img" />,
  mixed: <img src="/icons/mixed.png" alt="" className="quiz-option__icon-img" />,
}

/**
 * `/quiz` — the quiz configuration/setup screen (Phase 1 of the Quiz
 * system). Four independent single-select axes (QuizMode / CountryPool /
 * AnswerStyle / QuestionCount) compose into one QuizConfig, persisted on
 * every change via saveQuizConfig() — so leaving and returning to `/quiz`
 * (e.g. a future "Change Quiz") keeps the previous selections, and a future
 * "Play Again" can reuse the exact same config without this screen being
 * involved at all. Start Quiz here only navigates into the (not yet built)
 * gameplay route; it does not generate or run a quiz itself.
 */
export function QuizScreen() {
  useDocumentTitle('Quiz')
  const { navigate } = useRouter()
  const [config, setConfig] = useState<QuizConfig>(() => loadQuizConfig())

  function update(patch: Partial<QuizConfig>) {
    setConfig((prev) => {
      const next = { ...prev, ...patch }
      saveQuizConfig(next)
      return next
    })
  }

  const startQuiz = () => {
    saveQuizConfig(config)
    navigate(PATHS.quizPlay(config.mode))
  }

  return (
    <div className="w-full min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-4 py-5">
        <h1 className="text-[1.5rem] font-extrabold tracking-[-0.01em]">Quiz</h1>
        <p className="mt-1 text-[0.9rem] text-muted">Choose a quiz type, difficulty, answer style and length, then start.</p>

        <div className="quiz-setup-card">
          <QuizOptionGroup title="Quiz Type" groupLabel="Quiz type" layout="grid-3">
            {QUIZ_MODE_OPTIONS.map((option) => (
              <QuizOptionCard
                key={option.id}
                variant="tile"
                label={option.label}
                icon={MODE_ICONS[option.id]}
                selected={config.mode === option.id}
                onSelect={() => update({ mode: option.id as QuizMode })}
              />
            ))}
          </QuizOptionGroup>

          <section className="quiz-section">
            <h2 className="quiz-section__title">Difficulty</h2>
            <DifficultyCarousel
              options={COUNTRY_POOL_OPTIONS}
              selected={config.countryPool}
              onChange={(id) => update({ countryPool: id })}
            />
          </section>

          <QuizOptionGroup title="Answer Style" groupLabel="Answer style" layout="row">
            {ANSWER_STYLE_OPTIONS.map((option) => (
              <QuizOptionCard
                key={option.id}
                variant="pill"
                label={option.label}
                selected={config.answerStyle === option.id}
                onSelect={() => update({ answerStyle: option.id as AnswerStyle })}
              />
            ))}
          </QuizOptionGroup>

          <QuizOptionGroup title="Questions" groupLabel="Question count" layout="row">
            {QUESTION_COUNT_OPTIONS.map((option) => (
              <QuizOptionCard
                key={String(option.id)}
                variant="pill"
                label={option.label}
                selected={config.questionCount === option.id}
                onSelect={() => update({ questionCount: option.id as QuestionCount })}
              />
            ))}
          </QuizOptionGroup>

          <p className="quiz-summary" role="status" aria-live="polite">
            {formatQuizSummary(config)}
          </p>

          <button type="button" className="btn btn--primary quiz-start" onClick={startQuiz}>
            Start Quiz
          </button>
        </div>
      </div>
    </div>
  )
}
