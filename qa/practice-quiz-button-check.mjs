import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const p = await context.newPage()
await p.addInitScript(() => {
  localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: 'light', hasSeenHelp: true }))
  localStorage.setItem(
    'daily-worldle:v1:practice',
    JSON.stringify({ answerId: 'tanzania', previousAnswerId: null, guesses: ['ZIMBABWE', 'TANZANIA'], current: '', status: 'won', updatedAt: 1 }),
  )
  localStorage.setItem('daily-worldle:v1:lastResult', JSON.stringify({ source: 'practice', countryId: 'tanzania', puzzleNumber: null, at: 1 }))
})
await p.goto(`${BASE}/results/tanzania`)
await p.waitForTimeout(300)

const dialog = p.getByRole('dialog')
check('Play again present', await dialog.getByRole('button', { name: /play again/i }).isVisible())
check('Quiz present', await dialog.getByRole('button', { name: /^quiz$/i }).isVisible())
check('Share absent', (await dialog.getByRole('button', { name: /share/i }).count()) === 0)
await p.screenshot({ path: `${OUT}/practice-results-quiz-button.png` })

await dialog.getByRole('button', { name: /^quiz$/i }).click()
await p.waitForTimeout(300)
check('Clicking Quiz navigates to /quiz', new URL(p.url()).pathname === '/quiz')

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
