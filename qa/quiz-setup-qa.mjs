// Phase 1 Quiz foundation verification: /quiz setup screen (defaults, Quiz
// Type + Answer Style + Question Count groups, the Difficulty carousel,
// summary updates, Start Quiz routing), the /quiz/:mode placeholder shell,
// and light/dark + mobile/desktop rendering with no layout overflow.
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

// --- Difficulty carousel helpers ---------------------------------------
const prevDifficulty = (p) => p.getByRole('button', { name: 'Previous difficulty' })
const nextDifficulty = (p) => p.getByRole('button', { name: 'Next difficulty' })
const currentDifficultyLabel = (p) =>
  p.locator('[data-difficulty-card="current"] .quiz-option__label').textContent()
// The plain label with no emoji (e.g. "Medium", not "Medium 🟠🟠⚪️") — what
// the config summary and accessible status actually render, read off the
// status text rather than trying to strip emoji out of the card text.
const currentDifficultyPlainLabel = async (p) => {
  const status = await p.locator('.difficulty-carousel__status').textContent()
  return (status ?? '').replace(/^Difficulty \d of \d: /, '')
}
const activeDotIndex = (p) =>
  p.evaluate(() => [...document.querySelectorAll('.difficulty-carousel__dot')].findIndex((d) => d.classList.contains('difficulty-carousel__dot--active')))

async function runSetup(viewport, label, theme = 'light') {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(300)

  check(`[${label}/${theme}] Quiz heading renders`, await p.getByRole('heading', { level: 1, name: 'Quiz' }).isVisible())

  const modeGroup = p.getByRole('radiogroup', { name: 'Quiz type' })
  const styleGroup = p.getByRole('radiogroup', { name: 'Answer style' })
  const countGroup = p.getByRole('radiogroup', { name: 'Question count' })
  check(`[${label}/${theme}] Quiz Type / Answer Style / Question Count groups render`,
    (await modeGroup.isVisible()) && (await styleGroup.isVisible()) && (await countGroup.isVisible()))
  // Exact match on the section heading only — World Expert's own
  // description text ("...supported country pool.") is preserved
  // unchanged and legitimately still contains the phrase.
  check(`[${label}/${theme}] "Country Pool" is no longer a section heading`, (await p.getByRole('heading', { name: 'Country Pool', exact: true }).count()) === 0)
  check(`[${label}/${theme}] "Difficulty" is the section heading`, await p.getByRole('heading', { name: 'Difficulty', exact: true }).isVisible())
  check(`[${label}/${theme}] Difficulty is no longer a radiogroup (it's a carousel now)`, (await p.getByRole('radiogroup', { name: 'Difficulty' }).count()) === 0)

  // Defaults: Flags / Easy (internally "familiar") / Multiple Choice / 10.
  check(`[${label}/${theme}] default: Flags selected`, (await modeGroup.getByRole('radio', { name: /flags/i }).getAttribute('aria-checked')) === 'true')
  check(`[${label}/${theme}] default: "Easy 🔵⚪️⚪️" shown in the carousel`, (await currentDifficultyLabel(p)) === 'Easy 🔵⚪️⚪️')
  check(`[${label}/${theme}] default: Multiple Choice selected`, (await styleGroup.getByRole('radio', { name: 'Multiple Choice' }).getAttribute('aria-checked')) === 'true')
  check(`[${label}/${theme}] default: 10 selected`, (await countGroup.getByRole('radio', { name: '10' }).getAttribute('aria-checked')) === 'true')
  check(`[${label}/${theme}] default summary text uses the plain "Easy" label`, await p.getByText('Flags · Easy · Multiple Choice · 10 Questions').isVisible())

  // Each Quiz Type option selectable.
  for (const name of ['Flags', 'Capitals', 'Currencies', 'Languages', 'Facts', 'Mixed']) {
    await modeGroup.getByRole('radio', { name }).click()
    check(`[${label}/${theme}] Quiz Type "${name}" becomes selected`, (await modeGroup.getByRole('radio', { name }).getAttribute('aria-checked')) === 'true')
  }
  await modeGroup.getByRole('radio', { name: 'Flags' }).click()

  // Difficulty carousel: only one card visible at rest, arrows fit, symmetrical.
  check(`[${label}/${theme}] only one Difficulty card in the DOM at rest`, (await p.locator('.difficulty-carousel__card').count()) === 1)
  const arrowBoxes = { prev: await prevDifficulty(p).boundingBox(), next: await nextDifficulty(p).boundingBox() }
  check(`[${label}/${theme}] both arrows are comfortably tappable (>=40px)`, arrowBoxes.prev.width >= 40 && arrowBoxes.prev.height >= 40 && arrowBoxes.next.width >= 40 && arrowBoxes.next.height >= 40)
  const carouselRow = await p.locator('.difficulty-carousel').boundingBox()
  const setupCard = await p.locator('.quiz-setup-card').boundingBox()
  check(`[${label}/${theme}] the whole carousel row stays inside the setup card`,
    carouselRow.x >= setupCard.x - 0.5 && carouselRow.x + carouselRow.width <= setupCard.x + setupCard.width + 0.5)
  check(`[${label}/${theme}] arrows are vertically centred with the card`,
    Math.abs((arrowBoxes.prev.y + arrowBoxes.prev.height / 2) - (carouselRow.y + carouselRow.height / 2)) < 2)

  // Both Answer Style options selectable.
  for (const name of ['Multiple Choice', 'Type Answer']) {
    await styleGroup.getByRole('radio', { name }).click()
    check(`[${label}/${theme}] Answer Style "${name}" becomes selected`, (await styleGroup.getByRole('radio', { name }).getAttribute('aria-checked')) === 'true')
  }
  await styleGroup.getByRole('radio', { name: 'Multiple Choice' }).click()

  // All three Question Count options selectable.
  for (const name of ['5', '10', 'Unlimited']) {
    await countGroup.getByRole('radio', { name }).click()
    check(`[${label}/${theme}] Question Count "${name}" becomes selected`, (await countGroup.getByRole('radio', { name }).getAttribute('aria-checked')) === 'true')
  }
  await countGroup.getByRole('radio', { name: '10' }).click()

  // Summary updates immediately, including a Difficulty carousel change.
  await modeGroup.getByRole('radio', { name: 'Mixed' }).click()
  await nextDifficulty(p).click()
  await p.waitForTimeout(300)
  await styleGroup.getByRole('radio', { name: 'Type Answer' }).click()
  await countGroup.getByRole('radio', { name: 'Unlimited' }).click()
  check(`[${label}/${theme}] summary updates to "Mixed · Medium · Type Answer · Unlimited" (no emoji in the summary)`, await p.getByText('Mixed · Medium · Type Answer · Unlimited').isVisible())

  // Quiz Type emoji: exact mapping, decorative (accessible name comes from
  // the visible label alone).
  const EXPECTED_EMOJI = { Flags: '🏳️', Capitals: '🏛️', Currencies: '💰', Languages: '🗣️', Facts: '💡', Mixed: '🔀' }
  for (const [name, emoji] of Object.entries(EXPECTED_EMOJI)) {
    const option = modeGroup.getByRole('radio', { name })
    const iconText = await option.locator('.quiz-option__icon').textContent()
    check(`[${label}/${theme}] "${name}" shows the emoji ${emoji}`, iconText === emoji, `got "${iconText}"`)
    const hidden = await option.locator('.quiz-option__icon').getAttribute('aria-hidden')
    check(`[${label}/${theme}] "${name}" emoji is aria-hidden (decorative)`, hidden === 'true')
  }
  check(`[${label}/${theme}] no checkmark icon element anywhere`, (await p.locator('.quiz-option__check').count()) === 0)

  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}/${theme}] no horizontal overflow`, noOverflow)
  await p.screenshot({ path: `${OUT}/quiz-setup-carousel-${theme}-${viewport.width}.png` })

  await context.close()
}

// Dedicated Difficulty-carousel deep dive: looping both directions,
// pagination dots, animation direction, transition lock, reduced motion,
// persistence across reload.
async function runCarousel(viewport, label, theme = 'light') {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(300)

  // Center-aligned title + description (real computed style, since jsdom
  // unit tests can't verify actual CSS rendering).
  const align = await p.evaluate(() => {
    const card = document.querySelector('[data-difficulty-card="current"]')
    const label = card.querySelector('.quiz-option__label')
    const desc = card.querySelector('.quiz-option__description')
    return { card: getComputedStyle(card).textAlign, label: getComputedStyle(label).textAlign, desc: getComputedStyle(desc).textAlign }
  })
  check(`[${label}/${theme}] difficulty card title is centered`, align.card === 'center' || align.label === 'center', JSON.stringify(align))
  check(`[${label}/${theme}] difficulty card description is centered`, align.card === 'center' || align.desc === 'center', JSON.stringify(align))

  // Old labels are gone from the carousel entirely.
  const carouselText = await p.locator('.difficulty-carousel').innerText()
  const dotsAndStatusText = (await p.locator('.difficulty-carousel__status').textContent()) ?? ''
  const oldLabelsGone = !['Familiar', 'Explorer', 'World Expert'].some((old) => carouselText.includes(old) || dotsAndStatusText.includes(old))
  check(`[${label}/${theme}] old labels (Familiar/Explorer/World Expert) no longer appear in the carousel`, oldLabelsGone)

  // Emoji fit on one line, no wrapping, no horizontal overflow of the card itself.
  const noWrap = await p.evaluate(() => {
    const label = document.querySelector('[data-difficulty-card="current"] .quiz-option__label')
    return label.scrollWidth <= label.clientWidth + 1 && label.getClientRects().length === 1
  })
  check(`[${label}/${theme}] difficulty label + emoji fit on one line without wrapping`, noWrap)

  check(`[${label}/${theme}] exactly one Difficulty card at rest`, (await p.locator('.difficulty-carousel__card').count()) === 1)
  check(`[${label}/${theme}] exactly 3 pagination dots`, (await p.locator('.difficulty-carousel__dot').count()) === 3)
  check(`[${label}/${theme}] dot 0 (Easy) active initially`, (await activeDotIndex(p)) === 0)

  // Next loop: Easy -> Medium -> Expert -> Easy.
  const nextSequence = ['Medium 🟠🟠⚪️', 'Expert 🔴🔴🔴', 'Easy 🔵⚪️⚪️']
  for (let i = 0; i < nextSequence.length; i++) {
    await nextDifficulty(p).click()
    await p.waitForTimeout(300)
    check(`[${label}/${theme}] Next step ${i + 1}: shows "${nextSequence[i]}"`, (await currentDifficultyLabel(p)) === nextSequence[i])
  }
  check(`[${label}/${theme}] after 3x Next, back to dot 0 (looped)`, (await activeDotIndex(p)) === 0)

  // Previous loop: Easy -> Expert -> Medium -> Easy.
  const prevSequence = ['Expert 🔴🔴🔴', 'Medium 🟠🟠⚪️', 'Easy 🔵⚪️⚪️']
  for (let i = 0; i < prevSequence.length; i++) {
    await prevDifficulty(p).click()
    await p.waitForTimeout(300)
    check(`[${label}/${theme}] Previous step ${i + 1}: shows "${prevSequence[i]}"`, (await currentDifficultyLabel(p)) === prevSequence[i])
  }

  // Animation direction: Next enters from the right, Previous enters from the left.
  await p.click('[aria-label="Next difficulty"]')
  const nextEnterClass = await p.evaluate(() => document.querySelector('[data-difficulty-card="current"]')?.className ?? '')
  check(`[${label}/${theme}] Next: incoming card animates in from the right`, nextEnterClass.includes('difficulty-carousel__card--in-right'))
  await p.waitForTimeout(300)
  await p.click('[aria-label="Previous difficulty"]')
  const prevEnterClass = await p.evaluate(() => document.querySelector('[data-difficulty-card="current"]')?.className ?? '')
  check(`[${label}/${theme}] Previous: incoming card animates in from the left`, prevEnterClass.includes('difficulty-carousel__card--in-left'))
  await p.waitForTimeout(300)

  // Accessible status text.
  const status = p.locator('.difficulty-carousel__status')
  check(`[${label}/${theme}] accessible status announces "Difficulty N of 3: <label>"`, /^Difficulty \d of 3: /.test((await status.textContent()) ?? ''))

  // Persistence across reload.
  await nextDifficulty(p).click()
  await p.waitForTimeout(300)
  const beforeReload = await currentDifficultyLabel(p)
  await p.reload()
  await p.waitForTimeout(300)
  const afterReload = await currentDifficultyLabel(p)
  check(`[${label}/${theme}] selected difficulty survives reload`, beforeReload === afterReload, `${beforeReload} -> ${afterReload}`)

  // Start Quiz uses the selected difficulty. Switch to a placeholder mode
  // first (Capitals) so the destination screen renders the resolved
  // "mode · pool · style · count" summary text to check against — Flags
  // (the default mode) has real gameplay instead of that placeholder.
  await p.getByRole('radiogroup', { name: 'Quiz type' }).getByRole('radio', { name: /capitals/i }).click()
  const beforeStart = await currentDifficultyPlainLabel(p)
  await p.click('text=Start Quiz')
  await p.waitForTimeout(300)
  check(`[${label}/${theme}] Start Quiz used the carousel's selected difficulty ("${beforeStart}")`, await p.getByText(new RegExp(`· ${beforeStart} ·`)).isVisible())

  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}/${theme}] no horizontal overflow after carousel interaction`, noOverflow)

  await context.close()
}

async function runReducedMotion(viewport, label) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
  const p = await newPage(context, 'light')
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(300)
  await p.click('[aria-label="Next difficulty"]')
  // No wait: with reduced motion, the swap should already be complete and
  // there should never be two cards (an exiting + entering pair) at once.
  const info = await p.evaluate(() => ({
    count: document.querySelectorAll('.difficulty-carousel__card').length,
    label: document.querySelector('[data-difficulty-card="current"] .quiz-option__label')?.textContent,
  }))
  check(`[${label}] reduced motion: instant swap, only one card ever mounted`, info.count === 1, JSON.stringify(info))
  check(`[${label}] reduced motion: selection already updated ("Medium 🟠🟠⚪️")`, info.label === 'Medium 🟠🟠⚪️')
  await context.close()
}

async function runStartQuizFlow(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context)
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(300)

  await p.getByRole('radiogroup', { name: 'Quiz type' }).getByRole('radio', { name: /capitals/i }).click()
  await p.getByRole('radiogroup', { name: 'Question count' }).getByRole('radio', { name: '5' }).click()
  await p.getByRole('button', { name: 'Start Quiz' }).click()
  await p.waitForTimeout(300)
  check(`[${label}] Start Quiz navigates to /quiz/capitals`, p.url().endsWith('/quiz/capitals'))
  check(`[${label}] placeholder shows the resolved configuration`, await p.getByText('Capitals · Easy · Multiple Choice · 5 Questions').isVisible())

  await p.getByRole('button', { name: 'Change Quiz' }).click()
  await p.waitForTimeout(300)
  check(`[${label}] Change Quiz returns to /quiz`, p.url().endsWith('/quiz'))
  check(`[${label}] Change Quiz retains the previous selections`, (await p.getByRole('radiogroup', { name: 'Quiz type' }).getByRole('radio', { name: /capitals/i }).getAttribute('aria-checked')) === 'true')

  await context.close()
}

await runSetup({ width: 390, height: 844 }, 'mobile', 'light')
await runSetup({ width: 1440, height: 900 }, 'desktop', 'light')
await runSetup({ width: 390, height: 844 }, 'mobile', 'dark')
await runSetup({ width: 1440, height: 900 }, 'desktop', 'dark')

for (const theme of ['light', 'dark']) {
  await runCarousel({ width: 375, height: 844 }, '375px', theme)
  await runCarousel({ width: 390, height: 844 }, '390px', theme)
  await runCarousel({ width: 430, height: 932 }, '430px', theme)
  await runCarousel({ width: 1440, height: 900 }, 'desktop', theme)
}

await runReducedMotion({ width: 390, height: 844 }, 'mobile')
await runReducedMotion({ width: 1440, height: 900 }, 'desktop')

await runStartQuizFlow({ width: 390, height: 844 }, 'mobile')
await runStartQuizFlow({ width: 1440, height: 900 }, 'desktop')

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
