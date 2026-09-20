import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const failures = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

async function run(theme, viewport, tag) {
  const context = await browser.newContext({ viewport })
  const p = await context.newPage()
  await p.addInitScript((t) => {
    localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: t, hasSeenHelp: true }))
    localStorage.setItem(
      'daily-worldle:v1:quizConfig',
      JSON.stringify({ mode: 'capitals', countryPool: 'familiar', answerStyle: 'multiple-choice', questionCount: 5 }),
    )
  }, theme)
  await p.goto(`${BASE}/quiz/capitals`)
  await p.waitForTimeout(300)

  const flag = p.locator('.quiz-play__capital-flag')
  check(`${tag}: flag visible`, await flag.isVisible())
  const box = await flag.boundingBox()
  const cardBox = await p.locator('.quiz-play__card').boundingBox()
  check(`${tag}: flag horizontally centered in card`, Math.abs((box.x + box.width / 2) - (cardBox.x + cardBox.width / 2)) < 2)

  // Order: question -> flag -> name -> answers
  const order = await p.evaluate(() => {
    const card = document.querySelector('.quiz-play__card')
    const els = [...card.children].map((el) => el.className)
    return els
  })
  check(`${tag}: flag appears before country name in DOM order`, order.indexOf('quiz-play__capital-flag') < order.indexOf('quiz-play__capital-name'), order.join(' | '))
  check(`${tag}: country name appears before answers`, order.indexOf('quiz-play__capital-name') < order.findIndex((c) => c.includes('quiz-answers')))

  const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  check(`${tag}: no horizontal overflow`, sw <= cw, `${sw} <= ${cw}`)

  await p.screenshot({ path: `${OUT}/capitals-flag-${tag}.png` })
  await context.close()
}

await run('light', { width: 390, height: 844 }, 'mobile-light')
await run('dark', { width: 390, height: 844 }, 'mobile-dark')
await run('light', { width: 1280, height: 900 }, 'desktop-light')
await run('dark', { width: 1280, height: 900 }, 'desktop-dark')

await browser.close()
console.log('\nFAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (failures.length) process.exitCode = 1
