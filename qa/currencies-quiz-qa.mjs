// Currencies quiz mode QA: Easy/Medium/Expert x Multiple Choice/Type Answer,
// plus concept-specific exercises (unique Medium reverse, shared-currency
// Medium fallback, Expert country->code, Expert code->currency, a shared
// Expert code), long-currency-name wrapping, dark mode, and a sanity check
// of Capitals/Flags/Languages after this pass.
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

async function overflowOk(p) {
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  return { ok: sw <= cw, detail: `${sw} <= ${cw}` }
}

async function flagPresent(p) {
  return (await p.locator('.quiz-play__country-flag, .quiz-play__country-flag-placeholder').count()) > 0
}

// ------------------------------------------------------------------
// 1. Main matrix: Easy/Medium/Expert x MC/Type at 360px
// ------------------------------------------------------------------
const matrix = [
  ['familiar', 'multiple-choice', 'Easy-MC'],
  ['familiar', 'type-answer', 'Easy-Type'],
  ['explorer', 'multiple-choice', 'Medium-MC'],
  ['explorer', 'type-answer', 'Medium-Type'],
  ['world-expert', 'multiple-choice', 'Expert-MC'],
  ['world-expert', 'type-answer', 'Expert-Type'],
]

for (const [countryPool, answerStyle, tag] of matrix) {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'currencies', countryPool, answerStyle, questionCount: 5 })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  check(`${tag}: question heading renders`, await p.getByRole('heading', { level: 1 }).isVisible())
  check(`${tag}: progress shows 1 of 5`, await p.getByText('Question 1 of 5').isVisible())
  if (answerStyle === 'multiple-choice') {
    check(`${tag}: exactly 4 answer options render (gameplay invariant)`, (await p.locator('[role="radio"]').count()) === 4)
  } else {
    check(`${tag}: input + keyboard render`, await p.locator('#quiz-type-answer-input').isVisible())
  }
  const ov = await overflowOk(p)
  check(`${tag}: no horizontal overflow at 360px`, ov.ok, ov.detail)
  await p.screenshot({ path: `${OUT}/currencies-${tag}.png` })

  // Answer through all 5 and confirm results.
  for (let i = 0; i < 5; i++) {
    const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    if (answerStyle === 'multiple-choice') {
      await p.locator('.quiz-answer', { hasText: correctName }).first().click()
    } else {
      await p.locator('#quiz-type-answer-input').fill(correctName)
      await p.locator('#quiz-type-answer-input').press('Enter')
    }
    await p.waitForTimeout(1500) // covers the longer incorrect-feedback window too, in case of a false negative
  }
  await p.waitForTimeout(200)
  check(`${tag}: results shows "Currencies Quiz Complete"`, await p.getByText('Currencies Quiz Complete').isVisible())
  check(`${tag}: score 5/5`, await p.getByText('5 / 5').isVisible())
  await context.close()
}

// ------------------------------------------------------------------
// 2. Concept-specific exercises — cycle Unlimited questions until the
//    desired concept appears, checking flag/prompt behaviour each time.
// ------------------------------------------------------------------
async function cycleUntil(pool, answerStyle, matchPrompt, tag, maxTries = 60) {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'currencies', countryPool: pool, answerStyle, questionCount: 'unlimited' })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  for (let i = 0; i < maxTries; i++) {
    const prompt = await p.locator('h1').innerText()
    if (matchPrompt(prompt)) {
      console.log(`  [${tag}] matched: "${prompt}"`)
      return { context, p, prompt }
    }
    const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    const radios = await p.locator('[role="radio"]').count()
    if (radios > 0) {
      await p.locator('.quiz-answer', { hasText: correctName }).first().click()
    } else {
      await p.locator('#quiz-type-answer-input').fill(correctName)
      await p.locator('#quiz-type-answer-input').press('Enter')
    }
    await p.waitForTimeout(950)
  }
  check(`${tag}: found a matching question within ${maxTries} tries`, false)
  await context.close()
  return null
}

{
  const hit = await cycleUntil('explorer', 'multiple-choice', (p) => /^Which country uses the/.test(p), 'Medium unique reverse')
  if (hit) {
    check('Medium unique reverse: no flag shown', !(await flagPresent(hit.p)))
    check('Medium unique reverse: exactly 4 options', (await hit.p.locator('[role="radio"]').count()) === 4)
    await hit.p.screenshot({ path: `${OUT}/currencies-medium-reverse.png` })
    await hit.context.close()
  }
}
{
  const hit = await cycleUntil('explorer', 'multiple-choice', (p) => /^What currency does .* use\?$/.test(p), 'Medium shared-currency fallback')
  if (hit) {
    check('Medium shared-currency fallback: flag IS shown', await flagPresent(hit.p))
    check('Medium shared-currency fallback: exactly 4 options', (await hit.p.locator('[role="radio"]').count()) === 4)
    await hit.p.screenshot({ path: `${OUT}/currencies-medium-fallback.png` })
    await hit.context.close()
  }
}
{
  const hit = await cycleUntil('world-expert', 'multiple-choice', (p) => /currency code\??$/.test(p), 'Expert country -> code')
  if (hit) {
    check('Expert country->code: flag IS shown', await flagPresent(hit.p))
    check('Expert country->code: exactly 4 options', (await hit.p.locator('[role="radio"]').count()) === 4)
    await hit.p.screenshot({ path: `${OUT}/currencies-expert-code-forward.png` })
    await hit.context.close()
  }
}
{
  const hit = await cycleUntil('world-expert', 'multiple-choice', (p) => /^Which currency does .* represent\?$/.test(p), 'Expert code -> currency')
  if (hit) {
    check('Expert code->currency: no flag shown', !(await flagPresent(hit.p)))
    check('Expert code->currency: exactly 4 options', (await hit.p.locator('[role="radio"]').count()) === 4)
    await hit.p.screenshot({ path: `${OUT}/currencies-expert-code-reverse.png` })
    await hit.context.close()
  }
}
{
  // A shared Expert code (EUR/USD/XOF/XAF/XCD/AUD/GBP/CHF/ILS) still safely
  // produces a well-posed code -> currency question — this is the specific
  // "shared currency does NOT block code -> currency" invariant.
  const SHARED_CODES = ['EUR', 'USD', 'XOF', 'XAF', 'XCD', 'AUD', 'GBP', 'CHF', 'ILS']
  const hit = await cycleUntil(
    'world-expert',
    'multiple-choice',
    (p) => {
      const m = /^Which currency does (\w+) represent\?$/.exec(p)
      return !!m && SHARED_CODES.includes(m[1])
    },
    'Expert shared code -> currency',
    150,
  )
  if (hit) {
    check('Expert shared code->currency: exactly 4 unique options', (await hit.p.locator('[role="radio"]').count()) === 4)
    const { sw, cw } = await hit.p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    check('Expert shared code->currency: no overflow', sw <= cw, `${sw} <= ${cw}`)
    await hit.p.screenshot({ path: `${OUT}/currencies-expert-shared-code.png` })
    await hit.context.close()
  }
}

// ------------------------------------------------------------------
// 3. Long currency-name wrapping — cycle Expert questions until one of the
//    known-long names appears as an option or in the prompt.
// ------------------------------------------------------------------
const LONG_NAMES = [
  'Bosnia and Herzegovina Convertible Mark',
  'São Tomé and Príncipe Dobra',
  'Trinidad and Tobago Dollar',
  'United Arab Emirates Dirham',
  'Central African CFA Franc',
  'West African CFA Franc',
]
{
  const { context, p } = await newCtx('light', { width: 360, height: 740 })
  await setConfig(p, { mode: 'currencies', countryPool: 'world-expert', answerStyle: 'multiple-choice', questionCount: 'unlimited' })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  let caught = 0
  for (let i = 0; i < 60; i++) {
    const cardText = await p.locator('.quiz-play__card').innerText()
    const hit = LONG_NAMES.find((n) => cardText.includes(n))
    if (hit) {
      caught++
      const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
      check(`Long name (${hit}): no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)
      await p.screenshot({ path: `${OUT}/currencies-longname-${hit.replace(/[^a-zA-Z]+/g, '-')}.png` })
    }
    const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    const radios = await p.locator('[role="radio"]').count()
    if (radios > 0) await p.locator('.quiz-answer', { hasText: correctName }).first().click()
    await p.waitForTimeout(950)
  }
  check('Long currency names: at least one caught across 60 questions', caught > 0, `caught=${caught}`)
  await context.close()
}

// ------------------------------------------------------------------
// 4. Dark mode spot check.
// ------------------------------------------------------------------
{
  const { context, p } = await newCtx('dark', { width: 390, height: 844 })
  await setConfig(p, { mode: 'currencies', countryPool: 'explorer', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
  const wrongBtn = p.locator('.quiz-answer').filter({ hasNotText: correctName }).first()
  await wrongBtn.click()
  await p.waitForTimeout(250)
  check('Currencies dark mode: incorrect option gets quiz-answer--incorrect class', await wrongBtn.evaluate((el) => el.classList.contains('quiz-answer--incorrect')))
  await p.screenshot({ path: `${OUT}/currencies-dark-incorrect.png` })
  await context.close()
}

// ------------------------------------------------------------------
// 5. Sanity-check Capitals/Flags/Languages Easy MC still work.
// ------------------------------------------------------------------
for (const mode of ['capitals', 'flags', 'languages']) {
  const { context, p } = await newCtx('light', { width: 390, height: 844 })
  await setConfig(p, { mode, countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/${mode}`)
  await p.waitForTimeout(300)
  check(`Sanity: ${mode} Easy MC renders heading`, await p.getByRole('heading', { level: 1 }).isVisible())
  check(`Sanity: ${mode} Easy MC has 4 options`, (await p.locator('[role="radio"]').count()) === 4)
  await context.close()
}

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
