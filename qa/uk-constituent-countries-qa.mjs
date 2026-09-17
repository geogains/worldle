// England/Scotland/Wales implementation verification: standalone
// /results/:slug pages, no completed game — checks correct heading,
// correct DISTINCT flag (not the UK Union flag, not shared between the
// three), capital, GBP/£ currency, population, languages, no placeholders,
// and that Ireland/United Kingdom remain unaffected.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
const failures = []
const errors = []

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

const c = await browser.newContext({ viewport: { width: 390, height: 844 } })
const p = await c.newPage()
p.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`) })
p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
await p.addInitScript(() => {
  localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: 'light', hasSeenHelp: true }))
})

const cases = [
  { slug: 'england', name: 'England', flag: 'GB-ENG', capital: 'London', currency: 'Pound Sterling (GBP) · £', pop: '58,834,800', langs: 'English' },
  { slug: 'scotland', name: 'Scotland', flag: 'GB-SCT', capital: 'Edinburgh', currency: 'Pound Sterling (GBP) · £', pop: '5,545,500', langs: 'English, Scots, Scottish Gaelic' },
  { slug: 'wales', name: 'Wales', flag: 'GB-WLS', capital: 'Cardiff', currency: 'Pound Sterling (GBP) · £', pop: '3,175,200', langs: 'English, Welsh' },
]

for (const t of cases) {
  await p.goto(`${BASE}/results/${t.slug}`)
  await p.waitForTimeout(300)
  check(`${t.name}: heading`, await p.getByRole('heading', { level: 1, name: t.name }).isVisible())
  const flag = p.getByRole('img', { name: `Flag of ${t.name}` })
  check(`${t.name}: flag visible`, await flag.isVisible())
  check(`${t.name}: flag src is /flags/${t.flag}.png`, (await flag.getAttribute('src')) === `/flags/${t.flag}.png`)
  check(`${t.name}: flag loaded (naturalWidth > 0)`, await flag.evaluate((img) => img.complete && img.naturalWidth > 0))
  check(`${t.name}: no "Coming soon" placeholders`, (await p.getByText('Coming soon', { exact: true }).count()) === 0)
  check(`${t.name}: capital renders`, (await p.getByLabel(`${t.name} facts`).getByText(t.capital, { exact: true }).count()) > 0)
  check(`${t.name}: currency renders GBP/£`, await p.getByText(t.currency, { exact: true }).isVisible())
  check(`${t.name}: population renders exact formatted value`, await p.getByText(t.pop, { exact: true }).isVisible())
  check(`${t.name}: no year/estimate text anywhere`, (await p.getByText(/estimate as of|\b2025\b|\b2026\b/i).count()) === 0)
  check(`${t.name}: languages render exactly "${t.langs}"`, await p.getByText(t.langs, { exact: true }).isVisible())
  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`${t.name}: no horizontal overflow`, noOverflow)
}

// England must not display the UK Union flag (GB.png) — must be GB-ENG.png specifically.
await p.goto(`${BASE}/results/england`); await p.waitForTimeout(200)
const englandFlagSrc = await p.getByRole('img', { name: 'Flag of England' }).getAttribute('src')
check('England: does NOT display the UK Union flag (/flags/GB.png)', englandFlagSrc !== '/flags/GB.png')
check('England: does NOT display Scotland\'s or Wales\' flag', englandFlagSrc !== '/flags/GB-SCT.png' && englandFlagSrc !== '/flags/GB-WLS.png')

// Scotland must use GB-SCT.png specifically (not GB or GB-ENG/GB-WLS).
await p.goto(`${BASE}/results/scotland`); await p.waitForTimeout(200)
const scotlandFlagSrc = await p.getByRole('img', { name: 'Flag of Scotland' }).getAttribute('src')
check('Scotland: uses GB-SCT.png specifically', scotlandFlagSrc === '/flags/GB-SCT.png')
check('Scotland: no Welsh text', (await p.getByText(/\bWelsh\b/).count()) === 0)

// Wales must use GB-WLS.png specifically.
await p.goto(`${BASE}/results/wales`); await p.waitForTimeout(200)
const walesFlagSrc = await p.getByRole('img', { name: 'Flag of Wales' }).getAttribute('src')
check('Wales: uses GB-WLS.png specifically', walesFlagSrc === '/flags/GB-WLS.png')
check('Wales: no Scottish Gaelic text', (await p.getByText(/Scottish Gaelic/).count()) === 0)

// Ireland must be completely unaffected.
await p.goto(`${BASE}/results/ireland`); await p.waitForTimeout(200)
check('Ireland: heading unaffected', await p.getByRole('heading', { level: 1, name: 'Ireland' }).isVisible())
const irelandFlagSrc = await p.getByRole('img', { name: 'Flag of Ireland' }).getAttribute('src')
check('Ireland: flag unaffected (/flags/IE.png)', irelandFlagSrc === '/flags/IE.png')
check('Ireland: languages unaffected (Irish, English)', await p.getByText('Irish, English', { exact: true }).isVisible())

// United Kingdom stays non-playable, placeholder-only, with its own distinct GB flag.
await p.goto(`${BASE}/results/united-kingdom`); await p.waitForTimeout(200)
check('United Kingdom: still placeholder (Coming soon present)', (await p.getByText('Coming soon').count()) > 0)
const ukFlagSrc = await p.getByRole('img', { name: 'Flag of United Kingdom' }).getAttribute('src')
check('United Kingdom: flag is /flags/GB.png (distinct from ENG/SCT/WLS)', ukFlagSrc === '/flags/GB.png')

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
