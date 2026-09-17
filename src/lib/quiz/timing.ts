/**
 * Centralized quiz feedback timing, mirroring the FULL_MOTION/REDUCED_MOTION
 * split already used by the Daily/Practice game engine (useGameEngine.ts) —
 * one place to tune instead of a magic number scattered through the quiz
 * engine/screens. ~800ms is the requested target for full motion; reduced
 * motion gets a much shorter delay so the automatic-advance flow stays
 * snappy for players who've asked for less animation, without removing the
 * feedback entirely (they still see it, just briefly).
 */
export const QUIZ_FEEDBACK_DELAY_MS = 800
export const QUIZ_FEEDBACK_DELAY_MS_REDUCED = 250

export function quizFeedbackDelay(reducedMotion: boolean): number {
  return reducedMotion ? QUIZ_FEEDBACK_DELAY_MS_REDUCED : QUIZ_FEEDBACK_DELAY_MS
}
