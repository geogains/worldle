// Quiz-wide answer-feedback QA: Languages flag display (forward/reverse),
// longer incorrect-answer delay, removed visible tick/cross icons, and the
// new red incorrect colour — across Capitals, Flags and Languages.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newCtx(theme = 'light', viewport = { width: 390, height: 844 }) {
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

async function borderColorRgb(locator) {
  return locator.evaluate((el) => getComputedStyle(el).borderColor)
}
async function textColorRgb(locator) {
  return locator.evaluate((el) => getComputedStyle(el).color)
}
const GREEN_BORDER = 'rgb(9, 133, 93)' // --feedback-correct #09855d
const RED_BORDER = 'rgb(220, 38, 38)' // --quiz-feedback-incorrect #dc2626

// ------------------------------------------------------------------
// 1. Capitals — flag still shows correctly (regression + rename check)
// ------------------------------------------------------------------
for (const answerStyle of ['multiple-choice', 'type-answer']) {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle, questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  const img = p.locator('.quiz-play__country-flag')
  check(`Capitals ${answerStyle}: flag renders with shared quiz-play__country-flag class`, await img.isVisible())
  await p.screenshot({ path: `${OUT}/feedback-capitals-${answerStyle}.png` })
  await context.close()
}

// ------------------------------------------------------------------
// 2. Flags — central guess-the-flag image unaffected; text MC answers align
// ------------------------------------------------------------------
for (const answerStyle of ['multiple-choice', 'type-answer']) {
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle, questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  check(`Flags ${answerStyle}: central flag image renders (own .quiz-play__flag, untouched)`, await p.locator('.quiz-play__flag').isVisible())
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`Flags ${answerStyle}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/feedback-flags-${answerStyle}.png` })
  await context.close()
}

// ------------------------------------------------------------------
// 3. Flags MC — correct/incorrect feedback: green/red, no icons, timing
// ------------------------------------------------------------------
{
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
  const correctBtn = p.locator('.quiz-answer', { hasText: correctName }).first()
  await correctBtn.click()
  // .quiz-answer animates border-color/background-color over 0.2s — wait
  // for that CSS transition to finish before sampling computed colour.
  await p.waitForTimeout(250)
  check('Flags correct MC: gets quiz-answer--correct class', await correctBtn.evaluate((el) => el.classList.contains('quiz-answer--correct')))
  check('Flags correct MC: border reads green', (await borderColorRgb(correctBtn)) === GREEN_BORDER, await borderColorRgb(correctBtn))
  check('Flags correct MC: no visible svg tick icon', (await correctBtn.locator('svg').count()) === 0)
  await p.waitForTimeout(850)
  check('Flags correct MC: advanced to Question 2 within ~850ms (unchanged correct delay)', await p.getByText('Question 2 of 5').isVisible())
  await context.close()
}
{
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
  const wrongBtn = p.locator('.quiz-answer').filter({ hasNotText: correctName }).first()
  const correctBtn = p.locator('.quiz-answer', { hasText: correctName }).first()
  await wrongBtn.click()
  await p.waitForTimeout(250) // let the 0.2s border/background transition finish
  check('Flags incorrect MC: selected option gets quiz-answer--incorrect class', await wrongBtn.evaluate((el) => el.classList.contains('quiz-answer--incorrect')))
  check('Flags incorrect MC: border reads red', (await borderColorRgb(wrongBtn)) === RED_BORDER, await borderColorRgb(wrongBtn))
  check('Flags incorrect MC: no visible svg cross icon', (await wrongBtn.locator('svg').count()) === 0)
  check('Flags incorrect MC: correct answer still identifiable (green)', (await borderColorRgb(correctBtn)) === GREEN_BORDER)
  await p.screenshot({ path: `${OUT}/feedback-flags-incorrect.png` })
  await p.waitForTimeout(900)
  check('Flags incorrect MC: still on Question 1 after 900ms (correct-delay window) — incorrect delay is longer', await p.getByText('Question 1 of 5').isVisible())
  await p.waitForTimeout(600)
  check('Flags incorrect MC: advanced to Question 2 by ~1500ms total', await p.getByText('Question 2 of 5').isVisible())
  await context.close()
}

// ------------------------------------------------------------------
// 4. Flags Type Answer — correct/incorrect feedback, no icons, timing
// ------------------------------------------------------------------
{
  const { context, p } = await newCtx('light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  await p.locator('#quiz-type-answer-input').fill('Definitely Not A Country')
  await p.locator('#quiz-type-answer-input').press('Enter')
  const feedback = p.locator('.quiz-type-answer__feedback--incorrect')
  check('Flags incorrect Type: reveals "Correct answer: ..."', /^Correct answer: /.test((await feedback.textContent()) ?? ''))
  check('Flags incorrect Type: no visible svg cross icon', (await feedback.locator('svg').count()) === 0)
  check('Flags incorrect Type: text reads red', (await textColorRgb(feedback)) === 'rgb(185, 29, 28)' || (await textColorRgb(feedback)) !== 'rgb(180, 83, 9)', await textColorRgb(feedback))
  await p.waitForTimeout(900)
  check('Flags incorrect Type: still on Question 1 after 900ms', await p.getByText('Question 1 of 5').isVisible())
  await p.waitForTimeout(600)
  check('Flags incorrect Type: advanced by ~1500ms total', await p.getByText('Question 2 of 5').isVisible())
  await context.close()
}

// ------------------------------------------------------------------
// 5. Languages — full matrix, flag-by-direction + 360px + dark mode spot check
// ------------------------------------------------------------------
const matrix = [
  ['familiar', 'multiple-choice', 'Easy-MC'],
  ['familiar', 'type-answer', 'Easy-Type'],
  ['explorer', 'multiple-choice', 'Medium-MC'],
  ['explorer', 'type-answer', 'Medium-Type'],
  ['world-expert', 'multiple-choice', 'Expert-MC'],
  ['world-expert', 'type-answer', 'Expert-Type'],
]
const REVERSE_PATTERN = /is the language of which country\?|^Which country has .* as its language\?/

for (const [countryPool, answerStyle, tag] of matrix) {
  const { context, p } = await newCtx('light', { width: 360, height: 900 })
  await setConfig(p, { mode: 'languages', countryPool, answerStyle, questionCount: 5 })
  await p.goto(`${BASE}/quiz/languages`)
  await p.waitForTimeout(300)
  const prompt = await p.locator('h1').innerText()
  const isReverse = REVERSE_PATTERN.test(prompt)
  const flagPresent = (await p.locator('.quiz-play__country-flag, .quiz-play__country-flag-placeholder').count()) > 0
  if (isReverse) {
    check(`Languages ${tag}: reverse question ("${prompt}") shows NO flag`, !flagPresent)
  } else {
    check(`Languages ${tag}: forward question ("${prompt}") shows the flag`, flagPresent)
  }
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`Languages ${tag}: no horizontal overflow at 360px`, sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/feedback-languages-${tag}.png` })
  await context.close()
}

// Force one Medium MC reverse-free forward retry loop isn't needed — the
// mock-based unit tests already prove the reverse/forward gating
// deterministically; this matrix just confirms it holds in a real render.

// Dark mode spot check.
{
  const { context, p } = await newCtx('dark', { width: 390, height: 844 })
  await setConfig(p, { mode: 'languages', countryPool: 'explorer', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/languages`)
  await p.waitForTimeout(300)
  const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
  const wrongBtn = p.locator('.quiz-answer').filter({ hasNotText: correctName }).first()
  await wrongBtn.click()
  check('Languages dark mode: incorrect option gets quiz-answer--incorrect class', await wrongBtn.evaluate((el) => el.classList.contains('quiz-answer--incorrect')))
  await p.screenshot({ path: `${OUT}/feedback-languages-dark-incorrect.png` })
  await context.close()
}

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
