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

// 1. Capitals / Easy / Multiple Choice / 5 — mobile
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  check('Easy MC 5: question heading', await p.getByRole('heading', { name: 'What is the capital of:' }).isVisible())
  check('Easy MC 5: 4 answer options', (await p.locator('[role="radio"]').count()) === 4)
  check('Easy MC 5: progress shows 1 of 5', await p.getByText('Question 1 of 5').isVisible())
  await p.screenshot({ path: `${OUT}/capitals-easy-mc-mobile-light.png` })

  // Answer through all 5 and confirm results
  for (let i = 0; i < 5; i++) {
    const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    await p.locator('.quiz-answer', { hasText: correctName }).click()
    await p.waitForTimeout(900)
  }
  await p.waitForTimeout(200)
  check('Easy MC 5: results shows Capitals Quiz Complete', await p.getByText('Capitals Quiz Complete').isVisible())
  check('Easy MC 5: score 5/5', await p.getByText('5 / 5').isVisible())
  await p.screenshot({ path: `${OUT}/capitals-results-mobile-light.png` })

  // Play Again
  await p.getByRole('button', { name: 'Play Again' }).click()
  await p.waitForTimeout(300)
  check('Play Again: restarts at Question 1 of 5', await p.getByText('Question 1 of 5').isVisible())

  // Change Quiz (answer through quickly first)
  for (let i = 0; i < 5; i++) {
    const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    await p.locator('.quiz-answer', { hasText: correctName }).click()
    await p.waitForTimeout(900)
  }
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Change Quiz' }).click()
  await p.waitForTimeout(200)
  check('Change Quiz: navigates to /quiz', new URL(p.url()).pathname === '/quiz')
  await context.close()
}

// 2. Capitals / Medium / Type Answer / 5 — mobile
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'capitals', countryPool: 'explorer', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  check('Medium TypeAnswer: input focused', await p.evaluate(() => document.activeElement?.id === 'quiz-type-answer-input'))
  const correctCapital = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
  await p.locator('#quiz-type-answer-input').fill(`  ${correctCapital.toLowerCase()}  `)
  await p.getByRole('button', { name: 'Submit' }).click()
  await p.waitForTimeout(200)
  check('Medium TypeAnswer: accepts case/whitespace-insensitive answer', await p.getByText('Correct!').isVisible())
  await p.screenshot({ path: `${OUT}/capitals-medium-type-mobile-light.png` })
  await p.waitForTimeout(900)

  // wrong answer reveals correct capital
  const correctCapital2 = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
  await p.locator('#quiz-type-answer-input').fill('Definitely Not A Capital')
  await p.getByRole('button', { name: 'Submit' }).click()
  await p.waitForTimeout(200)
  check('Medium TypeAnswer: wrong answer reveals correct capital', await p.getByText(`Correct answer: ${correctCapital2}`).isVisible())
  await context.close()
}

// 3. Expert distractor case — desktop, world-expert MC
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'capitals', countryPool: 'world-expert', answerStyle: 'multiple-choice', questionCount: 10 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  check('Expert MC: 4 options render', (await p.locator('[role="radio"]').count()) === 4)
  const labels = await p.locator('.quiz-answer__label').allTextContents()
  check('Expert MC: no duplicate visible capital labels', new Set(labels).size === labels.length, labels.join(', '))
  await p.screenshot({ path: `${OUT}/capitals-expert-desktop-light.png` })
  await context.close()
}

// 4. Dark mode
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await newPage(context, 'dark')
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  check('Dark mode: renders without error', await p.getByRole('heading', { name: 'What is the capital of:' }).isVisible())
  await p.screenshot({ path: `${OUT}/capitals-dark-mobile.png` })
  await context.close()
}

// 5. Desktop layout, light
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await newPage(context, 'light')
  await setConfig(p, { mode: 'capitals', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check('Desktop: no horizontal overflow', sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/capitals-desktop-light.png` })
  await context.close()
}

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
