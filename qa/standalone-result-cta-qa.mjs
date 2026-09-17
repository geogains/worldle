// Verifies the standalone/reference result-page CTA:
// Study -> /results/:slug (no completed-game context) shows
// "Quiz" (primary, -> /quiz) + "Back to Study" (secondary), never
// "Today's puzzle" or bare "Practice" — while completed Practice/Daily
// results keep their existing, unrelated CTAs untouched.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
const failures = []
const errors = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newPage(context) {
  const p = await context.newPage()
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  await p.addInitScript(() => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: 'light', hasSeenHelp: true }))
  })
  return p
}

async function runStudyFlow(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context)

  // 1. /study -> click China -> /results/china
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(300)
  await p.locator('[data-study-tile="china"]').click()
  await p.waitForTimeout(300)
  check(`[${label}] clicking China from Study navigates to /results/china`, p.url().endsWith('/results/china'))
  const chinaCard = p.locator('.country-result')
  check(`[${label}] China: "Quiz" primary button visible`, await chinaCard.getByRole('button', { name: /^quiz$/i }).isVisible())
  check(`[${label}] China: "Back to Study" secondary button visible`, await chinaCard.getByRole('button', { name: /^back to study$/i }).isVisible())
  check(`[${label}] China: "Today's puzzle" is absent`, (await chinaCard.getByRole('button', { name: /today's puzzle/i }).count()) === 0)
  check(`[${label}] China: bare "Practice" is absent (renamed to Quiz)`, (await chinaCard.getByRole('button', { name: /^practice$/i }).count()) === 0)
  const quizClass = await chinaCard.getByRole('button', { name: /^quiz$/i }).getAttribute('class')
  const backClass = await chinaCard.getByRole('button', { name: /^back to study$/i }).getAttribute('class')
  check(`[${label}] China: Quiz uses primary button styling`, quizClass.includes('btn--primary'))
  check(`[${label}] China: Back to Study uses secondary button styling`, backClass.includes('btn--secondary'))

  await chinaCard.getByRole('button', { name: /^quiz$/i }).click()
  await p.waitForTimeout(300)
  check(`[${label}] "Quiz" navigates to /quiz`, p.url().endsWith('/quiz'))
  await p.goBack()
  await p.waitForTimeout(300)

  await chinaCard.getByRole('button', { name: /^back to study$/i }).click()
  await p.waitForTimeout(300)
  check(`[${label}] "Back to Study" returns to /study`, p.url().endsWith('/study'))

  // 2. /study -> click United Kingdom (non-playable) -> same CTA pair
  await p.locator('[data-study-tile="united-kingdom"]').click()
  await p.waitForTimeout(300)
  check(`[${label}] United Kingdom: navigates to /results/united-kingdom`, p.url().endsWith('/results/united-kingdom'))
  const ukCard = p.locator('.country-result')
  check(`[${label}] United Kingdom: "Quiz" primary button visible`, await ukCard.getByRole('button', { name: /^quiz$/i }).isVisible())
  check(`[${label}] United Kingdom: "Back to Study" secondary button visible`, await ukCard.getByRole('button', { name: /^back to study$/i }).isVisible())
  check(`[${label}] United Kingdom: "Today's puzzle" is absent`, (await ukCard.getByRole('button', { name: /today's puzzle/i }).count()) === 0)

  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}] no horizontal overflow on standalone result page`, noOverflow)

  await context.close()
}

async function runPracticeRegression(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context)
  // Seed a completed practice game directly in storage (same shape the app
  // itself writes) so the results page renders as a real completed-game
  // result, exactly like the existing unit-test regression coverage.
  await p.addInitScript(() => {
    localStorage.setItem(
      'daily-worldle:v1:practice',
      JSON.stringify({
        answerId: 'tanzania',
        previousAnswerId: null,
        guesses: ['ZIMBABWE', 'MALAYSIA', 'TANZANIA'],
        current: '',
        status: 'won',
        updatedAt: Date.now(),
      }),
    )
    localStorage.setItem(
      'daily-worldle:v1:lastResult',
      JSON.stringify({ source: 'practice', countryId: 'tanzania', puzzleNumber: null, at: Date.now() }),
    )
  })
  await p.goto(`${BASE}/results/tanzania`)
  await p.waitForTimeout(300)
  const practiceDialog = p.getByRole('dialog')
  check(`[${label}] completed Practice result: "Play again" visible`, await practiceDialog.getByRole('button', { name: /play again/i }).isVisible())
  check(`[${label}] completed Practice result: "Share" visible`, await practiceDialog.getByRole('button', { name: /share/i }).isVisible())
  check(`[${label}] completed Practice result: "Back to Study" is absent`, (await practiceDialog.getByRole('button', { name: /back to study/i }).count()) === 0)
  await context.close()
}

async function runDailyRegression(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context)
  await p.addInitScript(() => {
    localStorage.setItem(
      'daily-worldle:v1:daily',
      JSON.stringify({ puzzleNumber: 1, guesses: ['ZIMBABWE', 'TANZANIA'], current: '', status: 'won', updatedAt: Date.now() }),
    )
    localStorage.setItem(
      'daily-worldle:v1:lastResult',
      JSON.stringify({ source: 'daily', countryId: 'tanzania', puzzleNumber: 1, at: Date.now() }),
    )
  })
  await p.goto(`${BASE}/results/tanzania`)
  await p.waitForTimeout(300)
  const dailyDialog = p.getByRole('dialog')
  check(`[${label}] completed Daily result: "Play practice" visible (unchanged)`, await dailyDialog.getByRole('button', { name: /play practice/i }).isVisible())
  check(`[${label}] completed Daily result: "Back to Study" is absent`, (await dailyDialog.getByRole('button', { name: /back to study/i }).count()) === 0)
  check(`[${label}] completed Daily result: bare "Practice"/"Quiz" buttons are absent (those only apply to the standalone/reference CTA)`, (await dailyDialog.getByRole('button', { name: /^(practice|quiz)$/i }).count()) === 0)
  await context.close()
}

async function runDarkMode() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await newPage(context)
  await p.addInitScript(() => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: 'dark', hasSeenHelp: true }))
  })
  await p.goto(`${BASE}/results/china`)
  await p.waitForTimeout(300)
  const card = p.locator('.country-result')
  check('[dark] China standalone result: Quiz + Back to Study visible in dark mode',
    (await card.getByRole('button', { name: /^quiz$/i }).isVisible()) &&
    (await card.getByRole('button', { name: /^back to study$/i }).isVisible()))
  await context.close()
}

await runStudyFlow({ width: 390, height: 844 }, 'mobile')
await runStudyFlow({ width: 1440, height: 900 }, 'desktop')
await runPracticeRegression({ width: 1440, height: 900 }, 'desktop')
await runDailyRegression({ width: 1440, height: 900 }, 'desktop')
await runDarkMode()

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
