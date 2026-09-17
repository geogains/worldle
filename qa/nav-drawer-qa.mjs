// Navigation drawer QA: full-screen mobile drawer, partial-width desktop
// drawer + backdrop, scroll lock, focus trap/restoration, Escape, active
// route treatment, animation, reduced motion, browser back/forward.
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

function drawerInfo(p) {
  return p.evaluate(() => {
    const drawer = document.getElementById('navigation-drawer')
    const backdrop = document.querySelector('.nav-drawer-backdrop')
    const dr = drawer ? drawer.getBoundingClientRect() : null
    return {
      exists: !!drawer,
      rect: dr && { x: Math.round(dr.x), y: Math.round(dr.y), w: Math.round(dr.width), h: Math.round(dr.height) },
      bodyOverflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow,
      backdropBg: backdrop ? getComputedStyle(backdrop).backgroundColor : null,
      backdropBlur: backdrop ? getComputedStyle(backdrop).backdropFilter : null,
      activeItem: drawer ? [...drawer.querySelectorAll('.nav-drawer__item')].find((el) => el.getAttribute('aria-current') === 'page')?.textContent : null,
      focused: document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName,
    }
  })
}

// 1. Mobile full-viewport coverage at each required width.
for (const w of [320, 375, 390, 430]) {
  const { c, p } = await ctx({ viewport: { width: w, height: 700 } }, seed('light'))
  await p.goto('http://localhost:4173/practice')
  await p.waitForTimeout(250)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(400)
  const info = await drawerInfo(p)
  const overflow = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  console.log(`${w}px mobile drawer:`, JSON.stringify(info), JSON.stringify(overflow))
  await p.screenshot({ path: `${OUT}/B0-drawer-mobile-${w}.png` })
  await c.close()
}

// 2. Scroll lock: try to scroll the archive list behind the drawer.
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 700 } }, seed('light'))
  await p.goto('http://localhost:4173/archive')
  await p.waitForTimeout(250)
  const before = await p.evaluate(() => document.querySelector('main')?.scrollTop ?? 0)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(400)
  await p.mouse.wheel(0, 400) // attempt to wheel-scroll whatever is under the cursor
  await p.waitForTimeout(150)
  const afterWheel = await p.evaluate(() => document.querySelector('main')?.scrollTop ?? 0)
  console.log('scroll-lock: main.scrollTop before/after wheel while drawer open:', before, afterWheel)
  console.log('html/body overflow while open:', JSON.stringify(await drawerInfo(p)).match(/"(html|body)Overflow":"[a-z]+"/g))
  await p.keyboard.press('Escape')
  await p.waitForTimeout(400)
  const afterClose = await drawerInfo(p)
  console.log('overflow restored after close:', afterClose.bodyOverflow, afterClose.htmlOverflow, 'drawer exists:', afterClose.exists)
  await c.close()
}

// 3. Drawer's own content independently scrollable (sanity: content area overflow-y auto).
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 700 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(400)
  const style = await p.evaluate(() => {
    const content = document.querySelector('.nav-drawer__content')
    const cs = getComputedStyle(content)
    return { overflowY: cs.overflowY, overscroll: cs.overscrollBehaviorY || cs.overscrollBehavior }
  })
  console.log('drawer content scroll style:', JSON.stringify(style))
  await c.close()
}

// 4. Close button, Escape, focus trap, focus restoration.
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 700 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(400)
  const focusedOnOpen = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  console.log('focus on open (expect Close menu):', focusedOnOpen)
  // Tab through all focusables and confirm it cycles back without escaping the drawer.
  const tabSequence = []
  for (let i = 0; i < 6; i++) {
    await p.keyboard.press('Tab')
    tabSequence.push(await p.evaluate(() => document.activeElement?.closest('#navigation-drawer') ? 'in-drawer' : 'OUTSIDE'))
  }
  console.log('tab sequence stays in drawer:', JSON.stringify(tabSequence))
  await p.keyboard.press('Escape')
  await p.waitForTimeout(400)
  const focusedAfterEscape = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  console.log('focus restored to trigger after Escape (expect Open menu):', focusedAfterEscape)
  await c.close()
}

// 5. Close button click, and backdrop click-to-close (simulated at desktop width where reachable).
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 700 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(400)
  await p.click('#navigation-drawer [aria-label="Close menu"]')
  await p.waitForTimeout(500)
  console.log('drawer gone after X click:', !(await drawerInfo(p)).exists)
  await c.close()
}

// 6. Navigation closes the drawer and routes correctly; back/forward still works.
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 700 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(400)
  await p.click('#navigation-drawer >> text=Practice')
  await p.waitForTimeout(500)
  console.log('url after selecting Practice:', p.url(), 'drawer gone:', !(await drawerInfo(p)).exists)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(400)
  await p.click('#navigation-drawer >> text=Archive')
  await p.waitForTimeout(500)
  console.log('url after selecting Archive:', p.url())
  await p.goBack()
  await p.waitForTimeout(300)
  console.log('url after goBack:', p.url())
  await c.close()
}

// 7. Desktop: resize an already-open drawer up to a desktop width and inspect
// partial-width + backdrop (the hamburger trigger itself stays mobile-only,
// matching the existing header design, so this exercises the same component
// at desktop dimensions the way a tablet rotation or window resize would).
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 800 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(400)
  await p.setViewportSize({ width: 1280, height: 800 })
  await p.waitForTimeout(150)
  const info = await drawerInfo(p)
  console.log('desktop-width drawer (resized while open):', JSON.stringify(info))
  await p.screenshot({ path: `${OUT}/B1-drawer-desktop-light.png` })
  // backdrop click closes
  await p.mouse.click(1000, 400)
  await p.waitForTimeout(500)
  console.log('backdrop click closed drawer:', !(await drawerInfo(p)).exists)
  await c.close()
}

// 8. Dark mode: mobile + desktop-resized.
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' }, seed('dark'))
  await p.goto('http://localhost:4173/practice')
  await p.waitForTimeout(250)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(400)
  await p.screenshot({ path: `${OUT}/B2-drawer-mobile-dark.png` })
  await p.setViewportSize({ width: 1280, height: 800 })
  await p.waitForTimeout(150)
  await p.screenshot({ path: `${OUT}/B3-drawer-desktop-dark.png` })
  await c.close()
}

// 9. Theme toggle inside drawer updates immediately.
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 800 } }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(400)
  const before = await p.evaluate(() => document.documentElement.getAttribute('data-theme'))
  await p.click('#navigation-drawer .theme-toggle')
  await p.waitForTimeout(400)
  const after = await p.evaluate(() => document.documentElement.getAttribute('data-theme'))
  const logoSrc = await p.evaluate(() => document.querySelector('.nav-drawer__logo-img')?.getAttribute('src'))
  console.log('theme before/after toggling inside drawer:', before, after, 'drawer logo src now:', logoSrc)
  await c.close()
}

// 10. Reduced motion: drawer still opens/closes and is usable.
{
  const { c, p } = await ctx({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' }, seed('light'))
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(100)
  const info = await drawerInfo(p)
  console.log('reduced motion drawer open shortly after click:', JSON.stringify(info.rect))
  await p.click('#navigation-drawer >> text=Practice')
  await p.waitForTimeout(150)
  console.log('reduced motion: url after nav:', p.url(), 'drawer gone:', !(await drawerInfo(p)).exists)
  await c.close()
}

await b.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
