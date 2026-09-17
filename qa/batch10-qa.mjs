// Batch 10 (Liberia..Malta) verification: standalone /results/:slug pages,
// no completed game — checks placeholders, flags, population, currency,
// languages (including Mali's full 13-language array), and that no country
// outside the supplied batch got accidentally populated.
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

const MALI_LANGS = 'Bambara, Bobo, Bozo, Dogon, Fula, Hassaniya Arabic, Kassonke, Maninka, Minyanka, Senufo, Songhay, Soninke, Tamasheq'

const cases = [
  { slug: 'liberia', name: 'Liberia', flag: 'LR', capital: 'Monrovia', pop: '5,853,949', currency: 'Liberian Dollar (LRD) · $', langs: 'English' },
  { slug: 'libya', name: 'Libya', flag: 'LY', capital: 'Tripoli', pop: '7,539,851', currency: 'Libyan Dinar (LYD) · ل.د', langs: 'Arabic' },
  { slug: 'lithuania', name: 'Lithuania', flag: 'LT', capital: 'Vilnius', pop: '2,797,338', currency: 'Euro (EUR) · €', langs: 'Lithuanian' },
  { slug: 'luxembourg', name: 'Luxembourg', flag: 'LU', capital: 'Luxembourg', pop: '687,448', currency: 'Euro (EUR) · €', langs: 'Luxembourgish, French, German' },
  { slug: 'madagascar', name: 'Madagascar', flag: 'MG', capital: 'Antananarivo', pop: '33,522,052', currency: 'Malagasy Ariary (MGA) · Ar', langs: 'Malagasy, French' },
  { slug: 'malawi', name: 'Malawi', flag: 'MW', capital: 'Lilongwe', pop: '22,785,535', currency: 'Malawian Kwacha (MWK) · MK', langs: 'English' },
  { slug: 'malaysia', name: 'Malaysia', flag: 'MY', capital: 'Kuala Lumpur', pop: '36,385,115', currency: 'Malaysian Ringgit (MYR) · RM', langs: 'Malay' },
  { slug: 'maldives', name: 'Maldives', flag: 'MV', capital: 'Malé', pop: '531,517', currency: 'Maldivian Rufiyaa (MVR) · Rf', langs: 'Dhivehi' },
  { slug: 'mali', name: 'Mali', flag: 'ML', capital: 'Bamako', pop: '25,932,275', currency: 'West African CFA Franc (XOF) · CFA', langs: MALI_LANGS },
  { slug: 'malta', name: 'Malta', flag: 'MT', capital: 'Valletta', pop: '549,011', currency: 'Euro (EUR) · €', langs: 'Maltese, English' },
]

for (const t of cases) {
  await p.goto(`${BASE}/results/${t.slug}`)
  await p.waitForTimeout(250)
  check(`${t.name}: heading`, await p.getByRole('heading', { level: 1, name: t.name }).isVisible())
  const flag = p.getByRole('img', { name: `Flag of ${t.name}` })
  check(`${t.name}: flag visible`, await flag.isVisible())
  check(`${t.name}: flag src`, (await flag.getAttribute('src')) === `/flags/${t.flag}.png`)
  check(`${t.name}: flag loaded`, await flag.evaluate((img) => img.complete && img.naturalWidth > 0))
  check(`${t.name}: no "Coming soon" placeholders`, (await p.getByText('Coming soon', { exact: true }).count()) === 0)
  check(`${t.name}: capital renders`, (await p.getByLabel(`${t.name} facts`).getByText(t.capital, { exact: true }).count()) > 0)
  check(`${t.name}: population renders exact formatted value`, await p.getByText(t.pop, { exact: true }).isVisible())
  check(`${t.name}: no year/estimate text anywhere`, (await p.getByText(/estimate as of|\b2026\b/i).count()) === 0)
  check(`${t.name}: currency renders`, await p.getByText(t.currency, { exact: true }).isVisible())
  check(`${t.name}: languages render`, await p.getByText(t.langs, { exact: true }).isVisible())
  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`${t.name}: no horizontal overflow`, noOverflow)
}

// Malawi must not render Chichewa; Mali must not render French as a language.
await p.goto(`${BASE}/results/malawi`); await p.waitForTimeout(200)
check('Malawi: no Chichewa text', (await p.getByText(/Chichewa/i).count()) === 0)
await p.goto(`${BASE}/results/mali`); await p.waitForTimeout(200)
check('Mali: no standalone "French" language chip (only appears inside Madagascar/Luxembourg pages, not here)', (await p.getByText(/^French$/).count()) === 0)
check('Mali: languages count is exactly 13 (comma-split)', (await p.locator('.country-result__fact').last().locator('dd').innerText()).split(', ').length === 13)

// Neighbouring alphabetical entries must remain untouched (placeholder path).
for (const slug of ['myanmar', 'namibia', 'nauru']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
