// Facts quiz mode QA: Easy/Medium/Expert x Multiple Choice/Type Answer,
// plus Type Answer interaction states (correct, incorrect, typo/Did You
// Mean, recognised-but-wrong country, invalid country, suggestion accept,
// Skip + Skip confirmation), completion/replay, no-flag-leak, mobile/
// desktop layout, and light/dark theme.
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

// ------------------------------------------------------------------
// 1. QA matrix: Easy/Medium/Expert x MC/Type — render, complete, replay.
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
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'facts', countryPool, answerStyle, questionCount: 5 })
  await p.goto(`${BASE}/quiz/facts`)
  await p.waitForTimeout(300)
  check(`${tag}: fact-question heading renders`, await p.getByRole('heading', { level: 1 }).isVisible())
  check(`${tag}: progress shows 1 of 5`, await p.getByText('Question 1 of 5').isVisible())
  check(`${tag}: no country flag rendered (would leak the answer)`, (await p.locator('.quiz-play__country-flag, .quiz-play__country-flag-placeholder').count()) === 0)
  if (answerStyle === 'multiple-choice') {
    check(`${tag}: exactly 4 answer options render (gameplay invariant)`, (await p.locator('[role="radio"]').count()) === 4)
  } else {
    check(`${tag}: input + keyboard render`, await p.locator('#quiz-type-answer-input').isVisible())
    check(`${tag}: input labeled "Country"`, (await p.getByLabel('Country').count()) === 1)
  }
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`${tag}: no horizontal overflow at 390px (long fact prompts wrap cleanly)`, sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/facts-${tag}.png` })

  // Answer through all 5, confirm completion + replay.
  for (let i = 0; i < 5; i++) {
    const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    if (answerStyle === 'multiple-choice') {
      await p.locator('.quiz-answer', { hasText: correctName }).first().click()
    } else {
      await p.locator('#quiz-type-answer-input').fill(correctName)
      await p.locator('#quiz-type-answer-input').press('Enter')
    }
    await p.waitForTimeout(950)
  }
  check(`${tag}: quiz completes with results screen`, await p.getByText('Facts Quiz Complete').isVisible())
  check(`${tag}: perfect score shown`, await p.getByText('5 / 5').isVisible())
  await p.getByRole('button', { name: 'Play Again' }).click()
  await p.waitForTimeout(200)
  check(`${tag}: Play Again restarts at Question 1`, await p.getByText('Question 1 of 5').isVisible())
  await context.close()
}

// ------------------------------------------------------------------
// 2. Type Answer interaction states (World Expert pool for max variety).
// ------------------------------------------------------------------
{
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'facts', countryPool: 'world-expert', answerStyle: 'type-answer', questionCount: 10 })
  await p.goto(`${BASE}/quiz/facts`)
  await p.waitForTimeout(300)

  // Incorrect (real-but-wrong country).
  let correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
  const wrongReal = correctName === 'Japan' ? 'France' : 'Japan'
  await p.locator('#quiz-type-answer-input').fill(wrongReal)
  await p.locator('#quiz-type-answer-input').press('Enter')
  check('Type Answer: valid-but-wrong country reveals the correct answer', await p.getByText(`Correct answer: ${correctName}`).isVisible())
  check('Type Answer: score stays 0 after a wrong answer', await p.getByText('Score: 0').isVisible())
  await p.waitForTimeout(950)

  // Invalid (nonsense) input.
  await p.locator('#quiz-type-answer-input').fill('Birmingham')
  await p.locator('#quiz-type-answer-input').press('Enter')
  check('Type Answer: invalid country shows the shared invalid-domain helper', await p.getByText('Please enter a valid country name.').isVisible())
  check('Type Answer: invalid input does not consume the question', await p.getByText('Question 2 of 10').isVisible())

  // Typo -> Did You Mean -> accept suggestion -> correct.
  correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
  const typo = correctName[0] + correctName
  await p.locator('#quiz-type-answer-input').fill(typo)
  await p.locator('#quiz-type-answer-input').press('Enter')
  check('Type Answer: typo shows Did You Mean', await p.getByText(/Did you mean/).isVisible())
  check('Type Answer: Did You Mean does not itself score before acceptance', await p.getByText('Score: 0').isVisible())
  await p.getByRole('button', { name: correctName, exact: true }).click()
  check('Type Answer: accepting the suggestion counts as correct', await p.getByText('Correct!').isVisible())
  check('Type Answer: score increments after accepting a correct suggestion', await p.getByText('Score: 1').isVisible())
  await p.waitForTimeout(950)

  // Skip -> confirm dialog -> Enter dismisses (does not confirm) -> Skip again -> Yes, skip.
  correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
  await p.getByRole('button', { name: 'Skip' }).click()
  check('Skip: shows confirmation prompt', await p.getByText('Are you sure you want to skip this question?').isVisible())
  await p.locator('#quiz-type-answer-input').press('Enter')
  check('Skip: Enter dismisses the confirmation rather than confirming it', !(await p.getByText('Are you sure you want to skip this question?').isVisible()))
  check('Skip: question still active after Enter dismissal', await p.getByText('Question 3 of 10').isVisible())
  await p.getByRole('button', { name: 'Skip' }).click()
  await p.getByRole('button', { name: 'Yes, skip' }).click()
  check('Skip: confirming reveals the correct answer', await p.getByText(`Correct answer: ${correctName}`).isVisible())
  check('Skip: confirming does not increment score', await p.getByText('Score: 1').isVisible())
  await p.screenshot({ path: `${OUT}/facts-type-answer-skip-confirmed.png` })

  await context.close()
}

// ------------------------------------------------------------------
// 3. Mobile layout + dark theme sanity across a couple of configs.
// ------------------------------------------------------------------
for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } })
  const p = await newPage(context, theme)
  await setConfig(p, { mode: 'facts', countryPool: 'world-expert', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/facts`)
  await p.waitForTimeout(300)
  check(`Mobile ${theme}: 4 options usable at 360px`, (await p.locator('[role="radio"]').count()) === 4)
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`Mobile ${theme}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/facts-mobile-${theme}.png` })
  await context.close()
}

// ------------------------------------------------------------------
// 4. Targeted re-check for the Bosnia and Herzegovina / Georgia Type
//    Answer eligibility swap: Bosnia and Herzegovina must now work
//    end-to-end via Type Answer (including its multi-word name), and
//    Georgia must never appear as a Type Answer question.
// ------------------------------------------------------------------
{
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'facts', countryPool: 'world-expert', answerStyle: 'type-answer', questionCount: 10 })

  let sawBosnia = false
  let sawGeorgia = false
  for (let attempt = 0; attempt < 40 && !(sawBosnia && attempt > 5); attempt++) {
    await p.goto(`${BASE}/quiz/facts`)
    await p.waitForTimeout(150)
    const name = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    if (name === 'Georgia') sawGeorgia = true
    if (name === 'Bosnia and Herzegovina' && !sawBosnia) {
      sawBosnia = true
      await p.locator('#quiz-type-answer-input').fill('Bosnia and Herzegovina')
      await p.locator('#quiz-type-answer-input').press('Enter')
      check('Bosnia and Herzegovina: full name accepted as correct via Type Answer', await p.getByText('Correct!').isVisible())
    }
  }
  check('Bosnia and Herzegovina: was drawn as a Type Answer question at least once (now eligible)', sawBosnia)
  check('Georgia: never drawn as a Type Answer question across 40 draws (now excluded)', !sawGeorgia)
  await context.close()
}

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
