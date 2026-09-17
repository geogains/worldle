// Phase 1 Quiz foundation verification: /quiz setup screen (defaults, all
// four selection groups, summary updates, Start Quiz routing), the Study
// result "Quiz" CTA, the /quiz/:mode placeholder shell, and light/dark +
// mobile/desktop rendering with no layout overflow.
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

async function runSetup(viewport, label, theme = 'light') {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(300)

  check(`[${label}/${theme}] Quiz heading renders`, await p.getByRole('heading', { level: 1, name: 'Quiz' }).isVisible())

  const modeGroup = p.getByRole('radiogroup', { name: 'Quiz type' })
  const poolGroup = p.getByRole('radiogroup', { name: 'Country pool' })
  const styleGroup = p.getByRole('radiogroup', { name: 'Answer style' })
  const countGroup = p.getByRole('radiogroup', { name: 'Question count' })
  check(`[${label}/${theme}] all four selection groups render`,
    (await modeGroup.isVisible()) && (await poolGroup.isVisible()) && (await styleGroup.isVisible()) && (await countGroup.isVisible()))

  // Defaults: Flags / Familiar / Multiple Choice / 10.
  check(`[${label}/${theme}] default: Flags selected`, (await modeGroup.getByRole('radio', { name: /flags/i }).getAttribute('aria-checked')) === 'true')
  check(`[${label}/${theme}] default: Familiar selected`, (await poolGroup.getByRole('radio', { name: /^familiar/i }).getAttribute('aria-checked')) === 'true')
  check(`[${label}/${theme}] default: Multiple Choice selected`, (await styleGroup.getByRole('radio', { name: 'Multiple Choice' }).getAttribute('aria-checked')) === 'true')
  check(`[${label}/${theme}] default: 10 selected`, (await countGroup.getByRole('radio', { name: '10' }).getAttribute('aria-checked')) === 'true')
  check(`[${label}/${theme}] default summary text`, await p.getByText('Flags · Familiar · Multiple Choice · 10 Questions').isVisible())

  // Each Quiz Type option selectable.
  for (const name of ['Flags', 'Capitals', 'Currencies', 'Languages', 'Facts', 'Mixed']) {
    await modeGroup.getByRole('radio', { name }).click()
    check(`[${label}/${theme}] Quiz Type "${name}" becomes selected`, (await modeGroup.getByRole('radio', { name }).getAttribute('aria-checked')) === 'true')
  }
  await modeGroup.getByRole('radio', { name: 'Flags' }).click()

  // Each Country Pool option selectable.
  for (const name of [/^familiar/i, /^explorer/i, /^world expert/i]) {
    await poolGroup.getByRole('radio', { name }).click()
    check(`[${label}/${theme}] Country Pool "${name}" becomes selected`, (await poolGroup.getByRole('radio', { name }).getAttribute('aria-checked')) === 'true')
  }
  await poolGroup.getByRole('radio', { name: /^familiar/i }).click()

  // Both Answer Style options selectable.
  for (const name of ['Multiple Choice', 'Type Answer']) {
    await styleGroup.getByRole('radio', { name }).click()
    check(`[${label}/${theme}] Answer Style "${name}" becomes selected`, (await styleGroup.getByRole('radio', { name }).getAttribute('aria-checked')) === 'true')
  }
  await styleGroup.getByRole('radio', { name: 'Multiple Choice' }).click()

  // All three Question Count options selectable.
  for (const name of ['5', '10', 'Unlimited']) {
    await countGroup.getByRole('radio', { name }).click()
    check(`[${label}/${theme}] Question Count "${name}" becomes selected`, (await countGroup.getByRole('radio', { name }).getAttribute('aria-checked')) === 'true')
  }

  // Summary updates immediately.
  await modeGroup.getByRole('radio', { name: 'Mixed' }).click()
  await poolGroup.getByRole('radio', { name: /^explorer/i }).click()
  await styleGroup.getByRole('radio', { name: 'Type Answer' }).click()
  await countGroup.getByRole('radio', { name: 'Unlimited' }).click()
  check(`[${label}/${theme}] summary updates to "Mixed · Explorer · Type Answer · Unlimited"`, await p.getByText('Mixed · Explorer · Type Answer · Unlimited').isVisible())

  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}/${theme}] no horizontal overflow`, noOverflow)

  await context.close()
}

async function runStartQuizFlow(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context)
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(300)

  await p.getByRole('radiogroup', { name: 'Quiz type' }).getByRole('radio', { name: /capitals/i }).click()
  await p.getByRole('radiogroup', { name: 'Question count' }).getByRole('radio', { name: '5' }).click()
  await p.getByRole('button', { name: 'Start Quiz' }).click()
  await p.waitForTimeout(300)
  check(`[${label}] Start Quiz navigates to /quiz/capitals`, p.url().endsWith('/quiz/capitals'))
  check(`[${label}] placeholder shows the resolved configuration`, await p.getByText('Capitals · Familiar · Multiple Choice · 5 Questions').isVisible())

  await p.getByRole('button', { name: 'Change Quiz' }).click()
  await p.waitForTimeout(300)
  check(`[${label}] Change Quiz returns to /quiz`, p.url().endsWith('/quiz'))
  check(`[${label}] Change Quiz retains the previous selections`, (await p.getByRole('radiogroup', { name: 'Quiz type' }).getByRole('radio', { name: /capitals/i }).getAttribute('aria-checked')) === 'true')

  await context.close()
}

async function runStudyQuizCta(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context)
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(300)
  await p.locator('[data-study-tile="china"]').click()
  await p.waitForTimeout(300)
  const card = p.locator('.country-result')
  check(`[${label}] China standalone result shows "Quiz" (not "Practice")`, await card.getByRole('button', { name: /^quiz$/i }).isVisible())
  check(`[${label}] no bare "Practice" button remains`, (await card.getByRole('button', { name: /^practice$/i }).count()) === 0)
  await card.getByRole('button', { name: /^quiz$/i }).click()
  await p.waitForTimeout(300)
  check(`[${label}] "Quiz" CTA routes to /quiz`, p.url().endsWith('/quiz'))
  await context.close()
}

await runSetup({ width: 390, height: 844 }, 'mobile', 'light')
await runSetup({ width: 1440, height: 900 }, 'desktop', 'light')
await runSetup({ width: 390, height: 844 }, 'mobile', 'dark')
await runSetup({ width: 1440, height: 900 }, 'desktop', 'dark')
await runStartQuizFlow({ width: 390, height: 844 }, 'mobile')
await runStartQuizFlow({ width: 1440, height: 900 }, 'desktop')
await runStudyQuizCta({ width: 390, height: 844 }, 'mobile')
await runStudyQuizCta({ width: 1440, height: 900 }, 'desktop')

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
