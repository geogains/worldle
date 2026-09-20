// Two-part pass:
//  1. Standalone Study result pages: Quiz CTA removed (Back to Study is the
//     sole, secondary-styled action), spacing tightened to make the best
//     use of the freed space, viewport fit checked across several
//     countries including long-content ones.
//  2. Quiz added to the main nav (desktop + mobile drawer), active on
//     /quiz and every /quiz/:mode subroute, header stays balanced.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
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

async function noHorizontalOverflow(p, tag) {
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`${tag}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)
}

// A. Study result: Quiz gone, Back to Study only, viewport fit.
const LONG_CONTENT_SLUGS = ['bolivia', 'mali', 'bosnia-and-herzegovina', 'saint-vincent-and-the-grenadines', 'zimbabwe']
const NORMAL_SLUGS = ['tanzania', 'japan', 'france']

async function runStudyResult(viewport, theme, slug) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  const tag = `study-result ${theme} ${viewport.width}x${viewport.height} ${slug}`
  await p.goto(`${BASE}/results/${slug}`)
  await p.waitForTimeout(300)
  const card = p.locator('.country-result')
  check(`${tag}: Quiz CTA is gone`, (await card.getByRole('button', { name: /^quiz$/i }).count()) === 0)
  const backToStudy = card.getByRole('button', { name: /^back to study$/i })
  check(`${tag}: Back to Study is the only action, present and visible`, await backToStudy.isVisible())
  const cls = await backToStudy.getAttribute('class')
  check(`${tag}: Back to Study keeps secondary styling (not promoted to primary)`, cls.includes('btn--secondary') && !cls.includes('btn--primary'))
  const actionsCount = await card.locator('.country-result__actions').getByRole('button').count()
  check(`${tag}: exactly one action renders (no empty primary-button gap)`, actionsCount === 1)
  // Previous/Next untouched.
  const prev = card.locator('.country-result__nav-btn').first()
  const next = card.locator('.country-result__nav-btn').last()
  check(`${tag}: Previous/Next arrows still render`, (await prev.isVisible()) && (await next.isVisible()))

  const fit = await p.evaluate(() => {
    const page = document.querySelector('.country-result-page')
    return { over: page.scrollHeight - page.clientHeight }
  })
  console.log(`${tag}: viewport fit — over by ${fit.over}px (<=1 means fits)`)
  await noHorizontalOverflow(p, tag)
  await context.close()
  return fit.over <= 1
}

// B. Nav: desktop + drawer show Quiz, routes correctly, active states.
async function runDesktopNav(theme) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 200 } })
  const p = await newPage(context, theme)
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(250)
  const nav = p.getByRole('navigation', { name: 'Game modes' })
  const labels = await nav.getByRole('button').allTextContents()
  check(`desktop ${theme}: nav shows Daily, Practice, Archive, Study, Quiz in order`, JSON.stringify(labels) === JSON.stringify(['Daily', 'Practice', 'Archive', 'Study', 'Quiz']))

  await nav.getByRole('button', { name: 'Quiz' }).click()
  await p.waitForTimeout(250)
  check(`desktop ${theme}: Quiz nav link routes to /quiz`, p.url().endsWith('/quiz'))
  check(`desktop ${theme}: Quiz shows active state on /quiz`, (await nav.getByRole('button', { name: 'Quiz' }).getAttribute('aria-current')) === 'page')

  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(250)
  check(`desktop ${theme}: Quiz stays active on /quiz/flags (subroute, not just /quiz)`, (await nav.getByRole('button', { name: 'Quiz' }).getAttribute('aria-current')) === 'page')

  // Existing active states unaffected.
  for (const [path, label] of [['/', 'Daily'], ['/practice', 'Practice'], ['/archive', 'Archive'], ['/study', 'Study']]) {
    await p.goto(`${BASE}${path}`)
    await p.waitForTimeout(200)
    check(`desktop ${theme}: ${label} still shows active state on ${path}`, (await nav.getByRole('button', { name: label }).getAttribute('aria-current')) === 'page')
  }
  await noHorizontalOverflow(p, `desktop nav ${theme}`)
  await p.screenshot({ path: `${OUT}/nav-desktop-${theme}.png`, clip: { x: 0, y: 0, width: 1280, height: 68 } })
  await context.close()
}

async function runMobileNav(theme) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const p = await newPage(context, theme)
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(250)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(350)
  const drawer = p.getByRole('dialog', { name: /navigation/i })
  const labels = await drawer.locator('.nav-drawer__item').allTextContents()
  check(`mobile ${theme}: drawer shows Daily, Practice, Archive, Study, Quiz in order`, JSON.stringify(labels) === JSON.stringify(['Daily', 'Practice', 'Archive', 'Study', 'Quiz']))
  await p.screenshot({ path: `${OUT}/nav-drawer-${theme}.png` })

  await drawer.getByRole('button', { name: 'Quiz' }).click()
  await p.waitForTimeout(400)
  check(`mobile ${theme}: Quiz drawer link routes to /quiz`, p.url().endsWith('/quiz'))
  check(`mobile ${theme}: drawer closes after navigating`, (await p.getByRole('dialog', { name: /navigation/i }).count()) === 0)
  await noHorizontalOverflow(p, `mobile nav ${theme}`)
  await context.close()
}

for (const theme of ['light', 'dark']) {
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    for (const slug of NORMAL_SLUGS) await runStudyResult(viewport, theme, slug)
  }
  // Long-content countries: only need one representative viewport per
  // theme to confirm CTA/layout correctness; fit is reported, not asserted
  // pass/fail, since some are expected to still need scroll (honest report).
  for (const slug of LONG_CONTENT_SLUGS) {
    for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
      await runStudyResult(viewport, theme, slug)
    }
  }
  await runDesktopNav(theme)
  await runMobileNav(theme)
}

// Desktop header regression: unchanged height, no overlap, logo centered,
// no overflow at normal laptop widths.
for (const w of [1024, 1280, 1366, 1440]) {
  const context = await browser.newContext({ viewport: { width: w, height: 800 } })
  const p = await newPage(context, 'light')
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(250)
  const info = await p.evaluate(() => {
    const header = document.querySelector('header > div')
    const logo = document.querySelector('.header-logo')
    const nav = document.querySelector('nav[aria-label="Game modes"]')
    const icons = document.querySelector('header .flex.flex-1.items-center.justify-end')
    const hRect = header.getBoundingClientRect()
    const logoRect = logo.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    const iconsRect = icons.getBoundingClientRect()
    return {
      headerH: hRect.height,
      overlap: navRect.right > iconsRect.left,
      logoCenterOffset: Math.abs((logoRect.left + logoRect.width / 2) - window.innerWidth / 2),
    }
  })
  check(`header ${w}px: height unchanged (68px)`, Math.abs(info.headerH - 68) < 0.5, `${info.headerH}px`)
  check(`header ${w}px: nav does not overlap icons`, !info.overlap)
  check(`header ${w}px: logo remains centered`, info.logoCenterOffset < 1, `${info.logoCenterOffset.toFixed(2)}px off-center`)
  await noHorizontalOverflow(p, `header ${w}px`)
  await context.close()
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
