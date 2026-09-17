// Logo theme-swap QA: light->/Worldle.png, dark->/Worldle-white.png,
// immediate switch update, correct-on-refresh-in-dark, no layout shift,
// header fit at 320 and desktop.
import { chromium } from 'playwright'
const OUT = new URL('./screenshots', import.meta.url).pathname
const b = await chromium.launch()
const errors = []
const seed = (theme) => ({ 'daily-worldle:v1:prefs': JSON.stringify({ theme, hasSeenHelp: true }) })

async function ctx(opts = {}, storage) {
  const c = await b.newContext({ deviceScaleFactor: 2, ...opts })
  const p = await c.newPage()
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  if (storage) await p.addInitScript((s) => { for (const [k, v] of Object.entries(s)) if (!localStorage.getItem(k)) localStorage.setItem(k, v) }, storage)
  return { c, p }
}

function logoInfo(p) {
  return p.evaluate(() => {
    const img = document.querySelector('.header-logo__img')
    const wrap = document.querySelector('.header-logo')
    const r = wrap.getBoundingClientRect()
    return {
      src: img.getAttribute('src'),
      naturalComplete: img.complete && img.naturalWidth > 0,
      wrapperRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      theme: document.documentElement.getAttribute('data-theme'),
    }
  })
}

// 1. Light mode default -> /Worldle.png
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(300)
  console.log('light mode:', JSON.stringify(await logoInfo(p)))
  await p.screenshot({ path: `${OUT}/95-logo-theme-light-1280.png` })
  await c.close()
}

// 2. Refresh directly into dark mode -> should show white logo immediately, no flash.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } }, seed('dark'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(50) // check very soon after load, not settled
  const early = await logoInfo(p)
  await p.waitForTimeout(300)
  const settled = await logoInfo(p)
  console.log('dark mode refresh (early ~50ms):', JSON.stringify(early))
  console.log('dark mode refresh (settled):', JSON.stringify(settled))
  await p.screenshot({ path: `${OUT}/96-logo-theme-dark-1280.png` })
  await c.close()
}

// 3. Live toggle: click theme switch, confirm src swaps and wrapper rect unchanged (no layout shift).
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(300)
  const before = await logoInfo(p)
  await p.click('.theme-toggle')
  await p.waitForTimeout(450)
  const after = await logoInfo(p)
  console.log('before toggle:', JSON.stringify(before))
  console.log('after toggle:', JSON.stringify(after))
  console.log('wrapper rect unchanged:', JSON.stringify(before.wrapperRect) === JSON.stringify(after.wrapperRect))
  // toggle back
  await p.click('.theme-toggle')
  await p.waitForTimeout(450)
  const back = await logoInfo(p)
  console.log('toggled back:', JSON.stringify(back))
  await c.close()
}

// 4. 320px mobile, both themes — header fit.
for (const theme of ['light', 'dark']) {
  const { c, p } = await ctx({ viewport: { width: 320, height: 200 } }, seed(theme))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(300)
  const info = await logoInfo(p)
  const overflow = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  console.log(`320px ${theme}:`, JSON.stringify(info), JSON.stringify(overflow))
  await p.screenshot({ path: `${OUT}/97-logo-theme-320-${theme}.png` })
  await c.close()
}

await b.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
