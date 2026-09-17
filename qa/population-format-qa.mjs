// Verifies the new population DISPLAY formatting (billions/millions/
// thousands rounding) renders correctly across every result-page surface
// that shares CountryResultCard: standalone/Study results, completed
// Practice results, and completed Daily results. Raw population.value is
// never touched — this only checks what's rendered.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
const failures = []
const errors = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newPage(context, theme = 'light') {
  const p = await context.newPage()
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return p
}

async function runStandalone(viewport, label, theme = 'light') {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)

  const cases = [
    { slug: 'china', text: '1.41 billion' },
    { slug: 'india', text: '1.48 billion' },
    { slug: 'united-states', text: '349 million' },
    { slug: 'united-kingdom', text: '69 million' },
    { slug: 'england', text: '59 million' },
    { slug: 'sao-tome-and-principe', text: '245,000' },
    { slug: 'liechtenstein', text: '40,000' },
    { slug: 'vatican-city', text: '887' },
  ]

  for (const { slug, text } of cases) {
    await p.goto(`${BASE}/results/${slug}`)
    await p.waitForTimeout(250)
    const card = p.locator('.country-result')
    check(`[${label}/${theme}] ${slug}: population shows "${text}"`, await card.getByText(text, { exact: true }).isVisible())
    check(`[${label}/${theme}] ${slug}: no year/provenance text (2025/2026/"estimate as of")`, (await card.getByText(/estimate as of|\b2025\b|\b2026\b/i).count()) === 0)
    const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    check(`[${label}/${theme}] ${slug}: no horizontal overflow`, noOverflow)
  }

  await context.close()
}

async function runPracticeResult(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context)
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
  const dialog = p.getByRole('dialog')
  check(`[${label}] Practice result: Tanzania population shows "69 million"`, await dialog.getByText('69 million', { exact: true }).isVisible())
  check(`[${label}] Practice result: no raw "68,600,000" anywhere`, (await dialog.getByText('68,600,000').count()) === 0)
  check(`[${label}] Practice result: no year/provenance text`, (await dialog.getByText(/estimate as of|\b2026\b/i).count()) === 0)
  await context.close()
}

async function runDailyResult(viewport, label) {
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
  const dialog = p.getByRole('dialog')
  check(`[${label}] Daily result: Tanzania population shows "69 million"`, await dialog.getByText('69 million', { exact: true }).isVisible())
  check(`[${label}] Daily result: no raw "68,600,000" anywhere`, (await dialog.getByText('68,600,000').count()) === 0)
  check(`[${label}] Daily result: no year/provenance text`, (await dialog.getByText(/estimate as of|\b2026\b/i).count()) === 0)
  await context.close()
}

async function runStudyEntry(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context)
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(300)
  await p.locator('[data-study-tile="china"]').click()
  await p.waitForTimeout(300)
  const card = p.locator('.country-result')
  check(`[${label}] Study -> China result shows "1.41 billion"`, await card.getByText('1.41 billion', { exact: true }).isVisible())
  check(`[${label}] Study -> China result: no raw "1,412,914,089" anywhere`, (await card.getByText('1,412,914,089').count()) === 0)
  await context.close()
}

await runStandalone({ width: 390, height: 844 }, 'mobile', 'light')
await runStandalone({ width: 1440, height: 900 }, 'desktop', 'light')
await runStandalone({ width: 390, height: 844 }, 'mobile', 'dark')
await runStandalone({ width: 1440, height: 900 }, 'desktop', 'dark')
await runPracticeResult({ width: 1440, height: 900 }, 'desktop')
await runDailyResult({ width: 1440, height: 900 }, 'desktop')
await runStudyEntry({ width: 390, height: 844 }, 'mobile')
await runStudyEntry({ width: 1440, height: 900 }, 'desktop')

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
