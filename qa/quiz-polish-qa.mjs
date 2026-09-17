// UX/layout polish pass verification:
//  1. Type Answer auto-focus across questions (no click needed)
//  2. subtle (non-coral) input focus ring
//  3. rounded gameplay card
//  4. reused Daily on-screen keyboard for Type Answer, neutral/no colouring,
//     locked during feedback
//  5. /study and /quiz scrollbar ownership (full-width scrolling element,
//     not inset to the centered content's max-width)
// Runs the Flags Type Answer flow across desktop/mobile x light/dark, plus
// a Daily regression smoke check, and checks console/page errors throughout.
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

const correctCountryName = (p) => p.locator('[data-quiz-correct-name]').getAttribute('data-quiz-correct-name')

async function runTypeAnswerFocusAndKeyboard(viewport, label, theme) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, theme)
  await setConfig(p, { mode: 'flags', countryPool: 'familiar', answerStyle: 'type-answer', questionCount: 5 })
  await p.goto(`${BASE}/quiz/flags`)
  await p.waitForTimeout(300)

  // 1-2: input has focus automatically, no click.
  const focusedId = await p.evaluate(() => document.activeElement?.id)
  check(`[${label}/${theme}] input is focused automatically on load`, focusedId === 'quiz-type-answer-input')

  // 3: type without clicking the input.
  const name1 = await correctCountryName(p)
  await p.keyboard.type(name1)
  check(`[${label}/${theme}] typed value entered without clicking`, (await p.getByLabel('Country name').inputValue()) === name1)

  // 4-5: submit, wait for auto-advance.
  await p.getByRole('button', { name: 'Submit' }).click()
  check(`[${label}/${theme}] input+keyboard lock during feedback`, await p.getByLabel('Country name').isDisabled())
  const lockedKey = p.getByRole('group', { name: 'On-screen keyboard' }).getByRole('button', { name: 'A', exact: true })
  check(`[${label}/${theme}] on-screen keyboard locked during feedback`, await lockedKey.isDisabled())
  await p.waitForTimeout(900)

  // 6-7: immediately type the next answer without clicking.
  const focusedId2 = await p.evaluate(() => document.activeElement?.id)
  check(`[${label}/${theme}] focus restored automatically for the next question`, focusedId2 === 'quiz-type-answer-input')
  check(`[${label}/${theme}] input cleared for the next question`, (await p.getByLabel('Country name').inputValue()) === '')
  const name2 = await correctCountryName(p)
  await p.keyboard.type(name2)
  check(`[${label}/${theme}] new characters entered successfully without re-clicking`, (await p.getByLabel('Country name').inputValue()) === name2)

  // 8-10: on-screen keyboard letters, Backspace, Enter.
  await p.getByLabel('Country name').fill('')
  const keyboard = p.getByRole('group', { name: 'On-screen keyboard' })
  await keyboard.getByRole('button', { name: name2[0], exact: true }).click()
  // On-screen keys stay visually uppercase but insert lowercase (see the
  // second polish pass) — the visible key label is still name2[0].
  check(`[${label}/${theme}] on-screen keyboard letter click enters a lowercase character`, (await p.getByLabel('Country name').inputValue()) === name2[0].toLowerCase())
  await keyboard.getByRole('button', { name: 'Backspace' }).click()
  check(`[${label}/${theme}] on-screen Backspace removes a character`, (await p.getByLabel('Country name').inputValue()) === '')
  await p.getByLabel('Country name').fill(name2)
  await keyboard.getByRole('button', { name: 'Enter' }).click()
  check(`[${label}/${theme}] on-screen Enter submits`, (await p.getByText('Correct!').count()) > 0)

  // Rounded gameplay card present.
  check(`[${label}/${theme}] rounded gameplay card present`, (await p.locator('.quiz-play__card').count()) === 1)

  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`[${label}/${theme}] no horizontal overflow`, noOverflow)

  await context.close()
}

async function runScrollOwnership(viewport, label) {
  const context = await browser.newContext({ viewport })
  const p = await newPage(context, 'light')

  for (const path of ['/study', '/quiz']) {
    await p.goto(`${BASE}${path}`)
    await p.waitForTimeout(300)
    const info = await p.evaluate(() => {
      const scrollers = Array.from(document.querySelectorAll('main *')).filter((el) => {
        const style = getComputedStyle(el)
        return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight
      })
      const el = scrollers[0]
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return { left: rect.left, right: rect.right, viewportWidth: window.innerWidth, count: scrollers.length }
    })
    check(`[${label}] ${path}: has a scrolling content section`, info !== null)
    if (info) {
      check(`[${label}] ${path}: scrolling element spans the full viewport width (scrollbar at the true edge, not inset)`,
        info.left === 0 && Math.abs(info.right - info.viewportWidth) < 1,
        `left=${info?.left} right=${info?.right} vw=${info?.viewportWidth}`)
      check(`[${label}] ${path}: exactly one scrolling section (no doubly-nested scroll)`, info.count === 1)
    }
    const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    check(`[${label}] ${path}: no horizontal overflow`, noOverflow)
    const headerVisible = viewport.width >= 640
      ? await p.getByRole('navigation', { name: 'Game modes' }).isVisible()
      : await p.getByRole('button', { name: 'Open menu' }).isVisible()
    check(`[${label}] ${path}: header still renders`, headerVisible)
  }

  await context.close()
}

async function runDailyRegression() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p = await newPage(context, 'light')
  await p.goto(`${BASE}/`)
  await p.waitForTimeout(300)

  await p.locator('[data-key="S"]').click()
  await p.locator('[data-key="P"]').click()
  const boardTextAfterSP = (await p.locator('[role="grid"]').first().innerText()).replace(/\s+/g, '')
  check('Daily: on-screen keyboard still enters letters', boardTextAfterSP.includes('SP'))
  await p.locator('[data-key="BACKSPACE"]').click()
  const boardTextAfterBackspace = (await p.locator('[role="grid"]').first().innerText()).replace(/\s+/g, '')
  check('Daily: on-screen Backspace still works', !boardTextAfterBackspace.includes('SP'))
  await p.keyboard.press('A')
  const boardTextAfterPhysical = (await p.locator('[role="grid"]').first().innerText()).replace(/\s+/g, '')
  check('Daily: physical keyboard still works', boardTextAfterPhysical.includes('A'))

  await context.close()
}

await runTypeAnswerFocusAndKeyboard({ width: 1440, height: 900 }, 'desktop', 'light')
await runTypeAnswerFocusAndKeyboard({ width: 1440, height: 900 }, 'desktop', 'dark')
await runTypeAnswerFocusAndKeyboard({ width: 390, height: 844 }, 'mobile', 'light')
await runTypeAnswerFocusAndKeyboard({ width: 390, height: 844 }, 'mobile', 'dark')
await runScrollOwnership({ width: 1440, height: 700 }, 'desktop')
await runScrollOwnership({ width: 390, height: 844 }, 'mobile')
await runDailyRegression()

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
