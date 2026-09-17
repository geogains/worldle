// Third QA pass: light-mode modal surfaces, white tile lettering, and the
// recomposed mode bar (Practice status/actions) across widths and themes.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const errors = []
const prefs = (theme) => ({ 'daily-worldle:v1:prefs': JSON.stringify({ theme, hasSeenHelp: true }) })
const practiceDone = {
  'daily-worldle:v1:practice': JSON.stringify({ answerId: 'tanzania', previousAnswerId: null, guesses: ['MALAYSIA', 'PORTUGAL', 'TANZANIA'], current: '', status: 'won', updatedAt: 1 }),
}
const practice10 = {
  'daily-worldle:v1:practice': JSON.stringify({ answerId: 'timor-leste', previousAnswerId: null, guesses: ['MADAGASCAR', 'AZERBAIJAN'], current: 'TIMOR', status: 'active', updatedAt: 1 }),
}
const statsSeed = {
  'daily-worldle:v1:stats': JSON.stringify({ played: 12, wins: 10, currentStreak: 4, maxStreak: 7, distribution: [0, 2, 4, 3, 1, 0], lastCompletedPuzzle: 1, lastWonPuzzle: 1, completedPuzzles: [1] }),
  'daily-worldle:v1:daily': JSON.stringify({ puzzleNumber: 1, guesses: ['MALAYSIA', 'PORTUGAL', 'TANZANIA'], current: '', status: 'won', updatedAt: 1 }),
}

async function ctx(storage, opts = {}) {
  const c = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, ...opts })
  const p = await c.newPage()
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  await p.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v) }, storage)
  return { c, p }
}
async function shot(p, name) { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name) }
async function overflow(p, tag) {
  const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  console.log(`${tag}: scrollWidth ${o.sw} clientWidth ${o.cw} ${o.sw > o.cw ? 'OVERFLOW!' : 'ok'}`)
}
async function barMetrics(p, tag) {
  const m = await p.evaluate(() => {
    const bar = document.querySelector('.mode-bar')
    const els = [...bar.querySelectorAll('.eyebrow, .mode-bar__status > span:not(.eyebrow), .btn')]
    const r = (el) => { const b = el.getBoundingClientRect(); return { text: el.textContent.trim().slice(0, 14), x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), clipped: el.scrollWidth > el.clientWidth + 1 } }
    const header = document.querySelector('header').getBoundingClientRect()
    const surface = document.querySelector('.game-surface').getBoundingClientRect()
    const bb = bar.getBoundingClientRect()
    return { gapBelowHeader: Math.round(bb.top - header.bottom), gapAboveSurface: Math.round(surface.top - bb.bottom), barHeight: Math.round(bb.height), items: els.map(r) }
  })
  console.log(`${tag} bar:`, JSON.stringify(m))
}

// 1. Light desktop: completed Practice game (bar with both actions), Results, Help, Stats.
{
  const { c, p } = await ctx({ ...prefs('light'), ...practiceDone, ...statsSeed })
  await p.goto(BASE + '/practice'); await p.waitForTimeout(500)
  await shot(p, '50-light-practice-complete-desktop')
  await barMetrics(p, 'desktop 1280 practice')
  await p.click('.mode-bar__actions >> text=Results'); await p.waitForTimeout(400)
  await shot(p, '51-light-results-desktop')
  const panel = await p.evaluate(() => { const el = document.querySelector('.modal-panel'); const cs = getComputedStyle(el); return { bg: cs.backgroundColor, blur: cs.backdropFilter, scrim: getComputedStyle(el.parentElement).backdropFilter } })
  console.log('light modal panel:', JSON.stringify(panel))
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await p.click('[aria-label="How to play"]'); await p.waitForTimeout(400)
  await shot(p, '52-light-help-desktop')
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await p.click('[aria-label="Statistics"]'); await p.waitForTimeout(400)
  await shot(p, '53-light-stats-desktop')
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  // tile + key computed colours
  const cols = await p.evaluate(() => {
    const pick = (sel) => { const el = document.querySelector(sel); const cs = getComputedStyle(el); return `${cs.backgroundColor} / ${cs.color}` }
    return { correct: pick('.tile--correct'), present: pick('.tile--present'), absent: pick('.tile--absent'), keyCorrect: pick('.key--correct'), keyAbsent: pick('.key--absent') }
  })
  console.log('light tile colours:', JSON.stringify(cols))
  await c.close()
}

// 2. Light mobile widths: Practice bar (complete) + Results modal + 10-col in-progress overflow.
for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]]) {
  const { c, p } = await ctx({ ...prefs('light'), ...practiceDone }, { viewport: { width: w, height: h }, hasTouch: true })
  await p.goto(BASE + '/practice'); await p.waitForTimeout(500)
  await overflow(p, `${w}x${h} practice complete`)
  await barMetrics(p, `${w}`)
  await shot(p, `54-light-practice-complete-${w}`)
  await p.click('.mode-bar__actions >> text=Results'); await p.waitForTimeout(400)
  await shot(p, `55-light-results-${w}`)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await c.close()
  const t = await ctx({ ...prefs('light'), ...practice10 }, { viewport: { width: w, height: h }, hasTouch: true })
  await t.p.goto(BASE + '/practice'); await t.p.waitForTimeout(500)
  await overflow(t.p, `${w}x${h} practice 10-col in progress`)
  await barMetrics(t.p, `${w} in-progress`)
  await shot(t.p, `56-light-practice-10col-${w}`)
  await t.c.close()
}

// 3. Light: help modal at 320 (tile examples) and daily bar.
{
  const { c, p } = await ctx({ ...prefs('light'), ...statsSeed }, { viewport: { width: 320, height: 568 }, hasTouch: true })
  await p.goto(BASE + '/'); await p.waitForTimeout(500)
  await shot(p, '57-light-daily-complete-320')
  await p.click('[aria-label="How to play"]'); await p.waitForTimeout(400)
  await shot(p, '58-light-help-320')
  await c.close()
}

// 4. Dark mode: practice complete, results, help, stats, 390 mobile.
{
  const { c, p } = await ctx({ ...prefs('dark'), ...practiceDone, ...statsSeed }, { colorScheme: 'dark' })
  await p.goto(BASE + '/practice'); await p.waitForTimeout(500)
  await shot(p, '60-dark-practice-complete-desktop')
  await p.click('.mode-bar__actions >> text=Results'); await p.waitForTimeout(400)
  await shot(p, '61-dark-results-desktop')
  const panel = await p.evaluate(() => { const el = document.querySelector('.modal-panel'); const cs = getComputedStyle(el); return { bg: cs.backgroundColor, blur: cs.backdropFilter } })
  console.log('dark modal panel:', JSON.stringify(panel))
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await p.click('[aria-label="How to play"]'); await p.waitForTimeout(400)
  await shot(p, '62-dark-help-desktop')
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await p.click('[aria-label="Statistics"]'); await p.waitForTimeout(400)
  await shot(p, '63-dark-stats-desktop')
  await c.close()
  const m = await ctx({ ...prefs('dark'), ...practiceDone }, { colorScheme: 'dark', viewport: { width: 390, height: 844 }, hasTouch: true })
  await m.p.goto(BASE + '/practice'); await m.p.waitForTimeout(500)
  await shot(m.p, '64-dark-practice-complete-390')
  await m.p.click('.mode-bar__actions >> text=Results'); await m.p.waitForTimeout(400)
  await shot(m.p, '65-dark-results-390')
  await m.c.close()
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
