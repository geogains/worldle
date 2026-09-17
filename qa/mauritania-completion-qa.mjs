// Mauritania completion verification: standalone /results/mauritania page,
// no completed game — checks the flag loads, no placeholders, exact
// capital/currency/language/population rendering, and (since MR.png does
// not follow the project's documented 512x512 flag-asset convention) a
// visual check that the odd-dimension asset still renders inside the
// square flag frame without overflow or obvious clipping.
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

await p.goto(`${BASE}/results/mauritania`)
await p.waitForTimeout(300)

check('Mauritania: heading', await p.getByRole('heading', { level: 1, name: 'Mauritania' }).isVisible())
const flag = p.getByRole('img', { name: 'Flag of Mauritania' })
check('Mauritania: flag visible', await flag.isVisible())
check('Mauritania: flag src is /flags/MR.png', (await flag.getAttribute('src')) === '/flags/MR.png')
check('Mauritania: flag loaded (naturalWidth > 0)', await flag.evaluate((img) => img.complete && img.naturalWidth > 0))
const box = await flag.boundingBox()
check('Mauritania: flag rendered within a reasonable frame size (not blown up/broken)', box && box.width > 0 && box.width <= 140, `${box?.width}px wide`)
check('Mauritania: no "Coming soon" placeholders', (await p.getByText('Coming soon', { exact: true }).count()) === 0)
check('Mauritania: capital renders (Nouakchott)', (await p.getByLabel('Mauritania facts').getByText('Nouakchott', { exact: true }).count()) > 0)
check('Mauritania: currency renders (Mauritanian Ouguiya (MRU) · UM)', await p.getByText('Mauritanian Ouguiya (MRU) · UM', { exact: true }).isVisible())
check('Mauritania: languages render (Arabic only)', await p.getByText('Arabic', { exact: true }).isVisible())
check('Mauritania: no Pulaar/Soninke/Wolof text', (await p.getByText(/Pulaar|Soninke|Wolof/i).count()) === 0)
check('Mauritania: population renders exact formatted value (5,484,612)', await p.getByText('5,484,612', { exact: true }).isVisible())
check('Mauritania: no year/estimate text anywhere', (await p.getByText(/estimate as of|\b2026\b/i).count()) === 0)
const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
check('Mauritania: no horizontal overflow (odd flag-asset aspect ratio does not break layout)', noOverflow)

// Visual record of the flag rendering (given the asset's non-standard 1323x1189 dimensions vs the documented 512x512 convention).
await p.screenshot({ path: new URL('./screenshots/mauritania-completion.png', import.meta.url).pathname })
console.log('shot mauritania-completion')

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
