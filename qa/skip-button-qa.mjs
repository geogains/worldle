// Skip button QA: the new shared Type Answer "I don't know this answer"
// control, verified across Flags/Capitals/Languages/Currencies (Easy,
// Medium, Expert code-forward and code-reverse) plus a Multiple Choice
// regression (no Skip button there) and visual QA (light/dark/360px).
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newCtx(theme = 'light', viewport = { width: 360, height: 900 }) {
  const context = await browser.newContext({ viewport })
  const p = await context.newPage()
  p.on('pageerror', (e) => failures.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return { context, p }
}
function setConfig(p, config) {
  return p.addInitScript((c) => {
    localStorage.setItem('daily-worldle:v1:quizConfig', JSON.stringify(c))
  }, config)
}
async function correctName(p) {
  return p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
}
async function fillInput(p, value) {
  await p.locator('#quiz-type-answer-input').fill(value)
}
async function pressEnter(p) {
  await p.locator('#quiz-type-answer-input').press('Enter')
}
async function waitForAnswering(p, tag, timeoutMs = 5000) {
  try {
    await p.waitForFunction(
      () => {
        const el = document.querySelector('#quiz-type-answer-input')
        return !!el && !el.disabled
      },
      undefined,
      { timeout: timeoutMs, polling: 50 },
    )
    return true
  } catch {
    check(`${tag}: next question became interactive within ${timeoutMs}ms`, false)
    return false
  }
}
async function runSection(tag, fn) {
  try {
    await fn()
  } catch (err) {
    check(`${tag}: section completed without throwing`, false, err?.message ?? String(err))
  }
}
function skipButton(p) {
  return p.getByRole('button', { name: 'Skip' })
}
function yesSkipButton(p) {
  return p.getByRole('button', { name: 'Yes, skip' })
}
/** Clicks Skip (arms the confirmation, no submission yet), asserts the confirmation appears with no side effects, then clicks "Yes, skip" to actually resolve the question. */
async function skipWithConfirm(p, tag) {
  await skipButton(p).click()
  check(`${tag}: Skip confirmation appears`, await p.getByText('Are you sure you want to skip this question?').isVisible())
  check(`${tag}: confirmation does NOT itself submit — no incorrect feedback yet`, (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 0)
  await yesSkipButton(p).click()
}

// ------------------------------------------------------------------
// FLAGS: empty field -> Skip -> incorrect, correct country revealed,
// score unchanged, advances normally.
// ------------------------------------------------------------------
await runSection('Flags', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  check('Flags: input starts empty', (await p.locator('#quiz-type-answer-input').inputValue()) === '')
  check('Flags: Skip is present and enabled before any answer', await skipButton(p).isEnabled())
  await skipWithConfirm(p, 'Flags')
  check('Flags: incorrect feedback (red) shown after confirming Skip', (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 1)
  check('Flags: reveals the correct country', await p.getByText(`Correct answer: ${correct}`).isVisible())
  check('Flags: score unchanged (still 0)', await p.getByText('Score: 0').isVisible())
  check('Flags: Skip is disabled during resolved feedback', await skipButton(p).isDisabled())
  await p.screenshot({ path: `${OUT}/skip-flags-after.png` })
  const ready = await waitForAnswering(p, 'Flags')
  if (ready) {
    check('Flags: advances to Question 2 after the incorrect delay', await p.getByText('Question 2 of 5').isVisible())
    check('Flags: Skip is active again on the fresh question', await skipButton(p).isEnabled())
    check('Flags: fresh question has an empty input', (await p.locator('#quiz-type-answer-input').inputValue()) === '')
  }
  await context.close()
})

// ------------------------------------------------------------------
// CAPITALS: partial text -> Skip overrides the draft -> correct capital revealed.
// ------------------------------------------------------------------
await runSection('Capitals', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  await fillInput(p, 'To...')
  await skipWithConfirm(p, 'Capitals')
  check('Capitals: partial draft ignored — incorrect, not validated as a real submission', (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 1)
  check('Capitals: reveals the correct capital', await p.getByText(`Correct answer: ${correct}`).isVisible())
  await p.screenshot({ path: `${OUT}/skip-capitals-partial-input.png` })
  await context.close()
})

// ------------------------------------------------------------------
// ENTER SUBMISSION: now the only way to submit typed answers, since Skip
// replaced the old Submit button. Verifies physical Enter, on-screen
// keyboard Enter, and pressing Enter again to accept a Did You Mean
// suggestion — all previously reachable via the Submit button too.
// ------------------------------------------------------------------
await runSection('Enter submission', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  await fillInput(p, correct)
  await pressEnter(p) // physical Enter
  check('Enter submission: physical Enter submits the correct answer', await p.getByText('Correct!').isVisible())
  const ready = await waitForAnswering(p, 'Enter submission')
  if (ready) {
    const typo = (await correctName(p)) + 'x'
    await fillInput(p, typo)
    await pressEnter(p)
    check('Enter submission: Did You Mean appears after a typo', await p.getByText(/Did you mean/).isVisible())
    await pressEnter(p) // second Enter accepts the suggestion
    check('Enter submission: pressing Enter again accepts the Did You Mean suggestion', await p.getByText('Correct!').isVisible())
  }
  await context.close()
})
await runSection('Enter submission — on-screen keyboard', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  await fillInput(p, correct)
  await p.locator('.quiz-type-answer__keyboard').getByRole('button', { name: 'Enter' }).click()
  check('Enter submission: on-screen keyboard Enter submits the correct answer', await p.getByText('Correct!').isVisible())
  await context.close()
})

// ------------------------------------------------------------------
// SKIP CONFIRMATION CANCELLATION: typing, physical Enter, and on-screen
// Enter must all cancel a pending Skip confirmation and resume normal play.
// ------------------------------------------------------------------
await runSection('Skip confirmation — typing cancels it', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  await skipButton(p).click()
  check('Skip confirmation: appears on first click', await p.getByText('Are you sure you want to skip this question?').isVisible())
  await fillInput(p, 'x')
  check('Skip confirmation: cleared by editing the input', !(await p.getByText('Are you sure you want to skip this question?').isVisible()))
  check('Skip confirmation: no incorrect feedback was triggered', (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 0)
  check('Skip confirmation: score unchanged', await p.getByText('Score: 0').isVisible())
  await context.close()
})
await runSection('Skip confirmation — physical Enter cancels it', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  await fillInput(p, correct)
  await skipButton(p).click()
  check('Skip confirmation: appears with typed text still in the field', await p.getByText('Are you sure you want to skip this question?').isVisible())
  await pressEnter(p)
  check('Skip confirmation: cleared by physical Enter', !(await p.getByText('Are you sure you want to skip this question?').isVisible()))
  check('Skip confirmation: physical Enter submitted the typed answer normally (Correct!)', await p.getByText('Correct!').isVisible())
  await context.close()
})
await runSection('Skip confirmation — on-screen Enter cancels it', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  await fillInput(p, correct)
  await skipButton(p).click()
  check('Skip confirmation: appears before on-screen Enter', await p.getByText('Are you sure you want to skip this question?').isVisible())
  await p.locator('.quiz-type-answer__keyboard').getByRole('button', { name: 'Enter' }).click()
  check('Skip confirmation: cleared by on-screen keyboard Enter', !(await p.getByText('Are you sure you want to skip this question?').isVisible()))
  check('Skip confirmation: on-screen Enter submitted the typed answer normally (Correct!)', await p.getByText('Correct!').isVisible())
  await context.close()
})
await runSection('Skip confirmation — no stale confirmation on next question', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  await skipWithConfirm(p, 'Stale-confirmation check')
  const ready = await waitForAnswering(p, 'Stale-confirmation check')
  if (ready) {
    check('Next question: no stale Skip confirmation', !(await p.getByText('Are you sure you want to skip this question?').isVisible()))
    check('Next question: Skip is active again', await skipButton(p).isEnabled())
  }
  await context.close()
})
await runSection('Skip confirmation — no double submission', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  await skipButton(p).click()
  const yes = yesSkipButton(p)
  await yes.click()
  // The helper (and "Yes, skip") disappears once resolved, so a second
  // click target simply won't exist — confirms it can't be pressed twice.
  check('Skip confirmation: "Yes, skip" disappears once resolved (cannot double-submit)', (await p.getByRole('button', { name: 'Yes, skip' }).count()) === 0)
  check('Skip confirmation: still only 0 points after resolving', await p.getByText('Score: 0').isVisible())
  await context.close()
})

// ------------------------------------------------------------------
// LANGUAGES: Did You Mean visible -> Skip does NOT accept it -> normal incorrect.
// ------------------------------------------------------------------
await runSection('Languages', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'languages', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/languages`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  // Duplicate the FIRST letter, not the last — some language names end in
  // punctuation (e.g. "Standard Chinese (Putonghua)"), which normalization
  // strips entirely, so a last-letter duplicate could normalize back to an
  // exact match instead of a genuine typo.
  const typo = correct[0] + correct
  await fillInput(p, typo)
  await pressEnter(p)
  check('Languages: Did You Mean is visible before Skip', await p.getByText(/Did you mean/).isVisible())
  await p.screenshot({ path: `${OUT}/skip-languages-did-you-mean-before.png` })
  await skipButton(p).click()
  check('Languages: Did You Mean helper is replaced by the Skip confirmation (never both at once)', !(await p.getByText(/Did you mean/).isVisible()))
  check('Languages: Skip confirmation is now visible', await p.getByText('Are you sure you want to skip this question?').isVisible())
  check('Languages: confirmation alone triggers no incorrect feedback yet', (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 0)
  await p.screenshot({ path: `${OUT}/skip-languages-confirmation.png` })
  await yesSkipButton(p).click()
  check('Languages: suggestion was NOT accepted — genuine incorrect feedback shown', (await p.locator('.quiz-type-answer__feedback--incorrect').count()) === 1)
  check('Languages: not shown as Correct!', !(await p.getByText('Correct!').isVisible()))
  check('Languages: reveals the real correct answer', await p.getByText(`Correct answer: ${correct}`).isVisible())
  await p.screenshot({ path: `${OUT}/skip-languages-after.png` })
  await context.close()
})

// ------------------------------------------------------------------
// CURRENCIES (Easy): invalid-domain helper visible -> Skip -> correct currency revealed.
// ------------------------------------------------------------------
await runSection('Currencies-Easy', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'currencies', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  await fillInput(p, 'Zzqxvv')
  await pressEnter(p)
  check('Currencies-Easy: invalid-domain helper visible before Skip', await p.getByText(/^Please enter a valid/).isVisible())
  await skipButton(p).click()
  check('Currencies-Easy: invalid-domain helper is replaced by the Skip confirmation (never both at once)', !(await p.getByText(/^Please enter a valid/).isVisible()))
  check('Currencies-Easy: Skip confirmation is now visible', await p.getByText('Are you sure you want to skip this question?').isVisible())
  await yesSkipButton(p).click()
  check('Currencies-Easy: reveals the correct currency', await p.getByText(`Correct answer: ${correct}`).isVisible())
  check('Currencies-Easy: score unchanged (still 0)', await p.getByText('Score: 0').isVisible())
  await p.screenshot({ path: `${OUT}/skip-currencies-invalid-domain-after.png` })
  await context.close()
})

// ------------------------------------------------------------------
// CURRENCIES Medium: Skip works the same way.
// ------------------------------------------------------------------
await runSection('Currencies-Medium', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'currencies', countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  const correct = await correctName(p)
  await skipWithConfirm(p, 'Currencies-Medium')
  check('Currencies-Medium: Skip resolves incorrect and reveals the correct currency', await p.getByText(`Correct answer: ${correct}`).isVisible())
  await context.close()
})

// ------------------------------------------------------------------
// EXPERT CURRENCIES: Skip works for the code answer, and for the
// currency-name (code-reverse) answer too.
// ------------------------------------------------------------------
async function cycleExpertForm(p, matchPrompt, tag) {
  for (let i = 0; i < 40; i++) {
    const prompt = await p.getByRole('heading', { level: 1 }).innerText()
    if (matchPrompt(prompt)) {
      console.log(`  [${tag}] matched: "${prompt}"`)
      return true
    }
    const correct = await correctName(p)
    await fillInput(p, correct)
    await pressEnter(p)
    await waitForAnswering(p, `${tag} cycling`)
  }
  check(`${tag}: found within 40 tries`, false)
  return false
}

await runSection('Expert code-forward', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'currencies', countryPool: 'world-expert', answerStyle: 'type-answer', questionCount: 'unlimited' })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  const found = await cycleExpertForm(p, (prompt) => /currency code/i.test(prompt), 'Expert code-forward')
  if (found) {
    const correctCode = await correctName(p)
    await skipWithConfirm(p, 'Expert code-forward')
    check('Expert code-forward: Skip resolves incorrect and reveals the correct code', await p.getByText(`Correct answer: ${correctCode}`).isVisible())
  }
  await context.close()
})

await runSection('Expert code-reverse', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'currencies', countryPool: 'world-expert', answerStyle: 'type-answer', questionCount: 'unlimited' })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  const found = await cycleExpertForm(p, (prompt) => /^Which currency does .* represent\?$/.test(prompt), 'Expert code-reverse')
  if (found) {
    const correctCurrency = await correctName(p)
    await skipWithConfirm(p, 'Expert code-reverse')
    check('Expert code-reverse: Skip resolves incorrect and reveals the correct currency', await p.getByText(`Correct answer: ${correctCurrency}`).isVisible())
  }
  await context.close()
})

// ------------------------------------------------------------------
// Multiple Choice regression: no Skip button in any of the four modes.
// ------------------------------------------------------------------
await runSection('Multiple Choice regression', async () => {
  for (const mode of ['flags', 'capitals', 'languages', 'currencies']) {
    const { context, p } = await newCtx('light')
    await setConfig(p, { mode, countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
    await p.goto(`${BASE}/quiz/${mode}`)
    await p.waitForTimeout(300)
    check(`${mode} Multiple Choice: no Skip button present`, (await p.getByRole('button', { name: 'Skip' }).count()) === 0)
    await context.close()
  }
})

// ------------------------------------------------------------------
// Type Answer button composition: exactly one Skip, zero Submit, across
// all four modes — the Skip button now occupies the old Submit slot.
// ------------------------------------------------------------------
await runSection('Type Answer button composition', async () => {
  for (const mode of ['flags', 'capitals', 'languages', 'currencies']) {
    const { context, p } = await newCtx('light')
    await setConfig(p, { mode, countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
    await p.goto(`${BASE}/quiz/${mode}`)
    await p.waitForTimeout(300)
    check(`${mode} Type Answer: exactly one Skip button`, (await p.getByRole('button', { name: 'Skip' }).count()) === 1)
    check(`${mode} Type Answer: no Submit button`, (await p.getByRole('button', { name: 'Submit' }).count()) === 0)
    await context.close()
  }
})

// ------------------------------------------------------------------
// Visual QA: desktop light, desktop dark, mobile 360px light, mobile 360px dark.
// ------------------------------------------------------------------
await runSection('Visual — desktop light', async () => {
  const { context, p } = await newCtx('light', { width: 1280, height: 900 })
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${OUT}/skip-visual-desktop-light.png` })
  await context.close()
})
await runSection('Visual — desktop dark', async () => {
  const { context, p } = await newCtx('dark', { width: 1280, height: 900 })
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${OUT}/skip-visual-desktop-dark.png` })
  await context.close()
})
await runSection('Visual — mobile 360px light', async () => {
  const { context, p } = await newCtx('light', { width: 360, height: 900 })
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check('Visual 360px light: no horizontal overflow', sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/skip-visual-360-light.png` })
  await context.close()
})
await runSection('Visual — mobile 360px dark', async () => {
  const { context, p } = await newCtx('dark', { width: 360, height: 900 })
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check('Visual 360px dark: no horizontal overflow', sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/skip-visual-360-dark.png` })
  await context.close()
})
await runSection('Visual — confirmation desktop light', async () => {
  const { context, p } = await newCtx('light', { width: 1280, height: 900 })
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  await skipButton(p).click()
  check('Visual confirmation desktop light: confirmation visible', await p.getByText('Are you sure you want to skip this question?').isVisible())
  await p.screenshot({ path: `${OUT}/skip-confirmation-desktop-light.png` })
  await context.close()
})
await runSection('Visual — confirmation desktop dark', async () => {
  const { context, p } = await newCtx('dark', { width: 1280, height: 900 })
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  await skipButton(p).click()
  check('Visual confirmation desktop dark: confirmation visible', await p.getByText('Are you sure you want to skip this question?').isVisible())
  await p.screenshot({ path: `${OUT}/skip-confirmation-desktop-dark.png` })
  await context.close()
})
await runSection('Visual — confirmation mobile 360px dark', async () => {
  const { context, p } = await newCtx('dark', { width: 360, height: 900 })
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  await skipButton(p).click()
  check('Visual confirmation 360px dark: confirmation visible', await p.getByText('Are you sure you want to skip this question?').isVisible())
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check('Visual confirmation 360px dark: no horizontal overflow', sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/skip-confirmation-360-dark.png` })
  await context.close()
})

// ------------------------------------------------------------------
// Accessibility: real button, focusable, accessible name, focus-visible.
// ------------------------------------------------------------------
await runSection('Accessibility', async () => {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  const tag = await skipButton(p).evaluate((el) => el.tagName)
  check('Accessibility: Skip is a real <button> element', tag === 'BUTTON')
  await skipButton(p).focus()
  check('Accessibility: Skip is keyboard-focusable', await skipButton(p).evaluate((el) => el === document.activeElement))
  await p.screenshot({ path: `${OUT}/skip-focus-state.png` })
  await context.close()
})

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
