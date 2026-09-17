// Second UI polish pass verification:
//  1. on-screen keyboard inserts lowercase into Type Answer
//  2/3. larger mobile spacing between flag and answer UI (MC + Type Answer)
//  5. no circular tick-icon on selected /quiz options (border/highlight only)
//  6/7. /quiz setup controls inside one rounded card, spaced from the intro
//  9. mobile Country Pool: Familiar+Explorer side by side, World Expert
//     spans the full row beneath them
// Runs across desktop/mobile x light/dark and checks console/page errors.
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

function setConfig(p, config) {
  return p.addInitScript((cfg) => {
    localStorage.setItem('daily-worldle:v1:quizConfig', JSON.stringify(cfg))
  }, config)
}

async function runFlagsSpacingAndLowercase(viewport, label, theme) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)

  // Type Answer: lowercase insertion + spacing.
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)

  const keyboard = p.getByRole('group', { name: 'On-screen keyboard' })
  const mKey = keyboard.getByRole('button', { name: 'M', exact: true })
  check(`[${label}/${theme}] on-screen key visually shows uppercase "M"`, (await mKey.textContent()) === 'M')
  await mKey.click()
  await keyboard.getByRole('button', { name: 'A', exact: true }).click()
  check(`[${label}/${theme}] tapping M then A inserts lowercase "ma"`, (await p.getByLabel('Country name').inputValue()) === 'ma')

  await p.keyboard.type('X')
  check(`[${label}/${theme}] physical typing is not force-lowercased`, (await p.getByLabel('Country name').inputValue()) === 'maX')

  const gap = await p.evaluate(() => {
    const flag = document.querySelector('.quiz-play__flag')
    const typeAnswer = document.querySelector('.quiz-type-answer')
    return typeAnswer.getBoundingClientRect().top - flag.getBoundingClientRect().bottom
  })
  const minGap = viewport.width < 640 ? 20 : 5
  check(`[${label}/${theme}] Type Answer: flag-to-input gap is comfortably large (${Math.round(gap)}px, need >= ${minGap}px)`, gap >= minGap)

  const noOverflow1 = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}/${theme}] Type Answer: no horizontal overflow`, noOverflow1)

  // Multiple Choice: spacing + no overlap.
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)

  const gap2 = await p.evaluate(() => {
    const flag = document.querySelector('.quiz-play__flag')
    const answers = document.querySelector('.quiz-answers')
    return answers.getBoundingClientRect().top - flag.getBoundingClientRect().bottom
  })
  check(`[${label}/${theme}] Multiple Choice: flag-to-answers gap is comfortably large (${Math.round(gap2)}px, need >= ${minGap}px)`, gap2 >= minGap)

  const boxes = await p.locator('.quiz-answer').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))
  let overlap = false
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlap = true
    }
  }
  check(`[${label}/${theme}] Multiple Choice: no answer option overlap`, !overlap)

  const noOverflow2 = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}/${theme}] Multiple Choice: no horizontal overflow`, noOverflow2)

  await context.close()
}

async function runSetupCardAndTicks(viewport, label, theme) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(300)

  check(`[${label}/${theme}] setup card is present`, (await p.locator('.quiz-setup-card').count()) === 1)
  const card = p.locator('.quiz-setup-card')
  check(`[${label}/${theme}] heading is outside the card`, (await card.getByRole('heading', { level: 1, name: 'Quiz' }).count()) === 0)
  check(`[${label}/${theme}] heading is visible on the page`, await p.getByRole('heading', { level: 1, name: 'Quiz' }).isVisible())
  check(`[${label}/${theme}] all four groups are inside the card`,
    (await card.getByRole('radiogroup', { name: 'Quiz type' }).count()) === 1 &&
    (await card.getByRole('radiogroup', { name: 'Country pool' }).count()) === 1 &&
    (await card.getByRole('radiogroup', { name: 'Answer style' }).count()) === 1 &&
    (await card.getByRole('radiogroup', { name: 'Question count' }).count()) === 1)
  check(`[${label}/${theme}] Start Quiz is inside the card`, (await card.getByRole('button', { name: 'Start Quiz' }).count()) === 1)

  // Spacing between intro and card.
  const spacing = await p.evaluate(() => {
    const intro = document.querySelectorAll('main p')[0]
    const card = document.querySelector('.quiz-setup-card')
    return card.getBoundingClientRect().top - intro.getBoundingClientRect().bottom
  })
  check(`[${label}/${theme}] visible spacing before the card (${Math.round(spacing)}px)`, spacing >= 16)

  // No tick icon anywhere, selected border/highlight still present.
  check(`[${label}/${theme}] no .quiz-option__check element exists anywhere`, (await p.locator('.quiz-option__check').count()) === 0)
  const flagsTile = p.getByRole('radio', { name: /flags/i })
  check(`[${label}/${theme}] default-selected Flags tile keeps the selected class`, (await flagsTile.getAttribute('class')).includes('quiz-option--selected'))
  check(`[${label}/${theme}] default-selected Flags tile has aria-checked=true`, (await flagsTile.getAttribute('aria-checked')) === 'true')

  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}/${theme}] no horizontal overflow`, noOverflow)

  await context.close()
}

async function runMobileCountryPoolLayout() {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } })
  const p = await newPage(context, 'light')
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(300)

  const boxes = await p.evaluate(() => {
    const options = Array.from(document.querySelectorAll('[aria-label="Country pool"] [role="radio"]'))
    return options.map((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }
    })
  })
  const [familiar, explorer, worldExpert] = boxes
  check('mobile: Familiar and Explorer are on the same row (side by side)', Math.abs(familiar.top - explorer.top) < 2)
  check('mobile: Familiar is left of Explorer', familiar.right <= explorer.left + 1)
  check('mobile: World Expert sits on a new row below Familiar/Explorer', worldExpert.top > familiar.bottom - 1)
  check('mobile: World Expert spans the full combined width of Familiar + Explorer',
    Math.abs(worldExpert.left - familiar.left) < 2 && Math.abs(worldExpert.right - explorer.right) < 2,
    `familiar.left=${familiar.left} we.left=${worldExpert.left} explorer.right=${explorer.right} we.right=${worldExpert.right}`)

  await context.close()
}

async function runDesktopCountryPoolLayout() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await newPage(context, 'light')
  await p.goto(`${BASE}/quiz`)
  await p.waitForTimeout(300)

  const boxes = await p.evaluate(() => {
    const options = Array.from(document.querySelectorAll('[aria-label="Country pool"] [role="radio"]'))
    return options.map((el) => el.getBoundingClientRect().top)
  })
  check('desktop: Country Pool remains 3 equal columns on one row', boxes.every((t) => Math.abs(t - boxes[0]) < 2))

  await context.close()
}

await runFlagsSpacingAndLowercase({ width: 390, height: 844 }, 'mobile', 'light')
await runFlagsSpacingAndLowercase({ width: 390, height: 844 }, 'mobile', 'dark')
await runFlagsSpacingAndLowercase({ width: 1440, height: 900 }, 'desktop', 'light')
await runSetupCardAndTicks({ width: 1440, height: 1400 }, 'desktop', 'light')
await runSetupCardAndTicks({ width: 1440, height: 1400 }, 'desktop', 'dark')
await runSetupCardAndTicks({ width: 390, height: 1400 }, 'mobile', 'light')
await runSetupCardAndTicks({ width: 390, height: 1400 }, 'mobile', 'dark')
await runMobileCountryPoolLayout()
await runDesktopCountryPoolLayout()

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
