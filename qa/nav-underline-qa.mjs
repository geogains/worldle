// Nav underline QA: measures the shared underline element against each
// active nav link, confirms it tracks route changes, animates smoothly,
// has no pill remnants, and works across themes/widths/reduced-motion.
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

function navState(p) {
  return p.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Game modes"]')
    const links = [...nav.querySelectorAll('.nav-link')].map((el) => {
      const cs = getComputedStyle(el)
      return {
        label: el.textContent,
        current: el.getAttribute('aria-current'),
        color: cs.color,
        fontWeight: cs.fontWeight,
        bg: cs.backgroundColor,
        borderRadius: cs.borderRadius,
        rect: { x: Math.round(el.getBoundingClientRect().x), w: Math.round(el.getBoundingClientRect().width) },
      }
    })
    const underline = nav.querySelector('.nav-underline')
    const ur = underline ? underline.getBoundingClientRect() : null
    const us = underline ? getComputedStyle(underline) : null
    return {
      links,
      underline: ur && { x: Math.round(ur.x), w: Math.round(ur.width), h: Math.round(ur.height) },
      underlineColor: us?.backgroundColor,
      underlineTransition: us?.transitionDuration,
    }
  })
}

// 1. Initial load on Daily (light desktop) — check pill fully gone, underline aligned.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(300)
  console.log('daily light desktop:', JSON.stringify(await navState(p)))
  await p.screenshot({ path: `${OUT}/A0-nav-daily-light.png`, clip: { x: 200, y: 0, width: 500, height: 56 } })
  await c.close()
}

// 2. Click Practice, then Archive, then back to Daily — check underline follows, mid-transition frame.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(300)
  await p.click('nav >> text=Practice')
  await p.waitForTimeout(80) // mid-animation
  await p.screenshot({ path: `${OUT}/A1-nav-mid-transition-daily-to-practice.png`, clip: { x: 200, y: 0, width: 500, height: 56 } })
  await p.waitForTimeout(400)
  console.log('after -> practice (settled):', JSON.stringify(await navState(p)))
  await p.screenshot({ path: `${OUT}/A2-nav-practice-settled.png`, clip: { x: 200, y: 0, width: 500, height: 56 } })

  await p.click('nav >> text=Archive')
  await p.waitForTimeout(400)
  console.log('after -> archive (settled):', JSON.stringify(await navState(p)))
  await p.screenshot({ path: `${OUT}/A3-nav-archive-settled.png`, clip: { x: 200, y: 0, width: 500, height: 56 } })

  await p.click('nav >> text=Daily')
  await p.waitForTimeout(400)
  console.log('after -> daily again (settled):', JSON.stringify(await navState(p)))
  await c.close()
}

// 3. Direct load of /practice and /archive — underline should be correct immediately, no snap-from-zero visible.
for (const path of ['/practice', '/archive']) {
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } }, seed('light'))
  await p.goto(`http://localhost:4173${path}`)
  await p.waitForTimeout(60) // very soon after load
  console.log(`direct load ${path} (early):`, JSON.stringify(await navState(p)))
  await c.close()
}

// 4. Browser back/forward.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(200)
  await p.click('nav >> text=Practice')
  await p.waitForTimeout(200)
  await p.click('nav >> text=Archive')
  await p.waitForTimeout(200)
  await p.goBack()
  await p.waitForTimeout(300)
  console.log('after goBack (expect Practice active):', JSON.stringify((await navState(p)).links.map(l => [l.label, l.current])))
  await p.goBack()
  await p.waitForTimeout(300)
  console.log('after goBack again (expect Daily active):', JSON.stringify((await navState(p)).links.map(l => [l.label, l.current])))
  await p.goForward()
  await p.waitForTimeout(300)
  console.log('after goForward (expect Practice active):', JSON.stringify((await navState(p)).links.map(l => [l.label, l.current])))
  await c.close()
}

// 5. Dark mode.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 }, colorScheme: 'dark' }, seed('dark'))
  await p.goto('http://localhost:4173/practice')
  await p.waitForTimeout(300)
  console.log('dark mode practice:', JSON.stringify(await navState(p)))
  await p.screenshot({ path: `${OUT}/A4-nav-dark-practice.png`, clip: { x: 200, y: 0, width: 500, height: 56 } })
  await c.close()
}

// 6. Reduced motion.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 }, reducedMotion: 'reduce' }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(200)
  console.log('reduced motion transition-duration:', (await navState(p)).underlineTransition)
  await c.close()
}

// 7. Keyboard focus visible, distinct from underline.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 200 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(200)
  await p.keyboard.press('Tab') // menu button (hidden on desktop, but focusable? it's sm:hidden so not focusable/visible)
  // focus directly on the Practice link
  await p.focus('nav >> text=Practice')
  await p.waitForTimeout(150)
  const outline = await p.evaluate(() => getComputedStyle(document.activeElement).outlineColor + ' ' + getComputedStyle(document.activeElement).outlineWidth)
  console.log('focused Practice outline:', outline)
  await p.screenshot({ path: `${OUT}/A5-nav-keyboard-focus.png`, clip: { x: 200, y: 0, width: 500, height: 56 } })
  await c.close()
}

// 8. Widths: 320, 390, desktop — confirm no overflow, hamburger/menu still fine, logo centered.
for (const w of [320, 390, 1280]) {
  const { c, p } = await ctx({ viewport: { width: w, height: 200 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  const overflow = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  console.log(`${w}px overflow:`, JSON.stringify(overflow))
  await p.screenshot({ path: `${OUT}/A6-nav-width-${w}.png`, clip: { x: 0, y: 0, width: w, height: 56 } })
  await c.close()
}

await b.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
