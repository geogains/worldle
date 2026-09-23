// Header responsive breakpoint QA: verifies the hamburger/desktop-nav
// switch, logo centering, no overflow, hamburger open/close, nav links,
// active-page state, and light/dark mode across representative widths.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newCtx(theme = 'light', viewport = { width: 360, height: 900 }) {
  const context = await browser.newContext({ viewport })
  const p = await context.newPage()
  p.on('pageerror', (e) => failures.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return { context, p }
}

async function runSection(tag, fn) {
  try {
    await fn()
  } catch (err) {
    check(`${tag}: section completed without throwing`, false, err?.message ?? String(err))
  }
}

async function measure(p) {
  return p.evaluate(() => {
    const header = document.querySelector('header')
    const nav = header.querySelector('nav[aria-label="Game modes"]')
    const trigger = header.querySelector('[aria-label="Open menu"]')
    const logoBtn = header.querySelector('button[aria-label$="home"]')
    const vw = document.documentElement.clientWidth
    const logoRect = logoBtn.getBoundingClientRect()
    const logoCenter = (logoRect.left + logoRect.right) / 2
    return {
      navVisible: getComputedStyle(nav).display !== 'none',
      triggerVisible: getComputedStyle(trigger).display !== 'none',
      logoOffset: Math.round(logoCenter - vw / 2),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }
  })
}

const widths = [
  { w: 360, h: 800, label: '360-mobile' },
  { w: 700, h: 800, label: '700-below-old-worst-case' },
  { w: 768, h: 900, label: '768-tablet-portrait' },
  { w: 900, h: 900, label: '900-just-below-new-breakpoint' },
  { w: 1000, h: 900, label: '1000-tablet-medium' },
  { w: 1023, h: 900, label: '1023-just-below-breakpoint' },
  { w: 1024, h: 900, label: '1024-at-breakpoint' },
  { w: 1100, h: 900, label: '1100-just-above-breakpoint' },
  { w: 1200, h: 900, label: '1200-small-desktop' },
  { w: 1440, h: 900, label: '1440-wide-desktop' },
]

await runSection('Width sweep — hamburger below lg, nav at/above lg, logo centered, no overflow', async () => {
  for (const { w, h, label } of widths) {
    const { context, p } = await newCtx('light', { width: w, height: h })
    await p.goto(`${BASE}/`)
    await p.waitForTimeout(200)
    const m = await measure(p)
    const expectHamburger = w < 1024
    check(`${label} (${w}px): trigger visible = ${expectHamburger}`, m.triggerVisible === expectHamburger, JSON.stringify(m))
    check(`${label} (${w}px): nav visible = ${!expectHamburger}`, m.navVisible === !expectHamburger, JSON.stringify(m))
    check(`${label} (${w}px): logo centered (offset within 2px)`, Math.abs(m.logoOffset) <= 2, `offset=${m.logoOffset}`)
    check(`${label} (${w}px): no horizontal overflow`, !m.overflow)
    await context.close()
  }
})

await runSection('Hamburger opens/closes at tablet width (1000px)', async () => {
  const { context, p } = await newCtx('light', { width: 1000, height: 900 })
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Open menu' }).click()
  check('Drawer opens', await p.getByRole('dialog', { name: /navigation/i }).isVisible())
  check('Drawer nav links present', await p.getByRole('dialog').getByRole('button', { name: 'Daily' }).isVisible())
  await p.getByRole('button', { name: 'Close menu' }).click()
  await p.waitForTimeout(400)
  check('Drawer closes', (await p.getByRole('dialog').count()) === 0 || !(await p.getByRole('dialog').isVisible().catch(() => false)))
  await context.close()
})

await runSection('Nav links work at tablet width via drawer (1000px)', async () => {
  const { context, p } = await newCtx('light', { width: 1000, height: 900 })
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Open menu' }).click()
  await p.getByRole('dialog').getByRole('button', { name: 'Study' }).click()
  await p.waitForTimeout(200)
  check('Navigating via drawer at tablet width lands on /study', p.url().endsWith('/study'))
  await context.close()
})

await runSection('Active-page state correct at tablet width (drawer)', async () => {
  const { context, p } = await newCtx('light', { width: 1000, height: 900 })
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Open menu' }).click()
  const studyItem = p.getByRole('dialog').getByRole('button', { name: 'Study' })
  check('Study marked aria-current in drawer', (await studyItem.getAttribute('aria-current')) === 'page')
  await context.close()
})

await runSection('Desktop nav works and shows active state above breakpoint (1200px)', async () => {
  const { context, p } = await newCtx('light', { width: 1200, height: 900 })
  await p.goto(`${BASE}/archive`)
  await p.waitForTimeout(200)
  const nav = p.getByRole('navigation', { name: 'Game modes' })
  check('Archive marked aria-current in desktop nav', (await nav.getByRole('button', { name: 'Archive' }).getAttribute('aria-current')) === 'page')
  await nav.getByRole('button', { name: 'Daily' }).click()
  await p.waitForTimeout(200)
  check('Clicking desktop nav link navigates to /', p.url() === `${BASE}/` || p.url().endsWith('/daily') || p.url() === `${BASE}`)
  await context.close()
})

await runSection('Visual — 360px mobile light/dark', async () => {
  for (const theme of ['light', 'dark']) {
    const { context, p } = await newCtx(theme, { width: 360, height: 400 })
    await p.goto(`${BASE}/`)
    await p.waitForTimeout(200)
    await p.screenshot({ path: `${OUT}/header-360-${theme}.png` })
    await context.close()
  }
})
await runSection('Visual — 768px tablet portrait light/dark', async () => {
  for (const theme of ['light', 'dark']) {
    const { context, p } = await newCtx(theme, { width: 768, height: 400 })
    await p.goto(`${BASE}/`)
    await p.waitForTimeout(200)
    await p.screenshot({ path: `${OUT}/header-768-${theme}.png` })
    await context.close()
  }
})
await runSection('Visual — 1000px tablet/medium light/dark', async () => {
  for (const theme of ['light', 'dark']) {
    const { context, p } = await newCtx(theme, { width: 1000, height: 400 })
    await p.goto(`${BASE}/`)
    await p.waitForTimeout(200)
    await p.screenshot({ path: `${OUT}/header-1000-${theme}.png` })
    await context.close()
  }
})
await runSection('Visual — 1000px tablet drawer open', async () => {
  const { context, p } = await newCtx('light', { width: 1000, height: 700 })
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Open menu' }).click()
  await p.waitForTimeout(400)
  await p.screenshot({ path: `${OUT}/header-1000-drawer-open.png` })
  await context.close()
})
await runSection('Visual — 1200px small desktop light/dark', async () => {
  for (const theme of ['light', 'dark']) {
    const { context, p } = await newCtx(theme, { width: 1200, height: 400 })
    await p.goto(`${BASE}/`)
    await p.waitForTimeout(200)
    await p.screenshot({ path: `${OUT}/header-1200-${theme}.png` })
    await context.close()
  }
})
await runSection('Visual — 1440px wide desktop light/dark', async () => {
  for (const theme of ['light', 'dark']) {
    const { context, p } = await newCtx(theme, { width: 1440, height: 400 })
    await p.goto(`${BASE}/`)
    await p.waitForTimeout(200)
    await p.screenshot({ path: `${OUT}/header-1440-${theme}.png` })
    await context.close()
  }
})

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
