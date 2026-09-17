// Header logo QA: verifies the wordmark image renders crisply, doesn't
// overflow or collide with nav/actions at key widths, and that dark mode
// correctly falls back to the text wordmark (logo ink is unreadable there).
import { chromium } from 'playwright'
const OUT = new URL('./screenshots', import.meta.url).pathname
const b = await chromium.launch()
const errors = []

async function ctx(opts = {}) {
  const c = await b.newContext({ deviceScaleFactor: 2, ...opts })
  const p = await c.newPage()
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  return { c, p }
}

for (const [w, h] of [[320, 200], [375, 200], [390, 200], [430, 200], [768, 200], [1280, 200]]) {
  const { c, p } = await ctx({ viewport: { width: w, height: h } })
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  const info = await p.evaluate(() => {
    const header = document.querySelector('header')
    const row = header.querySelector(':scope > div')
    const img = header.querySelector('.header-logo__img')
    const leftBtns = [...row.children[0].querySelectorAll('button')].filter(b => b.offsetParent !== null)
    const rightBtns = [...row.children[2].querySelectorAll('button')].filter(b => b.offsetParent !== null)
    const leftEdge = leftBtns.length ? Math.max(...leftBtns.map(b => b.getBoundingClientRect().right)) : 0
    const rightEdge = rightBtns.length ? Math.min(...rightBtns.map(b => b.getBoundingClientRect().left)) : 0
    const wrapper = header.querySelector('.header-logo')
    const wrapRect = wrapper ? wrapper.getBoundingClientRect() : null
    return {
      headerHeight: Math.round(header.getBoundingClientRect().height),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      wrapperRect: wrapRect && { x: Math.round(wrapRect.x), w: Math.round(wrapRect.width), h: Math.round(wrapRect.height) },
      imgNatural: img && { w: img.naturalWidth, h: img.naturalHeight },
      imgRenderedH: img && Math.round(img.getBoundingClientRect().height),
      leftEdge: Math.round(leftEdge), rightEdge: Math.round(rightEdge),
      clearLeft: wrapRect ? Math.round(wrapRect.left - leftEdge) : null,
      clearRight: wrapRect ? Math.round(rightEdge - wrapRect.right) : null,
    }
  })
  console.log(`${w}px:`, JSON.stringify(info))
  await p.screenshot({ path: `${OUT}/70-logo-light-${w}.png` })
  await c.close()
}

// Dark mode: confirm text fallback renders (no logo img), no regressions.
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 200 }, colorScheme: 'dark' })
  await p.addInitScript(() => localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: 'dark', hasSeenHelp: true })))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  const hasImg = await p.evaluate(() => !!document.querySelector('.header-logo__img'))
  console.log('dark mode has logo img (should be false):', hasImg)
  await p.screenshot({ path: `${OUT}/71-logo-dark-390.png` })
  await c.close()
}
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 }, colorScheme: 'dark' })
  await p.addInitScript(() => localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: 'dark', hasSeenHelp: true })))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.screenshot({ path: `${OUT}/72-logo-dark-1280.png` })
  await c.close()
}

// Accessible name check.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } })
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  const name = await p.evaluate(() => document.querySelector('header button[aria-label*="home"]').getAttribute('aria-label'))
  console.log('home button accessible name:', name)
  const imgAlt = await p.evaluate(() => document.querySelector('.header-logo__img')?.getAttribute('alt'))
  console.log('img alt:', imgAlt)
  await c.close()
}

await b.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
