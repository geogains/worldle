// Batch 12 (Oman..Qatar) verification: standalone /results/:slug pages, no
// completed game — checks placeholders, flags, population, currency,
// languages (incl. Palestine's ILS currency without a "Palestinian
// currency" claim, Palau's Ngerulmud capital, Peru's exclusion of
// Quechua/Aymara), and that no country outside the batch got populated.
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
  { slug: 'oman', name: 'Oman', flag: 'OM', capital: 'Muscat', pop: '5,671,458', currency: 'Omani Rial (OMR) · ر.ع.', langs: 'Arabic' },
  { slug: 'pakistan', name: 'Pakistan', flag: 'PK', capital: 'Islamabad', pop: '259,299,791', currency: 'Pakistani Rupee (PKR) · ₨', langs: 'Urdu, English' },
  { slug: 'palau', name: 'Palau', flag: 'PW', capital: 'Ngerulmud', pop: '17,614', currency: 'United States Dollar (USD) · $', langs: 'Palauan, English' },
  { slug: 'palestine', name: 'Palestine', flag: 'PS', capital: 'East Jerusalem', pop: '5,692,790', currency: 'Israeli New Shekel (ILS) · ₪', langs: 'Arabic' },
  { slug: 'panama', name: 'Panama', flag: 'PA', capital: 'Panama City', pop: '4,625,718', currency: 'Panamanian Balboa (PAB) · B/.', langs: 'Spanish' },
  { slug: 'paraguay', name: 'Paraguay', flag: 'PY', capital: 'Asunción', pop: '7,095,279', currency: 'Paraguayan Guaraní (PYG) · ₲', langs: 'Spanish, Guaraní' },
  { slug: 'peru', name: 'Peru', flag: 'PE', capital: 'Lima', pop: '34,922,148', currency: 'Peruvian Sol (PEN) · S/', langs: 'Spanish' },
  { slug: 'poland', name: 'Poland', flag: 'PL', capital: 'Warsaw', pop: '37,843,188', currency: 'Polish Złoty (PLN) · zł', langs: 'Polish' },
  { slug: 'portugal', name: 'Portugal', flag: 'PT', capital: 'Lisbon', pop: '10,395,362', currency: 'Euro (EUR) · €', langs: 'Portuguese' },
  { slug: 'qatar', name: 'Qatar', flag: 'QA', capital: 'Doha', pop: '3,173,559', currency: 'Qatari Riyal (QAR) · ر.ق', langs: 'Arabic' },
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

// Palestine must never claim ILS is a Palestinian national currency.
await p.goto(`${BASE}/results/palestine`); await p.waitForTimeout(200)
check('Palestine: no "Palestinian Shekel" text anywhere', (await p.getByText(/Palestinian.{0,3}[Ss]hekel/).count()) === 0)

// Peru must not render Quechua or Aymara.
await p.goto(`${BASE}/results/peru`); await p.waitForTimeout(200)
check('Peru: no Quechua/Aymara text', (await p.getByText(/Quechua|Aymara/i).count()) === 0)

// Neighbouring alphabetical entries must remain untouched (placeholder path).
for (const slug of ['romania', 'russia', 'rwanda']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
