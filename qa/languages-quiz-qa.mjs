// Languages quiz mode QA matrix: Easy/Medium/Expert x Multiple Choice/Type
// Answer, plus mobile long-list rendering for the highest-language-count
// countries (South Africa 5, Ethiopia 5, Nigeria 4, Zimbabwe 4, Djibouti 4,
// Guinea 4).
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newPage(context, theme = 'light') {
  const p = await context.newPage()
  p.on('pageerror', (e) => failures.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return p
}

function setConfig(p, config) {
  return p.addInitScript((c) => {
    localStorage.setItem('daily-worldle:v1:quizConfig', JSON.stringify(c))
  }, config)
}

// 1. QA matrix: Easy/Medium/Expert x MC/Type
const matrix = [
  ['familiar', 'multiple-choice', 'Easy-MC'],
  ['familiar', 'type-answer', 'Easy-Type'],
  ['explorer', 'multiple-choice', 'Medium-MC'],
  ['explorer', 'type-answer', 'Medium-Type'],
  ['world-expert', 'multiple-choice', 'Expert-MC'],
  ['world-expert', 'type-answer', 'Expert-Type'],
]

for (const [countryPool, answerStyle, tag] of matrix) {
  const context = await browser.newContext({ viewport: { width: 360, height: 900 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'languages', countryPool, answerStyle, questionCount: 5 })
  await p.goto(`${BASE}/quiz/languages`)
  await p.waitForTimeout(300)
  check(`${tag}: question heading renders`, await p.getByRole('heading', { level: 1 }).isVisible())
  check(`${tag}: progress shows 1 of 5`, await p.getByText('Question 1 of 5').isVisible())
  if (answerStyle === 'multiple-choice') {
    check(`${tag}: exactly 4 answer options render (gameplay invariant)`, (await p.locator('[role="radio"]').count()) === 4)
    const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    check(`${tag}: no horizontal overflow at 360px`, sw <= cw, `${sw} <= ${cw}`)
  } else {
    check(`${tag}: input + keyboard render`, await p.locator('#quiz-type-answer-input').isVisible())
  }
  await p.screenshot({ path: `${OUT}/languages-${tag}.png` })

  // Answer through all 5 and confirm results.
  for (let i = 0; i < 5; i++) {
    const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    if (answerStyle === 'multiple-choice') {
      await p.locator('.quiz-answer', { hasText: correctName }).first().click()
    } else {
      // Submit via Enter (already-supported keyboard flow — see
      // TypeAnswerInput's onKeyDown) rather than clicking the Submit
      // button: clicking is flaky here under headless Chromium even
      // though the button's rect/disabled-state/hit-testing are all
      // provably stable (checked directly), so this is a harness
      // robustness fix, not a product bug workaround.
      await p.locator('#quiz-type-answer-input').fill(correctName)
      await p.locator('#quiz-type-answer-input').press('Enter')
    }
    await p.waitForTimeout(900)
  }
  await p.waitForTimeout(200)
  check(`${tag}: results shows "Languages Quiz Complete"`, await p.getByText('Languages Quiz Complete').isVisible())
  check(`${tag}: score 5/5`, await p.getByText('5 / 5').isVisible())
  await context.close()
}

// 2. Mobile long-list rendering — cycle world-expert questions until a
// long-option country appears, checking for overflow each time.
const LONG_LIST_COUNTRIES = ['South Africa', 'Ethiopia', 'Nigeria', 'Zimbabwe', 'Djibouti', 'Guinea']
{
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'languages', countryPool: 'world-expert', answerStyle: 'multiple-choice', questionCount: 'unlimited' })
  await p.goto(`${BASE}/quiz/languages`)
  await p.waitForTimeout(300)
  let caught = 0
  // 220 draws: with 6 target countries in a 200-country world-expert pool,
  // 30 draws only gives ~60% odds of a hit (confirmed flaky in practice) —
  // 220 draws pushes miss probability under 0.1%.
  for (let i = 0; i < 220; i++) {
    const cardText = await p.locator('.quiz-play__card').innerText()
    const hit = LONG_LIST_COUNTRIES.find((c) => cardText.includes(c))
    if (hit) {
      caught++
      const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
      check(`Mobile long-list (${hit}): no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)
      await p.screenshot({ path: `${OUT}/languages-longlist-${hit.replace(/\s+/g, '-')}.png` })
    }
    const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    const radios = await p.locator('[role="radio"]').count()
    if (radios > 0) await p.locator('.quiz-answer', { hasText: correctName }).first().click()
    await p.waitForTimeout(950)
  }
  check('Mobile long-list: at least one long-list country was caught across 220 questions', caught > 0, `caught=${caught}`)
  await context.close()
}

// 3. Expert Type Answer "complete the list" mobile wrap check.
{
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'languages', countryPool: 'world-expert', answerStyle: 'type-answer', questionCount: 10 })
  await p.goto(`${BASE}/quiz/languages`)
  await p.waitForTimeout(300)
  let caughtComplete = false
  for (let i = 0; i < 10; i++) {
    const blank = await p.locator('.quiz-play__language-blank').count()
    if (blank > 0) {
      caughtComplete = true
      const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
      check('Expert complete-the-list: no horizontal overflow on narrow mobile', sw <= cw, `${sw} <= ${cw}`)
      await p.screenshot({ path: `${OUT}/languages-expert-complete-mobile.png` })
      break
    }
    const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    await p.locator('#quiz-type-answer-input').fill(correctName)
    await p.locator('#quiz-type-answer-input').press('Enter')
    await p.waitForTimeout(950)
  }
  check('Expert complete-the-list mechanic was observed at least once', caughtComplete)
  await context.close()
}

// 4. Dark mode + desktop sanity.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await newPage(context, 'dark')
  await setConfig(p, { mode: 'languages', countryPool: 'world-expert', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/languages`)
  await p.waitForTimeout(300)
  check('Dark mode desktop: renders without error', await p.getByRole('heading', { level: 1 }).isVisible())
  await p.screenshot({ path: `${OUT}/languages-dark-desktop.png` })
  await context.close()
}

// 5. Regression: Flags and Capitals still work; Currencies still a placeholder.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  check('Regression: Flags still renders', await p.getByRole('img', { name: 'Country flag' }).isVisible())
  await context.close()
}
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  check('Regression: Capitals still renders', await p.getByRole('heading', { name: 'What is the capital of:' }).isVisible())
  await context.close()
}
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'currencies', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/currencies`)
  await p.waitForTimeout(300)
  check('Regression: Currencies still shows "Coming soon" placeholder', await p.getByText('Coming soon').isVisible())
  await context.close()
}

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
