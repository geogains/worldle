// Phase 2 v1 Study tab verification: /study loads all 200 canonical
// countries (not ANSWER_POOL-filtered), search works (case/diacritic
// insensitive), long names wrap without overflow, flags load with lazy
// loading, tile navigation reaches the existing /results/:slug page,
// browser Back returns to Study, and both light/dark modes render cleanly
// at mobile and desktop viewports with zero console/page errors.
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = 'http://localhost:4173'
const OUT_DIR = 'qa/screenshots'
await mkdir(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const failures = []
const errors = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newPage(context, theme) {
  const p = await context.newPage()
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`[console:${theme}] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror:${theme}] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return p
}

async function runViewport(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, 'light')

  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(400)

  check(`[${label}] /study heading renders`, await p.getByRole('heading', { level: 1, name: 'Study' }).isVisible())
  check(`[${label}] search input renders`, await p.getByRole('searchbox', { name: 'Search countries' }).isVisible())

  const tileCount = await p.locator('[data-study-tile]').count()
  check(`[${label}] exactly 200 tiles initially`, tileCount === 200, `found ${tileCount}`)

  // Flags load and carry native lazy loading.
  const firstFlag = p.locator('[data-study-tile] img').first()
  check(`[${label}] first flag loaded (naturalWidth > 0)`, await firstFlag.evaluate((img) => img.complete && img.naturalWidth > 0))
  const lazyCount = await p.locator('[data-study-tile] img[loading="lazy"]').count()
  check(`[${label}] all flag images have loading="lazy"`, lazyCount === 200, `found ${lazyCount}`)

  // No broken flags: every img's naturalWidth > 0 once loaded.
  await p.waitForTimeout(300)
  const brokenCount = await p.locator('[data-study-tile] img').evaluateAll(
    (imgs) => imgs.filter((img) => img.complete && img.naturalWidth === 0).length,
  )
  check(`[${label}] zero broken flag images`, brokenCount === 0, `broken: ${brokenCount}`)

  // Search: "united" -> exactly 3.
  const search = p.getByRole('searchbox', { name: 'Search countries' })
  await search.fill('united')
  await p.waitForTimeout(150)
  let count = await p.locator('[data-study-tile]').count()
  check(`[${label}] search "united" returns exactly 3 tiles`, count === 3, `found ${count}`)
  check(`[${label}] "united" includes United Kingdom`, await p.getByText('United Kingdom', { exact: true }).isVisible())
  check(`[${label}] "united" includes United States`, await p.getByText('United States', { exact: true }).isVisible())
  check(`[${label}] "united" includes United Arab Emirates`, await p.getByText('United Arab Emirates', { exact: true }).isVisible())

  await search.fill('UNITED')
  await p.waitForTimeout(150)
  count = await p.locator('[data-study-tile]').count()
  check(`[${label}] search "UNITED" (uppercase) also returns exactly 3 tiles`, count === 3, `found ${count}`)

  await p.screenshot({ path: `${OUT_DIR}/study-${label}-search-united.png` })

  // Search: "sao" -> São Tomé and Príncipe.
  await search.fill('sao')
  await p.waitForTimeout(150)
  count = await p.locator('[data-study-tile]').count()
  check(`[${label}] search "sao" returns exactly 1 tile`, count === 1, `found ${count}`)
  check(`[${label}] "sao" finds São Tomé and Príncipe`, await p.getByText('São Tomé and Príncipe', { exact: true }).isVisible())

  // Nonsense query -> empty state.
  await search.fill('zzzzzzzz')
  await p.waitForTimeout(150)
  count = await p.locator('[data-study-tile]').count()
  check(`[${label}] nonsense search returns zero tiles`, count === 0, `found ${count}`)
  check(`[${label}] "No countries found." is visible`, await p.getByText('No countries found.').isVisible())

  // Clear search -> back to 200.
  await search.fill('')
  await p.waitForTimeout(150)
  count = await p.locator('[data-study-tile]').count()
  check(`[${label}] clearing search restores all 200 tiles`, count === 200, `found ${count}`)

  // Long names wrap cleanly, no horizontal overflow.
  const noOverflow1 = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}] no horizontal overflow with all 200 tiles`, noOverflow1)
  for (const name of ['Saint Vincent and the Grenadines', 'Central African Republic', 'Bosnia and Herzegovina', 'United Arab Emirates']) {
    const visible = await p.getByText(name, { exact: true }).isVisible()
    check(`[${label}] "${name}" tile renders`, visible)
  }

  await p.screenshot({ path: `${OUT_DIR}/study-${label}-index.png`, fullPage: false })

  // Navigate to United Kingdom, confirm full result page, then Back returns to Study.
  await search.fill('')
  await p.waitForTimeout(150)
  const ukTile = p.locator('[data-study-tile="united-kingdom"]')
  await ukTile.scrollIntoViewIfNeeded()
  await ukTile.click()
  await p.waitForTimeout(300)
  check(`[${label}] clicking United Kingdom navigates to /results/united-kingdom`, p.url().endsWith('/results/united-kingdom'))
  check(`[${label}] United Kingdom result page renders complete facts`, await p.getByText('London').isVisible())
  check(`[${label}] United Kingdom result page has no "Coming soon" placeholder`, (await p.getByText('Coming soon').count()) === 0)

  await p.goBack()
  await p.waitForTimeout(300)
  check(`[${label}] browser Back returns to /study`, p.url().endsWith('/study'))
  check(`[${label}] Study heading visible again after Back`, await p.getByRole('heading', { level: 1, name: 'Study' }).isVisible())

  const noOverflow2 = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}] no horizontal overflow after returning to Study`, noOverflow2)

  await context.close()
}

async function runDarkMode(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, 'dark')
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(400)
  check(`[${label}-dark] Study heading renders in dark mode`, await p.getByRole('heading', { level: 1, name: 'Study' }).isVisible())
  const tileCount = await p.locator('[data-study-tile]').count()
  check(`[${label}-dark] 200 tiles render in dark mode`, tileCount === 200, `found ${tileCount}`)
  const theme = await p.evaluate(() => document.documentElement.getAttribute('data-theme'))
  check(`[${label}-dark] data-theme is "dark"`, theme === 'dark')
  await p.screenshot({ path: `${OUT_DIR}/study-${label}-dark.png` })
  await context.close()
}

await runViewport({ width: 390, height: 844 }, 'mobile')
await runViewport({ width: 1440, height: 900 }, 'desktop')
await runDarkMode({ width: 390, height: 844 }, 'mobile')
await runDarkMode({ width: 1440, height: 900 }, 'desktop')

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
