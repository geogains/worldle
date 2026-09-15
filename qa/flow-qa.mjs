// Second QA pass: rollover, archive replay, reduced motion, stats idempotency.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const errors = []
const seenHelp = { 'daily-worldle:v1:prefs': JSON.stringify({ theme: 'light', hasSeenHelp: true }) }

async function ctx(opts = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, ...opts })
  const p = await c.newPage()
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  await p.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v) }, seenHelp)
  return { c, p }
}
async function type(p, word) { for (const ch of word) await p.keyboard.press(ch) }
async function shot(p, name) { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name) }

// A. Rollover: start at 23:59:50 UTC on day 3, play a bit, cross midnight.
{
  const { c, p } = await ctx()
  await p.clock.install({ time: new Date('2026-09-17T23:59:50Z') })
  await p.goto(BASE + '/')
  await p.waitForTimeout(300)
  const label = await p.locator('main span.font-semibold').first().innerText()
  console.log('label before rollover:', label)
  await p.clock.runFor(15_000)
  await p.waitForTimeout(300)
  await shot(p, '40-rollover-banner')
  const banner = await p.locator('[role=status]').innerText().catch(() => '(none)')
  console.log('banner:', banner)
  await p.click('text=Play')
  await p.waitForTimeout(300)
  console.log('label after rollover:', await p.locator('main span.font-semibold').first().innerText())
  await c.close()
}

// B. Archive on day 5: list, replay #2 to completion, verify stats untouched.
{
  const { c, p } = await ctx()
  await p.clock.install({ time: new Date('2026-09-19T12:00:00Z') })
  await p.goto(BASE + '/archive')
  await p.waitForTimeout(300)
  await shot(p, '41-archive-list')
  await p.click('text=#2')
  await p.waitForTimeout(400)
  console.log('archive url:', p.url())
  // Answer for #2 is Slovakia (8)
  await type(p, 'SLOVAKIA')
  await p.keyboard.press('Enter')
  await p.clock.runFor(6000)
  await p.waitForTimeout(200)
  await shot(p, '42-archive-result')
  console.log('stats after archive win:', await p.evaluate(() => localStorage.getItem('daily-worldle:v1:stats')))
  console.log('archive store:', await p.evaluate(() => localStorage.getItem('daily-worldle:v1:archive')))
  await p.keyboard.press('Escape')
  await p.goto(BASE + '/archive')
  await p.waitForTimeout(300)
  await shot(p, '43-archive-list-after')
  // future puzzle blocked
  await p.goto(BASE + '/archive/5')
  await p.waitForTimeout(300)
  console.log('today via archive redirects to:', p.url())
  await p.goto(BASE + '/archive/9')
  await p.waitForTimeout(300)
  await shot(p, '44-archive-future')
  await c.close()
}

// C. Reduced motion full win, then reload to confirm stats are not re-applied.
{
  const { c, p } = await ctx({ reducedMotion: 'reduce' })
  await p.goto(BASE + '/')
  await p.waitForTimeout(300)
  await type(p, 'MALAYSIA'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200)
  await type(p, 'TANZANIA'); await p.keyboard.press('Enter'); await p.waitForTimeout(1800)
  await shot(p, '45-reduced-motion-win')
  const s1 = await p.evaluate(() => localStorage.getItem('daily-worldle:v1:stats'))
  await p.reload(); await p.waitForTimeout(500)
  await p.reload(); await p.waitForTimeout(500)
  const s2 = await p.evaluate(() => localStorage.getItem('daily-worldle:v1:stats'))
  console.log('stats stable across reloads:', s1 === s2, s2)
  await c.close()
}

// D. Practice: play again produces a different answer and doesn't touch daily.
{
  const { c, p } = await ctx()
  await p.goto(BASE + '/practice')
  await p.waitForTimeout(300)
  const a1 = await p.evaluate(() => JSON.parse(localStorage.getItem('daily-worldle:v1:practice')).answerId)
  await p.reload(); await p.waitForTimeout(300)
  const a1b = await p.evaluate(() => JSON.parse(localStorage.getItem('daily-worldle:v1:practice')).answerId)
  console.log('practice answer persists across reload:', a1 === a1b, a1)
  await c.close()
}

// E. Keyboard accessibility: Tab to a key and press Enter should type one letter, not submit.
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 800 }, hasTouch: false })
  await p.goto(BASE + '/')
  await p.waitForTimeout(300)
  await p.focus('[data-key="Q"]')
  await p.keyboard.press('Enter')
  await p.waitForTimeout(200)
  const cur = await p.evaluate(() => JSON.parse(localStorage.getItem('daily-worldle:v1:daily')).current)
  console.log('focused Q + Enter typed:', JSON.stringify(cur))
  await shot(p, '46-desktop-focus')
  await c.close()
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
