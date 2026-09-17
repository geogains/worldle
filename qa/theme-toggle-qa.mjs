// Theme toggle QA: verifies switch behaviour, persistence, accessibility,
// reduced motion, and header layout at every required breakpoint.
import { chromium } from 'playwright'
const OUT = new URL('./screenshots', import.meta.url).pathname
const b = await chromium.launch()
const errors = []

const seenHelp = { 'daily-worldle:v1:prefs': JSON.stringify({ theme: 'light', hasSeenHelp: true }) }
async function ctx(opts = {}, storage = seenHelp) {
  const c = await b.newContext({ deviceScaleFactor: 2, ...opts })
  const p = await c.newPage()
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  // Guarded so a reload (which re-runs addInitScript) never clobbers a
  // preference the app itself already wrote after the initial seed.
  if (storage) await p.addInitScript((s) => { for (const [k, v] of Object.entries(s)) if (!localStorage.getItem(k)) localStorage.setItem(k, v) }, storage)
  return { c, p }
}

// 1. Light -> dark -> light via click, aria state, persistence after reload.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } })
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  const before = await p.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    checked: document.querySelector('.theme-toggle')?.getAttribute('aria-checked'),
    role: document.querySelector('.theme-toggle')?.getAttribute('role'),
    label: document.querySelector('.theme-toggle')?.getAttribute('aria-label'),
  }))
  console.log('initial:', JSON.stringify(before))
  await p.screenshot({ path: `${OUT}/80-toggle-light-1280.png`, clip: { x: 1000, y: 0, width: 280, height: 56 } })

  await p.click('.theme-toggle')
  await p.waitForTimeout(500)
  const afterClick = await p.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    checked: document.querySelector('.theme-toggle')?.getAttribute('aria-checked'),
    label: document.querySelector('.theme-toggle')?.getAttribute('aria-label'),
    stored: JSON.parse(localStorage.getItem('daily-worldle:v1:prefs') || '{}').theme,
  }))
  console.log('after click 1 (light->dark):', JSON.stringify(afterClick))
  await p.screenshot({ path: `${OUT}/81-toggle-dark-1280.png`, clip: { x: 1000, y: 0, width: 280, height: 56 } })

  await p.reload()
  await p.waitForTimeout(300)
  const afterReload = await p.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    checked: document.querySelector('.theme-toggle')?.getAttribute('aria-checked'),
  }))
  console.log('persisted after reload:', JSON.stringify(afterReload))

  await p.click('.theme-toggle')
  await p.waitForTimeout(500)
  const afterClick2 = await p.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    checked: document.querySelector('.theme-toggle')?.getAttribute('aria-checked'),
    label: document.querySelector('.theme-toggle')?.getAttribute('aria-label'),
  }))
  console.log('after click 2 (dark->light):', JSON.stringify(afterClick2))
  await c.close()
}

// 2. Keyboard accessibility: Tab to it, activate with both Enter and Space.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } })
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.focus('.theme-toggle')
  const focused = await p.evaluate(() => document.activeElement?.className)
  console.log('focused element class:', focused)
  await p.keyboard.press('Enter')
  await p.waitForTimeout(400)
  console.log('theme after Enter:', await p.evaluate(() => document.documentElement.getAttribute('data-theme')))
  await p.keyboard.press(' ')
  await p.waitForTimeout(400)
  console.log('theme after Space:', await p.evaluate(() => document.documentElement.getAttribute('data-theme')))
  await p.screenshot({ path: `${OUT}/82-toggle-keyboard-focus.png`, clip: { x: 1000, y: 0, width: 280, height: 56 } })
  await c.close()
}

// 3. Reduced motion: theme still switches, ripple element never renders.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 }, reducedMotion: 'reduce' })
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.click('.theme-toggle')
  await p.waitForTimeout(200)
  const state = await p.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    glowPresent: !!document.querySelector('.theme-toggle__glow'),
  }))
  console.log('reduced motion after click:', JSON.stringify(state))
  await c.close()
}

// 4. Header layout at required widths — no overlap, no overflow.
for (const w of [320, 375, 390, 430, 768, 1280]) {
  const { c, p } = await ctx({ viewport: { width: w, height: 200 } })
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  const info = await p.evaluate(() => {
    const header = document.querySelector('header')
    const row = header.querySelector(':scope > div')
    const toggle = header.querySelector('.theme-toggle')
    const toggleVisible = toggle ? getComputedStyle(toggle).display !== 'none' : false
    const rects = {}
    for (const [name, sel] of [
      ['menuOrNav', 'button[aria-label*="menu" i], nav'],
      ['logo', '.header-logo, span.text-\\[1\\.35rem\\]'],
      ['help', 'button[aria-label="How to play"]'],
      ['stats', 'button[aria-label="Statistics"]'],
      ['toggle', '.theme-toggle'],
    ]) {
      const el = header.querySelector(sel)
      rects[name] = el ? (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), right: Math.round(r.right), visible: getComputedStyle(el).display !== 'none' } })() : null
    }
    return {
      headerHeight: Math.round(header.getBoundingClientRect().height),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      toggleVisible,
      rects,
    }
  })
  console.log(`${w}px:`, JSON.stringify(info))
  await p.screenshot({ path: `${OUT}/83-toggle-header-${w}.png` })
  await c.close()
}

// 5. Dark header screenshot for visual check of dark track/thumb.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } }, { 'daily-worldle:v1:prefs': JSON.stringify({ theme: 'dark', hasSeenHelp: true }) })
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${OUT}/84-toggle-dark-header-full.png` })
  await c.close()
}

await b.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
