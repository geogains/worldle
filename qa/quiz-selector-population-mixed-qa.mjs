// Quiz selector QA: Population added as the 6th subject tile, Mixed
// repositioned/restyled as the final combined option below the 3x2/2x3
// subject grid. Verifies layout math (desktop centred ~2-card Mixed width,
// mobile full-width Mixed), selected states, no overflow, across desktop/
// tablet/mobile x light/dark.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newCtx(theme = 'light', viewport = { width: 1200, height: 1000 }) {
  const context = await browser.newContext({ viewport })
  const p = await context.newPage()
  p.on('pageerror', (e) => failures.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return { context, p }
}

function rectOf(p, selector, nth = 0) {
  return p.evaluate(
    ([sel, i]) => {
      const els = document.querySelectorAll(sel)
      const el = els[i]
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2 }
    },
    [selector, nth],
  )
}

// ------------------------------------------------------------------
// 1. Desktop: 3x2 subject grid, centred ~2-card Mixed row beneath.
// ------------------------------------------------------------------
for (const theme of ['light', 'dark']) {
  const { context, p } = await newCtx(theme, { width: 1200, height: 1000 })
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(250)

  const radios = await p.locator('[role="radiogroup"][aria-label="Quiz type"] [role="radio"]').all()
  check(`Desktop ${theme}: 7 Quiz Type radios present`, radios.length === 7)

  const labels = await p.$$eval('[role="radiogroup"][aria-label="Quiz type"] [role="radio"] .quiz-option__label', (els) =>
    els.map((e) => e.textContent),
  )
  check(
    `Desktop ${theme}: order is Flags/Capitals/Currencies/Languages/Facts/Population/Mixed`,
    JSON.stringify(labels) === JSON.stringify(['Flags', 'Capitals', 'Currencies', 'Languages', 'Facts', 'Population', 'Mixed']),
    JSON.stringify(labels),
  )

  const sel = '[role="radiogroup"][aria-label="Quiz type"] [role="radio"]'
  const rects = []
  for (let i = 0; i < 7; i++) rects.push(await rectOf(p, sel, i))
  const [flags, capitals, currencies, languages, facts, population, mixed] = rects

  check('Desktop: row 1 (Flags/Capitals/Currencies) shares the same y', Math.abs(flags.y - capitals.y) < 1 && Math.abs(capitals.y - currencies.y) < 1)
  check('Desktop: row 2 (Languages/Facts/Population) shares the same y', Math.abs(languages.y - facts.y) < 1 && Math.abs(facts.y - population.y) < 1)
  check('Desktop: row 2 is below row 1', languages.y > flags.y)
  check('Desktop: Population is the right-hand card of row 2', population.x > facts.x && population.x > languages.x)
  check('Desktop: all 6 subject cards share the same height', new Set(rects.slice(0, 6).map((r) => Math.round(r.h))).size === 1, JSON.stringify(rects.slice(0, 6).map((r) => Math.round(r.h))))

  check('Desktop: Mixed sits on its own row, below row 2', mixed.y > population.y + population.h - 1)
  check(`Desktop ${theme}: Mixed is shorter than a standard card`, mixed.h < flags.h, `mixed.h=${mixed.h} flags.h=${flags.h}`)
  const ratio = mixed.h / flags.h
  check(`Desktop ${theme}: Mixed height is roughly 55-75% of a standard card`, ratio >= 0.5 && ratio <= 0.8, `ratio=${ratio.toFixed(2)}`)

  // Width ~ 2 standard cards + 1 gap, and centred under the 3-column grid.
  const gridRect = await p.evaluate(() => {
    const g = document.querySelector('[role="radiogroup"][aria-label="Quiz type"]')
    const r = g.getBoundingClientRect()
    return { x: r.x, w: r.width, cx: r.x + r.width / 2 }
  })
  const expectedMixedWidth = flags.w * 2 + (capitals.x - (flags.x + flags.w))
  check(
    `Desktop ${theme}: Mixed width ≈ 2 standard cards + 1 gap`,
    Math.abs(mixed.w - expectedMixedWidth) < 3,
    `mixed.w=${mixed.w.toFixed(1)} expected≈${expectedMixedWidth.toFixed(1)}`,
  )
  check(
    `Desktop ${theme}: Mixed is centred under the full 3-column grid (not left-aligned to columns 1-2)`,
    Math.abs(mixed.cx - gridRect.cx) < 2,
    `mixed.cx=${mixed.cx.toFixed(1)} grid.cx=${gridRect.cx.toFixed(1)}`,
  )
  check(`Desktop ${theme}: Mixed does not overhang the grid container`, mixed.x >= gridRect.x - 1 && mixed.x + mixed.w <= gridRect.x + gridRect.w + 1)

  // Icon+label horizontal in Mixed (icon left/above-of-label check via bounding box comparison).
  const mixedIconLabel = await p.evaluate(() => {
    const btn = document.querySelectorAll('[role="radiogroup"][aria-label="Quiz type"] [role="radio"]')[6]
    const icon = btn.querySelector('.quiz-option__icon').getBoundingClientRect()
    const label = btn.querySelector('.quiz-option__label').getBoundingClientRect()
    return { iconY: icon.y, labelY: label.y, iconX: icon.x, labelX: label.x }
  })
  check('Desktop: Mixed icon and label sit side-by-side (same row), not stacked', Math.abs(mixedIconLabel.iconY - mixedIconLabel.labelY) < 12, JSON.stringify(mixedIconLabel))

  // Selected-state checks.
  await p.locator(sel).nth(5).click() // Population
  check(`Desktop ${theme}: Population selectable — aria-checked true`, (await p.locator(sel).nth(5).getAttribute('aria-checked')) === 'true')
  check(`Desktop ${theme}: Population has selected class`, await p.locator(sel).nth(5).evaluate((el) => el.classList.contains('quiz-option--selected')))
  await p.locator(sel).nth(6).click() // Mixed
  check(`Desktop ${theme}: Mixed selectable — aria-checked true`, (await p.locator(sel).nth(6).getAttribute('aria-checked')) === 'true')
  check(`Desktop ${theme}: Mixed has selected class`, await p.locator(sel).nth(6).evaluate((el) => el.classList.contains('quiz-option--selected')))
  check(`Desktop ${theme}: Population deselected once Mixed is chosen`, (await p.locator(sel).nth(5).getAttribute('aria-checked')) === 'false')

  // Difficulty section still cleanly spaced below.
  check(`Desktop ${theme}: Difficulty heading renders below Mixed`, await p.getByRole('heading', { level: 2, name: 'Difficulty' }).isVisible())
  const diffHeadingY = await p.evaluate(() => document.querySelector('.quiz-section__title:nth-of-type(1)')?.getBoundingClientRect().y ?? 0)

  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`Desktop ${theme}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)

  await p.screenshot({ path: `${OUT}/quiz-selector-desktop-${theme}.png`, fullPage: true })
  await context.close()
}

// ------------------------------------------------------------------
// 2. Mobile: 2x3 subject grid, full-width Mixed beneath.
// ------------------------------------------------------------------
for (const theme of ['light', 'dark']) {
  const { context, p } = await newCtx(theme, { width: 375, height: 1100 })
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(250)

  const sel = '[role="radiogroup"][aria-label="Quiz type"] [role="radio"]'
  const rects = []
  for (let i = 0; i < 7; i++) rects.push(await rectOf(p, sel, i))
  const [flags, capitals, currencies, languages, facts, population, mixed] = rects

  check('Mobile: row 1 (Flags/Capitals) shares the same y', Math.abs(flags.y - capitals.y) < 1)
  check('Mobile: row 2 (Currencies/Languages) shares the same y and is below row 1', Math.abs(currencies.y - languages.y) < 1 && currencies.y > flags.y)
  check('Mobile: row 3 (Facts/Population) shares the same y and is below row 2', Math.abs(facts.y - population.y) < 1 && facts.y > currencies.y)
  check('Mobile: exactly 2 columns (Population sits to the right of Facts, not below)', population.x > facts.x)

  check('Mobile: Mixed sits below row 3', mixed.y > facts.y + facts.h - 1)
  const gridRect = await p.evaluate(() => {
    const g = document.querySelector('[role="radiogroup"][aria-label="Quiz type"]')
    const r = g.getBoundingClientRect()
    return { x: r.x, w: r.width }
  })
  check(
    `Mobile ${theme}: Mixed spans the full two-column grid width`,
    Math.abs(mixed.w - gridRect.w) < 2,
    `mixed.w=${mixed.w.toFixed(1)} grid.w=${gridRect.w.toFixed(1)}`,
  )
  check(`Mobile ${theme}: Mixed is shorter than a standard card`, mixed.h < flags.h, `mixed.h=${mixed.h} flags.h=${flags.h}`)

  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`Mobile ${theme}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)

  // Selected states.
  await p.locator(sel).nth(5).click() // Population
  check(`Mobile ${theme}: Population selectable`, (await p.locator(sel).nth(5).getAttribute('aria-checked')) === 'true')
  await p.locator(sel).nth(6).click() // Mixed
  check(`Mobile ${theme}: Mixed selectable`, (await p.locator(sel).nth(6).getAttribute('aria-checked')) === 'true')

  await p.screenshot({ path: `${OUT}/quiz-selector-mobile-${theme}.png`, fullPage: true })
  await context.close()
}

// ------------------------------------------------------------------
// 3. Tablet/intermediate width — the 480px breakpoint boundary.
// ------------------------------------------------------------------
for (const width of [479, 480, 700]) {
  const { context, p } = await newCtx('light', { width, height: 1000 })
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(200)
  const sel = '[role="radiogroup"][aria-label="Quiz type"] [role="radio"]'
  const flags = await rectOf(p, sel, 0)
  const capitals = await rectOf(p, sel, 1)
  const currencies = await rectOf(p, sel, 2)
  const cols = width >= 480 ? 3 : 2
  if (cols === 3) {
    check(`${width}px: 3-column row (Flags/Capitals/Currencies share y)`, Math.abs(flags.y - currencies.y) < 1)
  } else {
    check(`${width}px: 2-column row (Currencies wraps to row 2)`, currencies.y > flags.y)
  }
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`${width}px: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/quiz-selector-${width}px.png` })
  await context.close()
}

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
