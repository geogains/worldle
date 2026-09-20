import { useState } from 'react'
import { QUIZ_MODE_OPTIONS, formatQuizSummary } from '../lib/quiz/config'
import { loadQuizConfig } from '../lib/quiz/storage'
import type { QuizConfig, QuizMode } from '../lib/quiz/types'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useRouter } from '../hooks/useRouter'
import { PATHS } from '../lib/router/routes'
import { CapitalsQuizScreen } from './CapitalsQuizScreen'
import { FlagsQuizScreen } from './FlagsQuizScreen'

export interface QuizPlayScreenProps {
  mode: QuizMode
}

/**
 * `/quiz/:mode`. Flags (Phase 2) and Capitals (Phase 3) are real gameplay
 * modes now — every other mode still renders the Phase 1 placeholder shell,
 * unchanged, until its own phase builds on the same shared engine these two
 * already use. Adding a new mode here is a one-line addition: a new
 * `if (mode === '<mode>') return <...QuizScreen config={config} />` above
 * the placeholder fallback, same shape as the two below.
 *
 * The persisted QuizConfig is captured exactly once here (not re-read by
 * the gameplay screen itself), with the route's own `mode` authoritative
 * over whatever `mode` happened to be last saved — this is what lets a
 * completed run's Play Again guarantee the exact configuration that was
 * actually played, independent of anything changed in storage afterwards.
 */
export function QuizPlayScreen({ mode }: QuizPlayScreenProps) {
  const [config] = useState<QuizConfig>(() => ({ ...loadQuizConfig(), mode }))

  if (mode === 'flags') return <FlagsQuizScreen config={config} />
  if (mode === 'capitals') return <CapitalsQuizScreen config={config} />
  return <QuizComingSoon mode={mode} config={config} />
}

function QuizComingSoon({ mode, config }: { mode: QuizMode; config: QuizConfig }) {
  const { navigate } = useRouter()
  const modeLabel = QUIZ_MODE_OPTIONS.find((o) => o.id === mode)?.label ?? mode
  useDocumentTitle(`${modeLabel} Quiz`)

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <span className="eyebrow eyebrow--pill">{modeLabel}</span>
      <h1 className="text-[1.5rem] font-extrabold tracking-[-0.01em]">Coming soon</h1>
      <p className="text-[0.9rem] text-muted">
        {modeLabel} quiz gameplay is being built in a later phase. Your configuration is saved and ready:
      </p>
      <p className="quiz-summary" role="status">
        {formatQuizSummary(config)}
      </p>
      <button type="button" className="btn btn--secondary" onClick={() => navigate(PATHS.quiz)}>
        Change Quiz
      </button>
    </div>
  )
}
