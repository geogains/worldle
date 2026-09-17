// Batch 11 (Myanmar..Norway) verification: standalone /results/:slug pages,
// no completed game — checks placeholders, flags, population, currency,
// languages (incl. Nauru's Yaren capital, New Zealand's English inclusion,
// Niger's exclusion of French/English), and that no country outside the
// supplied batch got accidentally populated.
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
  { slug: 'myanmar', name: 'Myanmar', flag: 'MM', capital: 'Naypyidaw', pop: '55,184,819', currency: 'Myanmar Kyat (MMK) · K', langs: 'Burmese' },
  { slug: 'namibia', name: 'Namibia', flag: 'NA', capital: 'Windhoek', pop: '3,153,246', currency: 'Namibian Dollar (NAD) · N$', langs: 'English' },
  { slug: 'nauru', name: 'Nauru', flag: 'NR', capital: 'Yaren', pop: '12,101', currency: 'Australian Dollar (AUD) · $', langs: 'Nauruan, English' },
  { slug: 'nepal', name: 'Nepal', flag: 'NP', capital: 'Kathmandu', pop: '29,629,410', currency: 'Nepalese Rupee (NPR) · रू', langs: 'Nepali' },
  { slug: 'new-zealand', name: 'New Zealand', flag: 'NZ', capital: 'Wellington', pop: '5,287,479', currency: 'New Zealand Dollar (NZD) · $', langs: 'English, Māori, New Zealand Sign Language' },
  { slug: 'nicaragua', name: 'Nicaragua', flag: 'NI', capital: 'Managua', pop: '7,097,329', currency: 'Nicaraguan Córdoba (NIO) · C$', langs: 'Spanish' },
  { slug: 'niger', name: 'Niger', flag: 'NE', capital: 'Niamey', pop: '28,814,878', currency: 'West African CFA Franc (XOF) · CFA', langs: 'Hausa' },
  { slug: 'nigeria', name: 'Nigeria', flag: 'NG', capital: 'Abuja', pop: '242,431,832', currency: 'Nigerian Naira (NGN) · ₦', langs: 'English' },
  { slug: 'north-korea', name: 'North Korea', flag: 'KP', capital: 'Pyongyang', pop: '26,633,691', currency: 'North Korean Won (KPW) · ₩', langs: 'Korean' },
  { slug: 'norway', name: 'Norway', flag: 'NO', capital: 'Oslo', pop: '5,652,989', currency: 'Norwegian Krone (NOK) · kr', langs: 'Norwegian' },
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

// Niger must not render French or English as a language.
await p.goto(`${BASE}/results/niger`); await p.waitForTimeout(200)
check('Niger: no French/English language text', (await p.getByText(/\b(French|English)\b/).count()) === 0)

// Neighbouring alphabetical entries must remain untouched (placeholder path).
for (const slug of ['oman', 'pakistan', 'palau']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
