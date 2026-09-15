import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = process.argv[2] ?? new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const errors = []

async function ctx(opts = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, ...opts })
  const p = await c.newPage()
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  return { c, p }
}
const seenHelp = { 'daily-worldle:v1:prefs': JSON.stringify({ theme: 'light', hasSeenHelp: true }) }
async function seed(p, storage) {
  await p.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v) }, storage)
}
async function type(p, word) { for (const ch of word) await p.keyboard.press(ch) }
async function shot(p, name) { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name) }

// 1. First visit: tutorial auto-opens
{
  const { c, p } = await ctx()
  await p.goto(BASE + '/')
  await p.waitForTimeout(600)
  await shot(p, '01-first-visit-help')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)
  await shot(p, '02-empty-board-390')
  await c.close()
}

// 2. Typing, invalid guesses, valid guess, keyboard states, refresh persistence
{
  const { c, p } = await ctx()
  await seed(p, seenHelp)
  await p.goto(BASE + '/')
  await p.waitForTimeout(300)
  await type(p, 'MALAY')
  await p.waitForTimeout(150)
  await shot(p, '03-typing')
  await p.keyboard.press('Enter') // not enough letters
  await p.waitForTimeout(200)
  await shot(p, '04-not-enough-letters')
  await p.waitForTimeout(1500)
  await p.keyboard.press('Backspace')
  await type(p, 'ZZZZ') // MALAZZZZ -> not a country
  await p.keyboard.press('Enter')
  await p.waitForTimeout(200)
  await shot(p, '05-not-a-country')
  await p.waitForTimeout(1500)
  for (let i = 0; i < 8; i++) await p.keyboard.press('Backspace')
  await type(p, 'MALAYSIA')
  await p.keyboard.press('Enter')
  await p.waitForTimeout(1200)
  await shot(p, '06-mid-reveal')
  await p.waitForTimeout(2500)
  await shot(p, '07-after-reveal')
  await type(p, 'PORTUGAL')
  await p.keyboard.press('Enter')
  await p.waitForTimeout(3500)
  await type(p, 'CAM')
  await p.waitForTimeout(200)
  await p.reload()
  await p.waitForTimeout(500)
  await shot(p, '08-after-refresh-restored')
  // click on-screen keys
  await p.click('[data-key="E"]'); await p.click('[data-key="R"]'); await p.click('[data-key="O"]'); await p.click('[data-key="O"]'); await p.click('[data-key="N"]')
  await p.click('[data-key="ENTER"]')
  await p.waitForTimeout(3500)
  await shot(p, '09-third-guess')
  // win
  await type(p, 'TANZANIA')
  await p.keyboard.press('Enter')
  await p.waitForTimeout(3300)
  await shot(p, '10-win-bounce')
  await p.waitForTimeout(2500)
  await shot(p, '11-stats-modal-after-win')
  // share
  await c.grantPermissions(['clipboard-read', 'clipboard-write'])
  await p.click('text=Share')
  await p.waitForTimeout(400)
  await shot(p, '12-share-toast')
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '(no clipboard)')
  console.log('CLIPBOARD:\n' + clip)
  await p.keyboard.press('Escape')
  await p.waitForTimeout(400)
  await shot(p, '13-completed-board')
  await p.reload()
  await p.waitForTimeout(500)
  await shot(p, '14-completed-after-reload')
  const stats = await p.evaluate(() => localStorage.getItem('daily-worldle:v1:stats'))
  console.log('STATS:', stats)
  await c.close()
}

// 3. Loss flow
{
  const { c, p } = await ctx()
  await seed(p, seenHelp)
  await p.goto(BASE + '/')
  await p.waitForTimeout(300)
  for (const w of ['MALAYSIA', 'PORTUGAL', 'THAILAND', 'BULGARIA', 'CAMEROON', 'HONDURAS']) {
    await type(p, w)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(3300)
  }
  await p.waitForTimeout(600)
  await shot(p, '15-loss-toast')
  await p.waitForTimeout(2000)
  await shot(p, '16-loss-modal')
  console.log('STATS after loss:', await p.evaluate(() => localStorage.getItem('daily-worldle:v1:stats')))
  await c.close()
}

// 4. Dark mode + practice + archive + menu
{
  const { c, p } = await ctx({ colorScheme: 'dark' })
  await seed(p, { 'daily-worldle:v1:prefs': JSON.stringify({ theme: 'dark', hasSeenHelp: true }) })
  await p.goto(BASE + '/')
  await p.waitForTimeout(300)
  await type(p, 'MALAYSIA'); await p.keyboard.press('Enter'); await p.waitForTimeout(3300)
  await type(p, 'TANZ')
  await shot(p, '17-dark-board')
  await p.click('[aria-label="Open menu"]')
  await p.waitForTimeout(250)
  await shot(p, '18-dark-menu')
  await p.click('[role=menuitem]:has-text("Practice")')
  await p.waitForTimeout(400)
  await shot(p, '19-dark-practice')
  await p.click('[aria-label="How to play"]')
  await p.waitForTimeout(400)
  await shot(p, '20-dark-help')
  await p.keyboard.press('Escape')
  await p.click('[aria-label="Open menu"]')
  await p.click('[role=menuitem]:has-text("Archive")')
  await p.waitForTimeout(400)
  await shot(p, '21-dark-archive')
  await p.goto(BASE + '/archive/999')
  await p.waitForTimeout(400)
  await shot(p, '22-archive-invalid')
  await p.goto(BASE + '/')
  await p.waitForTimeout(400)
  await shot(p, '23-dark-daily-restored')
  await c.close()
}

// 5. Responsive widths, light, 10-letter board via practice seeded to Timor-Leste
for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1280, 800], [1920, 1080]]) {
  const { c, p } = await ctx({ viewport: { width: w, height: h }, hasTouch: w < 700 })
  await seed(p, {
    ...seenHelp,
    'daily-worldle:v1:practice': JSON.stringify({ answerId: 'timor-leste', previousAnswerId: null, guesses: ['MADAGASCAR', 'AZERBAIJAN'], current: 'TIMOR', status: 'active', updatedAt: 1 }),
  })
  await p.goto(BASE + '/practice')
  await p.waitForTimeout(400)
  const overflow = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight }))
  console.log(`viewport ${w}x${h} 10-col:`, JSON.stringify(overflow))
  await shot(p, `30-practice-10col-${w}x${h}`)
  await p.goto(BASE + '/')
  await p.waitForTimeout(400)
  await shot(p, `31-daily-8col-${w}x${h}`)
  await c.close()
}
// 4-letter board
{
  const { c, p } = await ctx()
  await seed(p, { ...seenHelp, 'daily-worldle:v1:practice': JSON.stringify({ answerId: 'peru', previousAnswerId: null, guesses: ['CHAD'], current: 'PE', status: 'active', updatedAt: 1 }) })
  await p.goto(BASE + '/practice')
  await p.waitForTimeout(400)
  await shot(p, '32-practice-4col-390')
  await c.close()
}
// stats modal with data (light, desktop)
{
  const { c, p } = await ctx({ viewport: { width: 1280, height: 800 }, hasTouch: false })
  await seed(p, { ...seenHelp, 'daily-worldle:v1:stats': JSON.stringify({ played: 12, wins: 10, currentStreak: 4, maxStreak: 7, distribution: [0, 2, 4, 3, 1, 0], lastCompletedPuzzle: 1, lastWonPuzzle: 1, completedPuzzles: [1] }), 'daily-worldle:v1:daily': JSON.stringify({ puzzleNumber: 1, guesses: ['MALAYSIA', 'PORTUGAL', 'TANZANIA'], current: '', status: 'won', updatedAt: 1 }) })
  await p.goto(BASE + '/')
  await p.waitForTimeout(400)
  await p.click('[aria-label="Statistics"]')
  await p.waitForTimeout(400)
  await shot(p, '33-stats-desktop')
  await c.close()
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
