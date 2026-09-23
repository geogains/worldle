// Study page "Quiz" button QA: verifies search still works, Quiz navigates
// to /quiz, desktop/mobile layout, and light/dark visual QA.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function newCtx(theme = 'light', viewport = { width: 360, height: 900 }) {
  const context = await browser.newContext({ viewport })
  const p = await context.newPage()
  p.on('pageerror', (e) => failures.push(`[pageerror] ${e.message}`))
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
  }, theme)
  return { context, p }
}

async function runSection(tag, fn) {
  try {
    await fn()
  } catch (err) {
    check(`${tag}: section completed without throwing`, false, err?.message ?? String(err))
  }
}

function quizButton(p) {
  return p.locator('.study-search__quiz-btn')
}

await runSection('Search still works', async () => {
  const { context, p } = await newCtx('light', { width: 1280, height: 900 })
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(300)
  await p.getByRole('searchbox', { name: 'Search countries' }).fill('tanzania')
  await p.waitForTimeout(200)
  check('Search: filters to Tanzania', await p.getByText('Tanzania').isVisible())
  check('Search: status text shows "1 country"', await p.getByText('1 country').isVisible())
  await context.close()
})

await runSection('Quiz navigates to /quiz', async () => {
  const { context, p } = await newCtx('light', { width: 1280, height: 900 })
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(300)
  await quizButton(p).click()
  await p.waitForTimeout(300)
  check('Quiz button navigates to /quiz', p.url().endsWith('/quiz'))
  check('Quiz page heading renders', await p.getByRole('heading', { level: 1, name: 'Quiz' }).isVisible())
  await context.close()
})

await runSection('Study heading/subheading unchanged', async () => {
  const { context, p } = await newCtx('light', { width: 1280, height: 900 })
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(300)
  check('Heading "Study" present', await p.getByRole('heading', { level: 1, name: 'Study' }).isVisible())
  check('Subheading present', await p.getByText('Explore every country, learn its flag, capital, population, currency and more.').isVisible())
  await context.close()
})

await runSection('Visual — desktop light', async () => {
  const { context, p } = await newCtx('light', { width: 1280, height: 900 })
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${OUT}/study-quiz-desktop-light.png` })
  await context.close()
})
await runSection('Visual — desktop dark', async () => {
  const { context, p } = await newCtx('dark', { width: 1280, height: 900 })
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${OUT}/study-quiz-desktop-dark.png` })
  await context.close()
})
await runSection('Visual — 360px light', async () => {
  const { context, p } = await newCtx('light', { width: 360, height: 900 })
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(300)
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check('360px light: no horizontal overflow', sw <= cw, `${sw} <= ${cw}`)
  const row = await quizButton(p).evaluate((el) => {
    const input = document.querySelector('.study-search__input')
    const rowEl = el.closest('.study-search')
    const btnRect = el.getBoundingClientRect()
    const inputRect = input.getBoundingClientRect()
    return { sameRow: Math.abs(btnRect.top - inputRect.top) < 5, rowWidth: rowEl.getBoundingClientRect().width }
  })
  check('360px light: search input and Quiz button on the same row (not stacked)', row.sameRow)
  await p.screenshot({ path: `${OUT}/study-quiz-360-light.png` })
  await context.close()
})
await runSection('Visual — 360px dark', async () => {
  const { context, p } = await newCtx('dark', { width: 360, height: 900 })
  await p.goto(`${BASE}/study`)
  await p.waitForTimeout(300)
  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check('360px dark: no horizontal overflow', sw <= cw, `${sw} <= ${cw}`)
  await p.screenshot({ path: `${OUT}/study-quiz-360-dark.png` })
  await context.close()
})

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
