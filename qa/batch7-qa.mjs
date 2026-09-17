// Batch 7 (Greece..India) verification: standalone /results/:slug pages,
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
  { slug: 'greece', name: 'Greece', flag: 'GR', capital: 'Athens', pop: '9,897,115', currency: 'Euro (EUR) · €', langs: 'Greek' },
  { slug: 'grenada', name: 'Grenada', flag: 'GD', capital: "Saint George's", pop: '117,362', currency: 'East Caribbean Dollar (XCD) · $', langs: 'English' },
  { slug: 'guatemala', name: 'Guatemala', flag: 'GT', capital: 'Guatemala City', pop: '18,967,978', currency: 'Guatemalan Quetzal (GTQ) · Q', langs: 'Spanish' },
  { slug: 'guinea', name: 'Guinea', flag: 'GN', capital: 'Conakry', pop: '15,441,993', currency: 'Guinean Franc (GNF) · FG', langs: 'French' },
  { slug: 'guyana', name: 'Guyana', flag: 'GY', capital: 'Georgetown', pop: '840,890', currency: 'Guyanese Dollar (GYD) · $', langs: 'English' },
  { slug: 'haiti', name: 'Haiti', flag: 'HT', capital: 'Port-au-Prince', pop: '12,037,506', currency: 'Haitian Gourde (HTG) · G', langs: 'Haitian Creole, French' },
  { slug: 'honduras', name: 'Honduras', flag: 'HN', capital: 'Tegucigalpa', pop: '11,184,760', currency: 'Honduran Lempira (HNL) · L', langs: 'Spanish' },
  { slug: 'hungary', name: 'Hungary', flag: 'HU', capital: 'Budapest', pop: '9,585,818', currency: 'Hungarian Forint (HUF) · Ft', langs: 'Hungarian' },
  { slug: 'iceland', name: 'Iceland', flag: 'IS', capital: 'Reykjavík', pop: '402,329', currency: 'Icelandic Króna (ISK) · kr', langs: 'Icelandic' },
  { slug: 'india', name: 'India', flag: 'IN', capital: 'New Delhi', pop: '1,476,625,576', currency: 'Indian Rupee (INR) · ₹', langs: 'Hindi, English' },
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

// India must not render the "national language" phrasing, nor the 22-language list.
await p.goto(`${BASE}/results/india`); await p.waitForTimeout(200)
check('India: no "national language" text', (await p.getByText(/national language/i).count()) === 0)
check('India: no scheduled-language names beyond Hindi/English (e.g. Bengali/Tamil absent)', (await p.getByText(/Bengali|Tamil|Telugu|Marathi/i).count()) === 0)

// Neighbouring alphabetical entries must remain untouched (placeholder path).
for (const slug of ['indonesia', 'iran', 'iraq']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
