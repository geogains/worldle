// Flag mapping data-population pass: representative sample from the task —
// standalone /results/:slug pages (no completed-game context needed) for
// correct flag, correct name, no broken image, facts (placeholder for every
// sample country except Tanzania, which is the populated country-data test
// case), light + dark, plus the one documented no-flag exception (Mauritania).
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
const errors = []
const failures = []
const prefs = (theme) => ({ 'daily-worldle:v1:prefs': JSON.stringify({ theme, hasSeenHelp: true }) })

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}
async function ctx(opts = {}, storage = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ...opts })
  const p = await c.newPage()
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`) })
  p.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
  await p.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v) }, storage)
  return { c, p }
}
async function shot(p, name) { await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name) }

const SAMPLE = [
  { slug: 'tanzania', name: 'Tanzania', code: 'TZ' },
  { slug: 'taiwan', name: 'Taiwan', code: 'TW' },
  { slug: 'japan', name: 'Japan', code: 'JP' },
  { slug: 'brazil', name: 'Brazil', code: 'BR' },
  { slug: 'costa-rica', name: 'Costa Rica', code: 'CR' },
  { slug: 'south-korea', name: 'South Korea', code: 'KR' },
  { slug: 'north-korea', name: 'North Korea', code: 'KP' },
  { slug: 'dr-congo', name: 'DR Congo', code: 'CD' },
  { slug: 'congo', name: 'Congo', code: 'CG' },
  { slug: 'palestine', name: 'Palestine', code: 'PS' },
  { slug: 'vatican-city', name: 'Vatican City', code: 'VA' },
  { slug: 'timor-leste', name: 'Timor-Leste', code: 'TL' },
]

for (const theme of ['light', 'dark']) {
  const { c, p } = await ctx({}, prefs(theme))
  for (const country of SAMPLE) {
    await p.goto(`${BASE}/results/${country.slug}`)
    await p.waitForTimeout(300)
    check(`${theme} ${country.slug}: no dialog (standalone page)`, (await p.getByRole('dialog').count()) === 0)
    const heading = p.getByRole('heading', { level: 1, name: country.name })
    check(`${theme} ${country.slug}: correct heading "${country.name}"`, await heading.isVisible())
    const flag = p.getByRole('img', { name: `Flag of ${country.name}` })
    check(`${theme} ${country.slug}: flag alt text`, await flag.isVisible())
    const src = await flag.getAttribute('src')
    check(`${theme} ${country.slug}: flag src is /flags/${country.code}.png`, src === `/flags/${country.code}.png`, src)
    const loaded = await flag.evaluate((img) => img.complete && img.naturalWidth > 0)
    check(`${theme} ${country.slug}: flag image actually loaded (not broken)`, loaded)
    const resp = await p.request.get(`${BASE}/flags/${country.code}.png`)
    check(`${theme} ${country.slug}: flag asset HTTP 200`, resp.status() === 200, `status ${resp.status()}`)
    const placeholders = await p.getByText('Coming soon', { exact: true }).count()
    if (country.slug === 'tanzania') {
      // Tanzania is the populated country-data-layer test case: real facts,
      // not placeholders.
      check('tanzania: no placeholder facts', placeholders === 0, `${placeholders}`)
      check('tanzania: real capital renders', await p.getByText('Dodoma').isVisible())
      check('tanzania: real fun fact renders', await p.getByText(/Mount Kilimanjaro/).isVisible())
    } else {
      check(`${theme} ${country.slug}: facts still "Coming soon" (5)`, placeholders === 5, `${placeholders}`)
      check(`${theme} ${country.slug}: fun fact still placeholder`, await p.getByText('Country fact coming soon.').isVisible())
    }
  }
  await shot(p, `flagmap-${theme}-vatican-city`)
  await c.close()
}

// Mauritania: the one documented exception — neutral placeholder frame, not a broken image.
{
  const { c, p } = await ctx({}, prefs('light'))
  await p.goto(`${BASE}/results/mauritania`); await p.waitForTimeout(300)
  check('mauritania: correct heading', await p.getByRole('heading', { level: 1, name: 'Mauritania' }).isVisible())
  check('mauritania: no flag <img> in the result card', (await p.locator('.country-result').getByRole('img').count()) === 0)
  check('mauritania: neutral flag-placeholder frame present', await p.locator('.country-result__flag-placeholder').isVisible())
  check('mauritania: facts still placeholders', (await p.getByText('Coming soon', { exact: true }).count()) === 5)
  await shot(p, 'flagmap-mauritania-neutral-frame')
  await c.close()
}

// Spot-check a non-Latin-script name (Taiwan) round-trips through the alt text correctly in dark mode.
{
  const { c, p } = await ctx({}, prefs('dark'))
  await p.goto(`${BASE}/results/taiwan`); await p.waitForTimeout(300)
  await shot(p, 'flagmap-dark-taiwan')
  await c.close()
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
