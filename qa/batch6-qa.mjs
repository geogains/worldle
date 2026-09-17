// Batch 6 (Eswatini..Ghana) verification: standalone /results/:slug pages,
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
  { slug: 'eswatini', name: 'Eswatini', flag: 'SZ', capital: 'Mbabane', pop: '1,269,859', currency: 'Swazi Lilangeni (SZL) · L', langs: 'siSwati, English' },
  { slug: 'ethiopia', name: 'Ethiopia', flag: 'ET', capital: 'Addis Ababa', pop: '138,902,185', currency: 'Ethiopian Birr (ETB) · Br', langs: 'Amharic' },
  { slug: 'fiji', name: 'Fiji', flag: 'FJ', capital: 'Suva', pop: '937,282', currency: 'Fijian Dollar (FJD) · $', langs: 'English, iTaukei, Hindi' },
  { slug: 'finland', name: 'Finland', flag: 'FI', capital: 'Helsinki', pop: '5,621,739', currency: 'Euro (EUR) · €', langs: 'Finnish, Swedish' },
  { slug: 'france', name: 'France', flag: 'FR', capital: 'Paris', pop: '66,746,401', currency: 'Euro (EUR) · €', langs: 'French' },
  { slug: 'gabon', name: 'Gabon', flag: 'GA', capital: 'Libreville', pop: '2,647,399', currency: 'Central African CFA Franc (XAF) · FCFA', langs: 'French' },
  { slug: 'gambia', name: 'Gambia', flag: 'GM', capital: 'Banjul', pop: '2,884,079', currency: 'Gambian Dalasi (GMD) · D', langs: 'English' },
  { slug: 'georgia', name: 'Georgia', flag: 'GE', capital: 'Tbilisi', pop: '3,804,642', currency: 'Georgian Lari (GEL) · ₾', langs: 'Georgian' },
  { slug: 'germany', name: 'Germany', flag: 'DE', capital: 'Berlin', pop: '83,644,258', currency: 'Euro (EUR) · €', langs: 'German' },
  { slug: 'ghana', name: 'Ghana', flag: 'GH', capital: 'Accra', pop: '35,697,557', currency: 'Ghanaian Cedi (GHS) · ₵', langs: 'English' },
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

// Georgia must not render Abkhazian anywhere.
await p.goto(`${BASE}/results/georgia`); await p.waitForTimeout(200)
check('Georgia: no Abkhazian text', (await p.getByText(/Abkhazian/i).count()) === 0)

// Neighbouring alphabetical entries must remain untouched (placeholder path).
for (const slug of ['greece', 'grenada', 'guatemala']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
