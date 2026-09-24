// Difficulty selector simplification QA: no navy/coral selected border on
// the Difficulty card specifically (while Quiz Type/Answer Style/Questions
// keep theirs), no description text, larger centred title, arrows/dots
// unaffected. Desktop + mobile x light/dark.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newCtx(theme, viewport) {
  const context = await browser.newContext({ viewport })
  const p = await context.newPage()
  p.on('pageerror', (e) => failures.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return { context, p }
}

async function run(theme, viewport, tag) {
  const { context, p } = await newCtx(theme, viewport)
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(250)

  // No description text anywhere.
  for (const text of ['The most recognisable, widely known countries.', 'A balanced mix of familiar and less obvious countries.', 'The full supported country pool.']) {
    check(`${tag}: description text absent — "${text.slice(0, 20)}..."`, (await p.getByText(text).count()) === 0)
  }
  check(`${tag}: no leftover .quiz-option__description element in the difficulty card`, (await p.locator('[data-difficulty-card="current"] .quiz-option__description').count()) === 0)

  // Difficulty card border/background/shadow vs Quiz Type's Flags card (selected).
  const diffStyle = await p.evaluate(() => {
    const el = document.querySelector('[data-difficulty-card="current"]')
    const s = getComputedStyle(el)
    return { borderColor: s.borderColor, background: s.backgroundColor, boxShadow: s.boxShadow }
  })
  const flagsStyle = await p.evaluate(() => {
    const el = document.querySelector('[role="radiogroup"][aria-label="Quiz type"] [role="radio"][aria-checked="true"]')
    const s = getComputedStyle(el)
    return { borderColor: s.borderColor, background: s.backgroundColor, boxShadow: s.boxShadow }
  })
  check(`${tag}: Difficulty card border differs from selected Quiz Type card (no navy/coral border)`, diffStyle.borderColor !== flagsStyle.borderColor, JSON.stringify({ diffStyle, flagsStyle }))
  check(`${tag}: Quiz Type Flags card keeps its selected-state class`, await p.locator('[role="radiogroup"][aria-label="Quiz type"] [role="radio"][aria-checked="true"]').evaluate((el) => el.classList.contains('quiz-option--selected')))

  // Answer Style / Questions selected borders unaffected.
  const answerStyleSelected = await p.evaluate(() => {
    const el = document.querySelector('[role="radiogroup"][aria-label="Answer style"] [role="radio"][aria-checked="true"]')
    return getComputedStyle(el).borderColor
  })
  check(`${tag}: Answer Style selected border unchanged (matches Quiz Type's selected border colour)`, answerStyleSelected === flagsStyle.borderColor)

  // Title size vs Answer Style label size (should be visibly bigger).
  const sizes = await p.evaluate(() => {
    const diffLabel = document.querySelector('[data-difficulty-card="current"] .quiz-option__label')
    const asLabel = document.querySelector('[role="radiogroup"][aria-label="Answer style"] .quiz-option__label')
    return { diff: parseFloat(getComputedStyle(diffLabel).fontSize), other: parseFloat(getComputedStyle(asLabel).fontSize) }
  })
  check(`${tag}: Difficulty title font-size is noticeably larger than a standard option label`, sizes.diff > sizes.other * 1.2, JSON.stringify(sizes))

  // Centering: label box horizontally and vertically centred within the card.
  const centering = await p.evaluate(() => {
    const card = document.querySelector('[data-difficulty-card="current"]')
    const label = card.querySelector('.quiz-option__label')
    const cardRect = card.getBoundingClientRect()
    const labelRect = label.getBoundingClientRect()
    return {
      cardCenterX: cardRect.x + cardRect.width / 2,
      labelCenterX: labelRect.x + labelRect.width / 2,
      cardCenterY: cardRect.y + cardRect.height / 2,
      labelCenterY: labelRect.y + labelRect.height / 2,
    }
  })
  check(
    `${tag}: title horizontally centred in the card`,
    Math.abs(centering.cardCenterX - centering.labelCenterX) < 3,
    `card=${centering.cardCenterX.toFixed(1)} label=${centering.labelCenterX.toFixed(1)}`,
  )
  check(
    `${tag}: title vertically centred in the card`,
    Math.abs(centering.cardCenterY - centering.labelCenterY) < 3,
    `card=${centering.cardCenterY.toFixed(1)} label=${centering.labelCenterY.toFixed(1)}`,
  )

  // Card size roughly preserved (viewport min-height untouched at 92px).
  const cardHeight = await p.evaluate(() => document.querySelector('.difficulty-carousel__viewport').getBoundingClientRect().height)
  check(`${tag}: difficulty card/viewport height preserved (~92px)`, cardHeight >= 88 && cardHeight <= 100, `${cardHeight}`)

  // Arrows still present/positioned either side, dots still present below.
  check(`${tag}: Previous/Next arrows present`, (await p.getByRole('button', { name: 'Previous difficulty' }).count()) === 1 && (await p.getByRole('button', { name: 'Next difficulty' }).count()) === 1)
  check(`${tag}: difficulty dots still rendered (3)`, (await p.locator('.difficulty-carousel__dot').count()) === 3)
  const arrowsAndCard = await p.evaluate(() => {
    const prev = document.querySelector('.difficulty-carousel__arrow')
    const card = document.querySelector('[data-difficulty-card="current"]')
    const pr = prev.getBoundingClientRect()
    const cr = card.getBoundingClientRect()
    return { prevRight: pr.x + pr.width, cardLeft: cr.x }
  })
  check(`${tag}: Previous arrow sits to the left of the card`, arrowsAndCard.prevRight <= arrowsAndCard.cardLeft + 1)

  // Cycle through Medium/Expert and re-check title size + no description + centering each time.
  for (const label of ['Medium', 'Expert', 'Easy']) {
    await p.getByRole('button', { name: 'Next difficulty' }).click()
    await p.waitForTimeout(300)
    const text = await p.locator('[data-difficulty-card="current"] .quiz-option__label').textContent()
    check(`${tag}: cycled label starts with expected text (${label})`, text.trim().startsWith(label), text)
    check(`${tag}: no description for ${label}`, (await p.locator('[data-difficulty-card="current"] .quiz-option__description').count()) === 0)
  }

  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`${tag}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)

  await p.screenshot({ path: `${OUT}/difficulty-${tag}.png` })
  await context.close()
}

await run('light', { width: 1200, height: 900 }, 'desktop-light')
await run('dark', { width: 1200, height: 900 }, 'desktop-dark')
await run('light', { width: 375, height: 900 }, 'mobile-light')
await run('dark', { width: 375, height: 900 }, 'mobile-dark')

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
