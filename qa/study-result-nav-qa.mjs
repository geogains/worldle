// Study result-page Previous/Next country navigation + the mobile
// card-height expansion, both added in the same pass.
//  - Previous/Next resolve to real /results/:slug routes (Study's own
//    alphabetical COUNTRIES order), loop continuously at both ends, push
//    real browser history (not in-place content swaps), update all page
//    content/title/CTAs, and expose destination-country accessible labels.
//  - The standalone result card now nearly fills the mobile viewport
//    (min-height calc), while desktop stays naturally sized.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
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

// A. Sequence, looping, and real route navigation with browser history.
async function runNavSequence(viewport, theme) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  const tag = `${theme} ${viewport.width}x${viewport.height}`

  await p.goto(`${BASE}/results/algeria`)
  await p.waitForTimeout(300)
  const card = () => p.locator('.country-result')
  check(`${tag}: Algeria — Previous labelled with Albania`, await card().getByRole('button', { name: 'Previous country: Albania' }).isVisible())
  check(`${tag}: Algeria — Next labelled with Andorra`, await card().getByRole('button', { name: 'Next country: Andorra' }).isVisible())

  const lengthBefore = await p.evaluate(() => window.history.length)
  await card().getByRole('button', { name: 'Next country: Andorra' }).click()
  await p.waitForTimeout(250)
  check(`${tag}: Next navigates the real URL to /results/andorra`, p.url().endsWith('/results/andorra'))
  check(`${tag}: Andorra content rendered (heading + flag)`, await p.getByRole('heading', { name: 'Andorra' }).isVisible())
  check(`${tag}: Andorra — Quiz CTA is gone (removed from Study results)`, (await card().getByRole('button', { name: /^quiz$/i }).count()) === 0)
  check(`${tag}: Andorra — Back to Study CTA still present`, await card().getByRole('button', { name: /^back to study$/i }).isVisible())
  check(`${tag}: Andorra — Previous labelled with Algeria`, await card().getByRole('button', { name: 'Previous country: Algeria' }).isVisible())
  check(`${tag}: Andorra — Next labelled with Angola`, await card().getByRole('button', { name: 'Next country: Angola' }).isVisible())

  await card().getByRole('button', { name: 'Next country: Angola' }).click()
  await p.waitForTimeout(250)
  check(`${tag}: Next navigates the real URL to /results/angola`, p.url().endsWith('/results/angola'))

  const lengthAfter = await p.evaluate(() => window.history.length)
  check(`${tag}: two forward navigations pushed two real history entries`, lengthAfter === lengthBefore + 2, `${lengthBefore} -> ${lengthAfter}`)

  // Reverse sequence with Previous.
  await card().getByRole('button', { name: 'Previous country: Andorra' }).click()
  await p.waitForTimeout(250)
  check(`${tag}: Previous navigates back to /results/andorra`, p.url().endsWith('/results/andorra'))
  await card().getByRole('button', { name: 'Previous country: Algeria' }).click()
  await p.waitForTimeout(250)
  check(`${tag}: Previous navigates back to /results/algeria`, p.url().endsWith('/results/algeria'))

  // Ordinary browser Back walks intermediate history, doesn't jump straight home.
  await card().getByRole('button', { name: 'Next country: Andorra' }).click()
  await p.waitForTimeout(250)
  await p.goBack()
  await p.waitForTimeout(250)
  check(`${tag}: browser Back returns to /results/algeria (not further)`, p.url().endsWith('/results/algeria'))

  // Looping boundaries.
  await p.goto(`${BASE}/results/afghanistan`)
  await p.waitForTimeout(300)
  check(`${tag}: first country (Afghanistan) Previous loops to the last (Zimbabwe)`, await card().getByRole('button', { name: 'Previous country: Zimbabwe' }).isVisible())
  check(`${tag}: first country (Afghanistan) Next goes to the second (Albania)`, await card().getByRole('button', { name: 'Next country: Albania' }).isVisible())
  await card().getByRole('button', { name: 'Previous country: Zimbabwe' }).click()
  await p.waitForTimeout(250)
  check(`${tag}: looped Previous navigates the real URL to /results/zimbabwe`, p.url().endsWith('/results/zimbabwe'))
  check(`${tag}: last country (Zimbabwe) Next loops to the first (Afghanistan)`, await card().getByRole('button', { name: 'Next country: Afghanistan' }).isVisible())
  check(`${tag}: last country (Zimbabwe) Previous goes to the penultimate (Zambia)`, await card().getByRole('button', { name: 'Previous country: Zambia' }).isVisible())
  await card().getByRole('button', { name: 'Next country: Afghanistan' }).click()
  await p.waitForTimeout(250)
  check(`${tag}: looped Next navigates the real URL to /results/afghanistan`, p.url().endsWith('/results/afghanistan'))

  await noHorizontalOverflow(p, tag)
  await context.close()
}

// B. Layout: arrows symmetrical, comfortable touch targets, no overlap.
async function runNavLayout(viewport, theme) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 700 })
  const p = await newPage(context, theme)
  const tag = `${theme} ${viewport.width}x${viewport.height}`
  await p.goto(`${BASE}/results/algeria`)
  await p.waitForTimeout(300)
  const info = await p.evaluate(() => {
    const row = document.querySelector('.country-result__nav-row')
    const [prevBtn, nextBtn] = row.querySelectorAll('button')
    const flag = row.querySelector('img, .country-result__flag-placeholder')
    const rowRect = row.getBoundingClientRect()
    const prevRect = prevBtn.getBoundingClientRect()
    const nextRect = nextBtn.getBoundingClientRect()
    const flagRect = flag.getBoundingClientRect()
    return {
      prevW: prevRect.width, prevH: prevRect.height, nextW: nextRect.width, nextH: nextRect.height,
      leftGapFromEdge: prevRect.left - rowRect.left, rightGapFromEdge: rowRect.right - nextRect.right,
      flagCenterOffsetFromRow: Math.abs((flagRect.left + flagRect.right) / 2 - (rowRect.left + rowRect.right) / 2),
      prevOverlapsFlag: prevRect.right > flagRect.left,
      nextOverlapsFlag: nextRect.left < flagRect.right,
    }
  })
  check(`${tag}: Previous/Next are comfortable touch targets (>=40px)`, info.prevW >= 40 && info.prevH >= 40 && info.nextW >= 40 && info.nextH >= 40, JSON.stringify(info))
  check(`${tag}: arrows placed symmetrically (equal distance from row edges)`, Math.abs(info.leftGapFromEdge - info.rightGapFromEdge) < 1, JSON.stringify(info))
  check(`${tag}: flag stays centered in the nav row`, info.flagCenterOffsetFromRow < 2, JSON.stringify(info))
  check(`${tag}: no arrow/flag overlap`, !info.prevOverlapsFlag && !info.nextOverlapsFlag)
  await context.close()
}

// C. Keyboard accessibility: focus reaches both arrows, visible focus ring.
async function runNavA11y(theme) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await newPage(context, theme)
  await p.goto(`${BASE}/results/algeria`)
  await p.waitForTimeout(300)
  const prev = p.getByRole('button', { name: 'Previous country: Albania' })
  await prev.focus()
  check(`a11y ${theme}: Previous is keyboard-focusable`, await prev.evaluate((el) => el === document.activeElement))
  const outline = await prev.evaluate((el) => getComputedStyle(el).outlineStyle)
  check(`a11y ${theme}: visible focus state on Previous`, outline !== 'none')
  await prev.press('Enter')
  await p.waitForTimeout(250)
  check(`a11y ${theme}: Enter activates the focused arrow (navigates)`, p.url().endsWith('/results/albania'))
  await context.close()
}

// D. Mobile card-height expansion: card occupies most of the viewport, only
// a small margin of background below it, rounded corners preserved, no
// internal scrollbar on the panel itself, CTAs inside comfortably.
async function runCardHeight(viewport, theme) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  const tag = `${theme} ${viewport.width}x${viewport.height}`
  await p.goto(`${BASE}/results/algeria`)
  await p.waitForTimeout(300)
  const info = await p.evaluate(() => {
    const panel = document.querySelector('.country-result-page__panel')
    const r = panel.getBoundingClientRect()
    const cs = getComputedStyle(panel)
    return {
      top: r.top, bottom: r.bottom, height: r.height,
      radius: parseFloat(cs.borderBottomLeftRadius),
      panelOverflow: cs.overflowY,
      scrollableInternally: panel.scrollHeight > panel.clientHeight + 1 && cs.overflowY !== 'visible',
    }
  })
  const { height: vh } = viewport
  check(`${tag}: card extends substantially down the viewport (>=70% of viewport height)`, info.height >= vh * 0.7, `${info.height}px of ${vh}px`)
  check(`${tag}: rounded bottom corners preserved`, info.radius > 0, `${info.radius}px`)
  check(`${tag}: no internal scrollbar on the card itself (page still owns scrolling)`, !info.scrollableInternally, JSON.stringify(info))
  check(`${tag}: Quiz CTA is gone (removed from Study results)`, (await p.getByRole('button', { name: /^quiz$/i }).count()) === 0)
  const backToStudy = p.getByRole('button', { name: /^back to study$/i })
  await backToStudy.scrollIntoViewIfNeeded()
  check(`${tag}: Back to Study CTA comfortably inside the card`, await backToStudy.isVisible())
  await noHorizontalOverflow(p, tag)
  await context.close()
}

// E. Desktop stays naturally sized (not forced to near-full viewport height).
async function runDesktopCardUnchanged(theme) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await newPage(context, theme)
  await p.goto(`${BASE}/results/algeria`)
  await p.waitForTimeout(300)
  const info = await p.evaluate(() => {
    const panel = document.querySelector('.country-result-page__panel')
    return { height: panel.getBoundingClientRect().height }
  })
  check(`desktop ${theme}: card is not forced to near-full viewport height`, info.height < 900 * 0.7, `${info.height}px of 900px`)
  await context.close()
}

for (const theme of ['light', 'dark']) {
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1280, height: 900 }]) {
    await runNavSequence(viewport, theme)
    await runNavLayout(viewport, theme)
  }
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await runCardHeight(viewport, theme)
  }
  await runDesktopCardUnchanged(theme)
  await runNavA11y(theme)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
