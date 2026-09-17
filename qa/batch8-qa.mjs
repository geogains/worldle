// Batch 8 (Indonesia..Jordan) verification: standalone /results/:slug pages,
// no completed game — checks placeholders, flags, population, currency,
// languages, and that no other country got accidentally populated.
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
  { slug: 'indonesia', name: 'Indonesia', flag: 'ID', capital: 'Jakarta', pop: '287,886,782', currency: 'Indonesian Rupiah (IDR) · Rp', langs: 'Indonesian' },
  { slug: 'iran', name: 'Iran', flag: 'IR', capital: 'Tehran', pop: '93,168,497', currency: 'Iranian Rial (IRR) · ﷼', langs: 'Persian' },
  { slug: 'iraq', name: 'Iraq', flag: 'IQ', capital: 'Baghdad', pop: '48,007,437', currency: 'Iraqi Dinar (IQD) · ع.د', langs: 'Arabic, Kurdish' },
  { slug: 'ireland', name: 'Ireland', flag: 'IE', capital: 'Dublin', pop: '5,356,950', currency: 'Euro (EUR) · €', langs: 'Irish, English' },
  { slug: 'israel', name: 'Israel', flag: 'IL', capital: 'Jerusalem', pop: '9,647,689', currency: 'Israeli New Shekel (ILS) · ₪', langs: 'Hebrew' },
  { slug: 'italy', name: 'Italy', flag: 'IT', capital: 'Rome', pop: '58,926,166', currency: 'Euro (EUR) · €', langs: 'Italian' },
  { slug: 'ivory-coast', name: 'Ivory Coast', flag: 'CI', capital: 'Yamoussoukro', pop: '33,494,346', currency: 'West African CFA Franc (XOF) · CFA', langs: 'French' },
  { slug: 'jamaica', name: 'Jamaica', flag: 'JM', capital: 'Kingston', pop: '2,833,403', currency: 'Jamaican Dollar (JMD) · $', langs: 'English' },
  { slug: 'japan', name: 'Japan', flag: 'JP', capital: 'Tokyo', pop: '122,427,731', currency: 'Japanese Yen (JPY) · ¥', langs: 'Japanese' },
  { slug: 'jordan', name: 'Jordan', flag: 'JO', capital: 'Amman', pop: '11,589,532', currency: 'Jordanian Dinar (JOD) · د.ا', langs: 'Arabic' },
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
  check(`${t.name}: capital renders`, await p.getByText(t.capital, { exact: true }).isVisible())
  check(`${t.name}: population renders exact formatted value`, await p.getByText(t.pop, { exact: true }).isVisible())
  check(`${t.name}: no year/estimate text anywhere`, (await p.getByText(/estimate as of|\b2026\b/i).count()) === 0)
  check(`${t.name}: currency renders`, await p.getByText(t.currency, { exact: true }).isVisible())
  check(`${t.name}: languages render`, await p.getByText(t.langs, { exact: true }).isVisible())
  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`${t.name}: no horizontal overflow`, noOverflow)
}

// Ivory Coast: heading/flag must use the gameplay display name, not the official name.
await p.goto(`${BASE}/results/ivory-coast`); await p.waitForTimeout(200)
check('Ivory Coast: no "Republic of" text in heading area', (await p.getByRole('heading', { level: 1, name: /Republic of/i }).count()) === 0)

// Neighbouring alphabetical entries must remain untouched (placeholder path).
for (const slug of ['kazakhstan', 'kenya', 'kiribati']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
