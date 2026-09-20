// Two-part polish pass:
//  1. /quiz/flags results screen now sits inside a rounded card (same glass
//     language as .quiz-play__card / .quiz-setup-card), centered, not
//     stretched to the full page height.
//  2. How to Play: bottom Daily/Practice/Archive section removed, example
//     tiles enlarged (still one row each, no wrap/overflow at 320-430px).
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []
const errors = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newPage(context, theme = 'light') {
  const p = await context.newPage()
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return p
}

async function noHorizontalOverflow(p, tag) {
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`${tag}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)
}

// A. Quiz results card.
async function runQuizResults(viewport, theme) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  const tag = `quiz-results ${theme} ${viewport.width}x${viewport.height}`
  await p.addInitScript(() => {
    localStorage.setItem('daily-worldle:v1:quizConfig', JSON.stringify({ mode: 'flags', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 }))
  })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)
  for (let i = 0; i < 5; i++) {
    const correctName = await p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')
    await p.locator('.quiz-answer', { hasText: correctName }).click()
    await p.waitForTimeout(900)
  }
  await p.waitForTimeout(200)
  const card = p.locator('.quiz-results')
  check(`${tag}: results card renders`, await card.isVisible())
  const info = await card.evaluate((el) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return { radius: parseFloat(cs.borderRadius), bg: cs.backgroundColor, shadow: cs.boxShadow, w: r.width, x: r.x, h: r.height }
  })
  check(`${tag}: rounded corners`, info.radius > 0, `${info.radius}px`)
  check(`${tag}: has a shadow (not none)`, info.shadow !== 'none')
  check(`${tag}: card is not stretched edge-to-edge (some horizontal margin)`, info.x > 0)
  const viewportH = viewport.height
  check(`${tag}: card is not forced to near-full viewport height`, info.h < viewportH * 0.85, `${info.h}px of ${viewportH}px`)
  // Everything (heading, score, percent, meta, actions) is inside the card.
  check(`${tag}: heading inside card`, await card.getByText('Flags Quiz Complete').isVisible())
  check(`${tag}: score inside card`, await card.getByText('5 / 5').isVisible())
  check(`${tag}: percent inside card`, await card.getByText('100%').isVisible())
  check(`${tag}: pool/style pills inside card`, await card.getByText('Easy').isVisible() && await card.getByText('Multiple Choice').isVisible())
  const playAgain = card.getByRole('button', { name: 'Play Again' })
  const changeQuiz = card.getByRole('button', { name: 'Change Quiz' })
  check(`${tag}: Play Again inside card, comfortably tappable`, await playAgain.isVisible() && (await playAgain.boundingBox()).height >= 40)
  check(`${tag}: Change Quiz inside card, comfortably tappable`, await changeQuiz.isVisible() && (await changeQuiz.boundingBox()).height >= 40)
  await noHorizontalOverflow(p, tag)
  await p.screenshot({ path: `${OUT}/quiz-results-card-${theme}-${viewport.width}x${viewport.height}.png` })
  await context.close()
}

// B. How to Play: bottom section removed, tiles enlarged, still one row.
async function runHelpModal(viewport, theme) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  const p = await newPage(context, theme)
  const tag = `help ${theme} ${viewport.width}x${viewport.height}`
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(250)
  await p.click('[aria-label="How to play"]')
  await p.waitForTimeout(350)
  const dialog = p.getByRole('dialog')
  check(`${tag}: bottom Daily/Practice/Archive text is gone`, (await dialog.getByText(/available every day/i).count()) === 0)
  check(`${tag}: no leftover divider/paragraph after examples`, await dialog.evaluate((el) => {
    const last = el.lastElementChild
    return last.tagName !== 'P'
  }))
  const rows = await dialog.locator('.help-tile-row[role="row"]').all()
  check(`${tag}: three example rows present`, rows.length === 3)
  let anyOverflow = false
  let anyWrap = false
  const tileSizes = []
  for (const row of rows) {
    const info = await row.evaluate((el) => {
      const tiles = [...el.querySelectorAll('.tile')]
      const tops = new Set(tiles.map((t) => Math.round(t.getBoundingClientRect().top)))
      return {
        count: tiles.length,
        oneLine: tops.size === 1,
        rowW: el.getBoundingClientRect().width,
        scrollW: el.scrollWidth,
        tileW: tiles[0].getBoundingClientRect().width,
      }
    })
    check(`${tag}: example row has all 9 tiles`, info.count === 9)
    if (!info.oneLine) anyWrap = true
    if (info.scrollW > info.rowW + 1) anyOverflow = true
    tileSizes.push(info.tileW)
  }
  check(`${tag}: no example row wraps onto two lines`, !anyWrap)
  check(`${tag}: no example row overflows its container`, !anyOverflow)
  // Baseline from the prior pass (mobile-only follow-up): 320->27.2px,
  // 375->28.1px, 390->29.3px, 430->32.3px, desktop(>=640)->44px unchanged.
  // Mobile widths must now be noticeably larger again; desktop must be
  // byte-identical to the old ceiling.
  const baselineByWidth = { 320: 27.2, 375: 28.1, 390: 29.3, 430: 32.3 }
  const requiredNoticeablyLargerWidths = [375, 390, 430]
  const baseline = baselineByWidth[viewport.width]
  const minTile = Math.min(...tileSizes)
  if (requiredNoticeablyLargerWidths.includes(viewport.width)) {
    check(`${tag}: mobile tiles are noticeably larger than the previous pass's baseline (${baseline}px)`, minTile > baseline * 1.15, `min tile ${minTile.toFixed(1)}px`)
  } else if (baseline) {
    // 320px isn't a required width for this pass — just guard against a regression.
    check(`${tag}: tile size at least matches the previous pass's baseline (${baseline}px)`, minTile >= baseline, `min tile ${minTile.toFixed(1)}px`)
  } else {
    check(`${tag}: desktop tile size unchanged (44px)`, Math.abs(minTile - 44) < 0.5, `${minTile.toFixed(1)}px`)
  }
  await noHorizontalOverflow(p, tag)
  await p.screenshot({ path: `${OUT}/help-modal-${theme}-${viewport.width}x${viewport.height}.png` })
  await context.close()
}

for (const theme of ['light', 'dark']) {
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await runQuizResults(viewport, theme)
  }
  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1280, height: 900 }]) {
    await runHelpModal(viewport, theme)
  }
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
