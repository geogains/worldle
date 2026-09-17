// Batch 16 (Mauritius..Mozambique) verification: standalone /results/:slug
// pages, no completed game — checks placeholders, flags, population,
// currency, languages (incl. Mauritius/Mexico's "No official language"
// fallback, Moldova's Unicode capital, Monaco's capital==name collision,
// Montenegro's full 5-language array), Mauritania's confirmed-unchanged
// placeholder status, and the no-other-country-populated guard.
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
  { slug: 'mauritius', name: 'Mauritius', flag: 'MU', capital: 'Port Louis', pop: '1,263,286', currency: 'Mauritian Rupee (MUR) · ₨', langs: 'No official language' },
  { slug: 'mexico', name: 'Mexico', flag: 'MX', capital: 'Mexico City', pop: '132,997,658', currency: 'Mexican Peso (MXN) · $', langs: 'No official language' },
  { slug: 'micronesia', name: 'Micronesia', flag: 'FM', capital: 'Palikir', pop: '114,183', currency: 'United States Dollar (USD) · $', langs: 'English' },
  { slug: 'moldova', name: 'Moldova', flag: 'MD', capital: 'Chișinău', pop: '2,965,504', currency: 'Moldovan Leu (MDL) · L', langs: 'Romanian' },
  { slug: 'monaco', name: 'Monaco', flag: 'MC', capital: 'Monaco', pop: '38,463', currency: 'Euro (EUR) · €', langs: 'French' },
  { slug: 'mongolia', name: 'Mongolia', flag: 'MN', capital: 'Ulaanbaatar', pop: '3,543,978', currency: 'Mongolian Tögrög (MNT) · ₮', langs: 'Mongolian' },
  { slug: 'montenegro', name: 'Montenegro', flag: 'ME', capital: 'Podgorica', pop: '627,859', currency: 'Euro (EUR) · €', langs: 'Montenegrin, Serbian, Bosnian, Albanian, Croatian' },
  { slug: 'morocco', name: 'Morocco', flag: 'MA', capital: 'Rabat', pop: '38,762,441', currency: 'Moroccan Dirham (MAD) · د.م.', langs: 'Arabic, Amazigh' },
  { slug: 'mozambique', name: 'Mozambique', flag: 'MZ', capital: 'Maputo', pop: '36,469,104', currency: 'Mozambican Metical (MZN) · MT', langs: 'Portuguese' },
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

// Mauritius must never show English/French/Mauritian Creole as a language.
await p.goto(`${BASE}/results/mauritius`); await p.waitForTimeout(200)
check('Mauritius: no Mauritian Creole text', (await p.getByText(/Mauritian Creole/i).count()) === 0)

// Mexico must never show Spanish as a language.
await p.goto(`${BASE}/results/mexico`); await p.waitForTimeout(200)
check('Mexico: no Spanish text', (await p.getByText(/\bSpanish\b/i).count()) === 0)

// Mauritania: confirmed still fully placeholder — no flag asset exists, so
// no record or COUNTRY_CODES mapping was added this batch.
await p.goto(`${BASE}/results/mauritania`); await p.waitForTimeout(200)
check('Mauritania: still placeholder (Coming soon present)', (await p.getByText('Coming soon').count()) > 0)
check('Mauritania: no flag image rendered (no mapped asset)', (await p.getByRole('img', { name: /Flag of Mauritania/i }).count()) === 0)

// Neighbouring alphabetical entries (post-M) must remain untouched placeholders.
for (const slug of ['uganda', 'ukraine', 'uruguay']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
