// Batch 14 (Slovakia..Sweden) verification: standalone /results/:slug
// pages, no completed game — checks placeholders, flags, population,
// currency, languages (incl. exclusion checks for Slovenia/Spain/Sri
// Lanka/Sweden's non-nationwide languages), and that no country outside
// the supplied batch got accidentally populated.
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

const cases = [
  { slug: 'slovakia', name: 'Slovakia', flag: 'SK', capital: 'Bratislava', pop: '5,451,342', currency: 'Euro (EUR) · €', langs: 'Slovak' },
  { slug: 'slovenia', name: 'Slovenia', flag: 'SI', capital: 'Ljubljana', pop: '2,114,573', currency: 'Euro (EUR) · €', langs: 'Slovenian' },
  { slug: 'somalia', name: 'Somalia', flag: 'SO', capital: 'Mogadishu', pop: '20,305,907', currency: 'Somali Shilling (SOS) · Sh.So.', langs: 'Somali, Arabic' },
  { slug: 'south-korea', name: 'South Korea', flag: 'KR', capital: 'Seoul', pop: '51,600,388', currency: 'South Korean Won (KRW) · ₩', langs: 'Korean' },
  { slug: 'south-sudan', name: 'South Sudan', flag: 'SS', capital: 'Juba', pop: '12,436,037', currency: 'South Sudanese Pound (SSP) · SS£', langs: 'English' },
  { slug: 'spain', name: 'Spain', flag: 'ES', capital: 'Madrid', pop: '47,850,793', currency: 'Euro (EUR) · €', langs: 'Spanish' },
  { slug: 'sri-lanka', name: 'Sri Lanka', flag: 'LK', capital: 'Sri Jayawardenepura Kotte', pop: '23,348,315', currency: 'Sri Lankan Rupee (LKR) · Rs', langs: 'Sinhala, Tamil' },
  { slug: 'sudan', name: 'Sudan', flag: 'SD', capital: 'Khartoum', pop: '53,282,719', currency: 'Sudanese Pound (SDG) · ج.س.', langs: 'Arabic, English' },
  { slug: 'suriname', name: 'Suriname', flag: 'SR', capital: 'Paramaribo', pop: '645,256', currency: 'Surinamese Dollar (SRD) · $', langs: 'Dutch' },
  { slug: 'sweden', name: 'Sweden', flag: 'SE', capital: 'Stockholm', pop: '10,701,047', currency: 'Swedish Krona (SEK) · kr', langs: 'Swedish' },
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

// Slovenia must not render Italian/Hungarian.
await p.goto(`${BASE}/results/slovenia`); await p.waitForTimeout(200)
check('Slovenia: no Italian/Hungarian text', (await p.getByText(/Italian|Hungarian/i).count()) === 0)

// Spain must not render territorially co-official languages.
await p.goto(`${BASE}/results/spain`); await p.waitForTimeout(200)
check('Spain: no Catalan/Basque/Galician/Valencian text', (await p.getByText(/Catalan|Basque|Galician|Valencian/i).count()) === 0)

// Sri Lanka must not render English as a language.
await p.goto(`${BASE}/results/sri-lanka`); await p.waitForTimeout(200)
check('Sri Lanka: no English text', (await p.getByText(/\bEnglish\b/).count()) === 0)

// Sweden must not render protected minority languages.
await p.goto(`${BASE}/results/sweden`); await p.waitForTimeout(200)
check('Sweden: no Finnish/Yiddish/Meänkieli/Romani Chib/Sami text', (await p.getByText(/Finnish|Yiddish|Meänkieli|Romani Chib|Sami/i).count()) === 0)

// Neighbouring alphabetical entries must remain untouched (placeholder path).
for (const slug of ['syria', 'taiwan', 'tajikistan']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
