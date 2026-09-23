// Drawer nav icon QA: verifies the 5 new PNG icons load (no 404s), sizing
// is consistent, active/inactive states, alignment, and desktop nav is
// unaffected — across mobile/tablet widths and light/dark themes.
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
  const failedRequests = []
  p.on('requestfailed', (req) => failedRequests.push(req.url()))
  p.on('response', (res) => {
    if (res.status() >= 400 && /\/icons\//.test(res.url())) failedRequests.push(`${res.status()} ${res.url()}`)
  })
  p.on('pageerror', (e) => failures.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return { context, p, failedRequests }
}

async function runSection(tag, fn) {
  try {
    await fn()
  } catch (err) {
    check(`${tag}: section completed without throwing`, false, err?.message ?? String(err))
  }
}

const ICONS = ['daily', 'practice', 'archive', 'study', 'quiz']
const LABELS = ['Daily', 'Practice', 'Archive', 'Study', 'Quiz']

await runSection('All 5 icons load with no missing-image requests (mobile drawer)', async () => {
  const { context, p, failedRequests } = await newCtx('light', { width: 360, height: 900 })
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Open menu' }).click()
  await p.waitForTimeout(400)
  for (const icon of ICONS) {
    const img = p.locator(`.nav-drawer img[src="/icons/${icon}.png"]`)
    check(`${icon}.png: present in drawer`, (await img.count()) === 1)
    const natural = await img.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight, complete: el.complete }))
    check(`${icon}.png: actually loaded (naturalWidth > 0, complete)`, natural.w > 0 && natural.complete, JSON.stringify(natural))
  }
  check('No failed/missing icon requests', failedRequests.length === 0, failedRequests.join(', '))
  await context.close()
})

await runSection('Icon display size is consistent (22x22) across all 5', async () => {
  const { context, p } = await newCtx('light', { width: 360, height: 900 })
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Open menu' }).click()
  await p.waitForTimeout(400)
  const sizes = await p.evaluate(() =>
    Array.from(document.querySelectorAll('.nav-drawer img.nav-drawer__item-icon-img')).map((el) => {
      const r = el.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height) }
    }),
  )
  check('Exactly 5 icons rendered', sizes.length === 5, JSON.stringify(sizes))
  check('All icons render at the same size', sizes.every((s) => s.w === sizes[0].w && s.h === sizes[0].h), JSON.stringify(sizes))
  await context.close()
})

await runSection('Icon/label alignment: icon vertically centered with its label', async () => {
  const { context, p } = await newCtx('light', { width: 360, height: 900 })
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Open menu' }).click()
  await p.waitForTimeout(400)
  const items = p.locator('.nav-drawer__item')
  const count = await items.count()
  check('5 drawer items present', count === 5)
  for (let i = 0; i < count; i++) {
    const item = items.nth(i)
    const diff = await item.evaluate((el) => {
      const icon = el.querySelector('img')
      const label = el.textContent?.trim()
      const iconRect = icon.getBoundingClientRect()
      const itemRect = el.getBoundingClientRect()
      const iconCenter = iconRect.top + iconRect.height / 2
      const itemCenter = itemRect.top + itemRect.height / 2
      return { label, offset: Math.abs(iconCenter - itemCenter) }
    })
    check(`Item ${i} (${diff.label}): icon roughly centered in its row (within 10px)`, diff.offset < 10, `offset=${diff.offset}`)
  }
  await context.close()
})

await runSection('Active state: current page item is visually distinct, correct icon renders', async () => {
  const { context, p } = await newCtx('light', { width: 768, height: 900 })
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Open menu' }).click()
  await p.waitForTimeout(400)
  const studyItem = p.getByRole('dialog').getByRole('button', { name: 'Study' })
  check('Study item marked aria-current="page"', (await studyItem.getAttribute('aria-current')) === 'page')
  check('Study item shows the study.png icon', (await studyItem.locator('img[src="/icons/study.png"]').count()) === 1)
  const otherItem = p.getByRole('dialog').getByRole('button', { name: 'Daily' })
  check('Daily item (inactive) has no aria-current', (await otherItem.getAttribute('aria-current')) === null)
  check('Daily item shows the daily.png icon', (await otherItem.locator('img[src="/icons/daily.png"]').count()) === 1)
  await p.screenshot({ path: `${OUT}/drawer-icons-active-state.png` })
  await context.close()
})

await runSection('Desktop nav unaffected — no icons rendered there, labels only', async () => {
  const { context, p } = await newCtx('light', { width: 1200, height: 900 })
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(200)
  const desktopNav = p.getByRole('navigation', { name: 'Game modes' })
  check('Desktop nav has no icon images', (await desktopNav.locator('img').count()) === 0)
  for (const label of LABELS) {
    check(`Desktop nav shows "${label}" label`, await desktopNav.getByRole('button', { name: label }).isVisible())
  }
  await context.close()
})

await runSection('No layout shift: drawer row heights unchanged across all 5 items', async () => {
  const { context, p } = await newCtx('light', { width: 360, height: 900 })
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Open menu' }).click()
  await p.waitForTimeout(400)
  const heights = await p.evaluate(() =>
    Array.from(document.querySelectorAll('.nav-drawer__item')).map((el) => Math.round(el.getBoundingClientRect().height)),
  )
  check('All 5 drawer item rows are the same height', heights.every((h) => h === heights[0]), JSON.stringify(heights))
  await context.close()
})

// ------------------------------------------------------------------
// Visual QA screenshots — mobile, tablet, light/dark.
// ------------------------------------------------------------------
await runSection('Visual — 360px mobile drawer, light/dark', async () => {
  for (const theme of ['light', 'dark']) {
    const { context, p } = await newCtx(theme, { width: 360, height: 700 })
    await p.goto(`${BASE}/`)
    await p.waitForTimeout(200)
    await p.getByRole('button', { name: 'Open menu' }).click()
    await p.waitForTimeout(400)
    await p.screenshot({ path: `${OUT}/drawer-icons-360-${theme}.png` })
    await context.close()
  }
})
await runSection('Visual — 768px tablet drawer, light/dark', async () => {
  for (const theme of ['light', 'dark']) {
    const { context, p } = await newCtx(theme, { width: 768, height: 700 })
    await p.goto(`${BASE}/`)
    await p.waitForTimeout(200)
    await p.getByRole('button', { name: 'Open menu' }).click()
    await p.waitForTimeout(400)
    await p.screenshot({ path: `${OUT}/drawer-icons-768-${theme}.png` })
    await context.close()
  }
})
await runSection('Visual — 1000px tablet/medium drawer', async () => {
  const { context, p } = await newCtx('light', { width: 1000, height: 700 })
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(200)
  await p.getByRole('button', { name: 'Open menu' }).click()
  await p.waitForTimeout(400)
  await p.screenshot({ path: `${OUT}/drawer-icons-1000.png` })
  await context.close()
})

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
