// Phase 2 Flags Quiz + shared engine verification: Multiple Choice finite
// quiz, Type Answer finite quiz (normalization + wrong-answer correction),
// a deterministic World Expert look-alike distractor scenario, Unlimited
// mode (no fake total, End Quiz, results), Play Again (same config) and
// Change Quiz, across desktop/mobile x light/dark, checking for console
// errors, page errors and layout overflow throughout.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
const failures = []
const errors = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

/** Deterministic LCG so Math.random() is reproducible in the browser. */
const LCG_SOURCE = `
  (function (seed) {
    let s = seed >>> 0;
    Math.random = function () {
      s = (s * 1103515245 + 12345) >>> 0;
      return (s % 2147483647) / 2147483647;
    };
  })
`

async function newPage(context, theme = 'light', seed = null) {
  const p = await context.newPage()
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  if (seed !== null) {
    await p.addInitScript(`(${LCG_SOURCE})(${seed})`)
  }
  return p
}

function setConfig(p, config) {
  return p.addInitScript((cfg) => {
    localStorage.setItem('daily-worldle:v1:quizConfig', JSON.stringify(cfg))
  }, config)
}

const correctCountryId = (p) => p.locator('[data-quiz-correct-id]').getAttribute('data-quiz-correct-id')
const correctCountryName = (p) => p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')

async function runMultipleChoiceFinite(viewport, label, theme) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)

  check(`[${label}/${theme}] MC: question 1 of 5 renders`, await p.getByText('Question 1 of 5').isVisible())
  check(`[${label}/${theme}] MC: flag image visible`, await p.getByRole('img', { name: 'Country flag' }).isVisible())
  check(`[${label}/${theme}] MC: exactly 4 answer options`, (await p.getByRole('radio').count()) === 4)

  for (let i = 0; i < 5; i++) {
    // Answer with whichever option is actually correct this round, so the
    // resulting score is meaningful (not just "always wrong").
    const name = await correctCountryName(p)
    await p.locator('.quiz-answer', { hasText: name }).click()
    await p.waitForTimeout(120)
    const noOverflowMid = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    check(`[${label}/${theme}] MC: no horizontal overflow after answering (q${i + 1})`, noOverflowMid)
    await p.waitForTimeout(750)
  }

  check(`[${label}/${theme}] MC: reaches results after 5 questions`, await p.getByText('Flags Quiz Complete').isVisible())
  check(`[${label}/${theme}] MC: shows "5 / 5" score (answered every question correctly)`, await p.getByText('5 / 5').isVisible())
  check(`[${label}/${theme}] MC: shows 100%`, await p.getByText('100%').isVisible())

  await p.getByRole('button', { name: 'Play Again' }).click()
  await p.waitForTimeout(300)
  check(`[${label}/${theme}] Play Again: restarts at Question 1 of 5`, await p.getByText('Question 1 of 5').isVisible())
  check(`[${label}/${theme}] Play Again: score resets to 0`, await p.getByText('Score: 0').isVisible())

  // Finish the replay so the results screen (and its Change Quiz button) exists again.
  for (let i = 0; i < 5; i++) {
    const name = await correctCountryName(p)
    await p.locator('.quiz-answer', { hasText: name }).click()
    await p.waitForTimeout(850)
  }
  await p.getByRole('button', { name: 'Change Quiz' }).click()
  await p.waitForTimeout(300)
  check(`[${label}/${theme}] Change Quiz: navigates to /quiz`, p.url().endsWith('/quiz'))

  await context.close()
}

async function runTypeAnswerFinite(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'flags', countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)

  check(`[${label}] Type Answer: input renders with a label`, await p.getByLabel('Country name').isVisible())

  // Q1: correct answer, submitted with extra whitespace + wrong case — normalization must still accept it.
  const displayName = await correctCountryName(p)
  await p.getByLabel('Country name').fill(`   ${displayName.toUpperCase()}   `)
  await p.getByRole('button', { name: 'Submit' }).click()
  await p.waitForTimeout(200)
  check(`[${label}] Type Answer: normalized correct answer (case+whitespace) is accepted`, await p.getByText('Correct!').isVisible())
  await p.waitForTimeout(700)

  // Q2: deliberately wrong -> correction shown.
  await p.getByLabel('Country name').fill('Definitely Not A Real Country')
  await p.keyboard.press('Enter')
  await p.waitForTimeout(200)
  check(`[${label}] Type Answer: wrong answer reveals "Correct answer: ..."`, (await p.getByText(/Correct answer:/).count()) === 1)
  await p.waitForTimeout(700)

  check(`[${label}] Type Answer: progressed to Question 3 of 5`, await p.getByText('Question 3 of 5').isVisible())

  // Finish remaining questions (arbitrary input, just to reach results).
  for (let i = 0; i < 3; i++) {
    await p.getByLabel('Country name').fill('x')
    await p.getByRole('button', { name: 'Submit' }).click()
    await p.waitForTimeout(850)
  }
  check(`[${label}] Type Answer: reaches results`, await p.getByText('Flags Quiz Complete').isVisible())

  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}] Type Answer: no horizontal overflow`, noOverflow)

  await context.close()
}

async function runWorldExpertLookalike() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  // Seed 3, against this exact build (found by brute-force search through
  // the real running app, not predicted from an isolated Node simulation —
  // React StrictMode double-invokes the question-generating useMemo, which
  // consumes Math.random() calls in a way an offline simulation can't
  // reliably predict), deterministically produces Slovenia as the correct
  // country with choices = {Russia, Slovenia, Slovakia, Serbia} for World
  // Expert + Multiple Choice — all 4 are members of the curated
  // Slovenia/Slovakia/Russia/Serbia/Croatia look-alike group, a real
  // configured look-alike scenario via a deterministic fixture, not
  // hoped-for randomness.
  const p = await newPage(context, 'light', 3)
  await setConfig(p, { mode: 'flags', countryPool: 'world-expert', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)

  const correctId = await correctCountryId(p)
  check('World Expert deterministic seed: correct country is Slovenia', correctId === 'slovenia', `got ${correctId}`)

  const labels = await p.locator('.quiz-answer__label').allTextContents()
  const curatedGroup = new Set(['Slovenia', 'Slovakia', 'Russia', 'Serbia', 'Croatia'])
  check(
    'World Expert deterministic seed: all 4 choices belong to the curated Slovenia look-alike group',
    labels.length === 4 && labels.every((l) => curatedGroup.has(l)),
    `got ${JSON.stringify(labels)}`,
  )

  await context.close()
}

async function runUnlimited(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 'unlimited' })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)

  check(`[${label}] Unlimited: shows "Question 1" with no total`, await p.getByText('Question 1', { exact: true }).isVisible())
  check(`[${label}] Unlimited: no "of N" endpoint text`, (await p.getByText(/of \d/).count()) === 0)
  check(`[${label}] Unlimited: End Quiz control is present`, await p.getByRole('button', { name: 'End Quiz' }).isVisible())

  for (let i = 0; i < 11; i++) {
    await p.getByRole('radio').first().click()
    await p.waitForTimeout(850)
  }
  check(`[${label}] Unlimited: continues beyond 10 questions (reaches Question 12)`, await p.getByText('Question 12', { exact: true }).isVisible())

  await p.getByRole('button', { name: 'End Quiz' }).click()
  await p.waitForTimeout(300)
  check(`[${label}] Unlimited: End Quiz reaches results`, await p.getByText('Flags Quiz Complete').isVisible())
  check(`[${label}] Unlimited: results show "X / 11"`, (await p.getByText(/\/ 11/).count()) > 0)

  await p.getByRole('button', { name: 'Play Again' }).click()
  await p.waitForTimeout(300)
  check(`[${label}] Unlimited Play Again: restarts another Unlimited session (no total, score 0)`,
    (await p.getByText('Question 1', { exact: true }).isVisible()) && (await p.getByText('Score: 0').isVisible()))

  await context.close()
}

await runMultipleChoiceFinite({ width: 390, height: 844 }, 'mobile', 'light')
await runMultipleChoiceFinite({ width: 1440, height: 900 }, 'desktop', 'light')
await runMultipleChoiceFinite({ width: 390, height: 844 }, 'mobile', 'dark')
await runMultipleChoiceFinite({ width: 1440, height: 900 }, 'desktop', 'dark')
await runTypeAnswerFinite({ width: 390, height: 844 }, 'mobile')
await runTypeAnswerFinite({ width: 1440, height: 900 }, 'desktop')
await runWorldExpertLookalike()
await runUnlimited({ width: 390, height: 844 }, 'mobile')
await runUnlimited({ width: 1440, height: 900 }, 'desktop')

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
