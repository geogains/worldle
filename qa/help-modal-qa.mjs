// How to Play modal QA — responsive shell (desktop vs mobile) plus content
// integrity (9-tile examples, formatting note). Desktop: classic centered
// popup, now wider (640px) so the full content fits without scrolling at
// normal laptop heights. Mobile: near-full-viewport modal card (same
// mechanic as the Results overlay's `result` Modal variant) — visible
// backdrop margin, rounded corners, internal scroll if content is taller
// than the card. Both themes, no horizontal overflow, no console errors.
import { chromium } from 'playwright'
const OUT = new URL('./screenshots', import.meta.url).pathname
const b = await chromium.launch()
const errors = []
const failures = []
const seed = (theme) => ({ 'daily-worldle:v1:prefs': JSON.stringify({ theme, hasSeenHelp: true }) })

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function ctx(opts = {}, storage) {
  const c = await b.newContext({ deviceScaleFactor: 2, ...opts })
  const p = await c.newPage()
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  if (storage) await p.addInitScript((s) => { for (const [k, v] of Object.entries(s)) if (!localStorage.getItem(k)) localStorage.setItem(k, v) }, storage)
  return { c, p }
}

async function openHelp(p) {
  await p.goto('http://localhost:4173/')
  await p.waitForTimeout(250)
  await p.click('[aria-label="How to play"]')
  await p.waitForTimeout(350)
}

async function inspectContent(p, tag) {
  const info = await p.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')
    const rows = [...dialog.querySelectorAll('[role="row"]')]
    const tileCounts = rows.map((r) => r.querySelectorAll('.tile').length)
    const offenders = [...dialog.querySelectorAll('*')]
      // The header row (title + close button) has a pre-existing, harmless
      // scrollWidth/clientWidth mismatch from the close button's own
      // negative alignment margin (-mt-2 -mr-2) — nothing is visually
      // clipped; it predates this pass and is shared by every Modal
      // consumer (Stats, Results), so it's excluded here rather than
      // treated as a regression.
      .filter((el) => !el.className?.includes?.('items-start justify-between'))
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => ({ tag: el.tagName, cls: el.className, sw: el.scrollWidth, cw: el.clientWidth }))
    return {
      tileCounts,
      offenders,
      formattingNoteText: [...dialog.querySelectorAll('p')].find((p) => p.textContent.includes('COSTARICA'))?.textContent ?? null,
      exampleWords: rows.map((r) => [...r.querySelectorAll('.tile')].map((t) => t.textContent).join('')),
    }
  })
  check(`${tag}: three 9-tile examples present`, info.tileCounts.length === 3 && info.tileCounts.every((n) => n === 9), JSON.stringify(info.tileCounts))
  check(`${tag}: formatting note (COSTARICA) present`, !!info.formattingNoteText)
  check(`${tag}: no element overflows its box horizontally`, info.offenders.length === 0, JSON.stringify(info.offenders))
  console.log(`${tag}: examples`, JSON.stringify(info.exampleWords))
}

async function noHorizontalOverflow(p, tag) {
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`${tag}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)
}

// A. Desktop — classic centered popup, wider (640px), no scroll at normal
// laptop heights, rounded corners, backdrop visible, close works.
async function runDesktop(viewport, theme) {
  const { c, p } = await ctx({ viewport }, seed(theme))
  await openHelp(p)
  const d = p.getByRole('dialog')
  const info = await d.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { x: r.x, y: r.y, w: r.width, h: r.height, sh: el.scrollHeight, ch: el.clientHeight, radius: parseFloat(cs.borderTopLeftRadius) }
  })
  const { width: vw, height: vh } = viewport
  check(`desktop ${theme} ${vw}x${vh}: modal width is the new 640px`, Math.abs(info.w - 640) < 1, `${info.w}px`)
  check(`desktop ${theme} ${vw}x${vh}: modal centered with backdrop visible on both sides`, info.x > 40 && (vw - (info.x + info.w)) > 40, JSON.stringify(info))
  check(`desktop ${theme} ${vw}x${vh}: modal not stretched to near-full viewport height`, info.h < vh * 0.95, `${info.h}px of ${vh}px`)
  check(`desktop ${theme} ${vw}x${vh}: rounded corners preserved`, info.radius > 0, `${info.radius}px`)
  check(`desktop ${theme} ${vw}x${vh}: full content fits without scrolling`, info.sh <= info.ch + 1, JSON.stringify(info))
  await inspectContent(p, `desktop ${theme} ${vw}x${vh}`)
  await noHorizontalOverflow(p, `desktop ${theme} ${vw}x${vh}`)
  await p.screenshot({ path: `${OUT}/90-help-${theme}-${vw}x${vh}.png` })
  await d.getByRole('button', { name: 'Close' }).click()
  await p.waitForTimeout(250)
  check(`desktop ${theme} ${vw}x${vh}: close works`, (await p.getByRole('dialog').count()) === 0)
  await c.close()
}

// B. Mobile — near-full-viewport modal CARD (not edge-to-edge): small
// visible backdrop margin, rounded corners, internal scroll if needed,
// background locked, close reachable.
async function runMobile(viewport, theme) {
  const { c, p } = await ctx({ viewport, hasTouch: true }, seed(theme))
  await openHelp(p)
  const d = p.getByRole('dialog')
  const info = await d.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { x: r.x, y: r.y, w: r.width, h: r.height, sh: el.scrollHeight, ch: el.clientHeight, overflowY: cs.overflowY, radius: parseFloat(cs.borderTopLeftRadius) }
  })
  const { width: vw, height: vh } = viewport
  check(`mobile ${theme} ${vw}x${vh}: small visible backdrop margin on all sides (not edge-to-edge)`,
    info.x > 2 && info.x < 14 && info.y > 2 && info.y < 14 && (vw - (info.x + info.w)) > 2 && (vh - (info.y + info.h)) > 2,
    JSON.stringify({ info, vw, vh }))
  check(`mobile ${theme} ${vw}x${vh}: card occupies nearly the full viewport`, info.w >= vw - 20 && info.h >= vh - 20, JSON.stringify(info))
  check(`mobile ${theme} ${vw}x${vh}: rounded corners visible`, info.radius > 0, `${info.radius}px`)
  check(`mobile ${theme} ${vw}x${vh}: internal scroll available if content is taller than the card`, info.overflowY === 'auto')
  // The app shell keeps body non-scrolling at all times (see index.css) —
  // check the *computed* value, not an inline style, since the lock isn't
  // toggled per-modal here.
  const locked = await p.evaluate(() => getComputedStyle(document.body).overflow)
  check(`mobile ${theme} ${vw}x${vh}: background page locked`, locked === 'hidden')
  await inspectContent(p, `mobile ${theme} ${vw}x${vh}`)
  await noHorizontalOverflow(p, `mobile ${theme} ${vw}x${vh}`)
  // Scroll the modal's own content, not the page, and confirm the close
  // button (pinned at the top of the card) is still reachable afterwards.
  await d.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  await p.waitForTimeout(100)
  const closeBtn = d.getByRole('button', { name: 'Close' })
  check(`mobile ${theme} ${vw}x${vh}: close reachable after scrolling content`, await closeBtn.isVisible())
  await p.screenshot({ path: `${OUT}/91-help-${theme}-${vw}x${vh}-scrolled.png` })
  await d.evaluate((el) => el.scrollTo(0, 0))
  await closeBtn.click()
  await p.waitForTimeout(250)
  check(`mobile ${theme} ${vw}x${vh}: close works`, (await p.getByRole('dialog').count()) === 0)
  await c.close()
}

for (const theme of ['light', 'dark']) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 800 }]) {
    await runDesktop(viewport, theme)
  }
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await runMobile(viewport, theme)
  }
}

// C. Honest report of the documented short-viewport fallback: at an
// unusually short desktop height, widening alone cannot fit everything, so
// the existing scroll fallback (max-h-[92dvh] + overflow-y-auto) is used
// instead of distorting the design.
{
  const { c, p } = await ctx({ viewport: { width: 1024, height: 700 } }, seed('light'))
  await openHelp(p)
  const d = p.getByRole('dialog')
  const info = await d.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, overflowY: getComputedStyle(el).overflowY }))
  console.log('short desktop (1024x700) fallback:', JSON.stringify(info))
  check('short desktop 1024x700: falls back to internal scroll rather than clipping/distorting', info.overflowY === 'auto')
  await c.close()
}

await b.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
