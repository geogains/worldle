// Batch 13 (Romania..Singapore) verification: standalone /results/:slug
// pages, no completed game — checks placeholders, flags, population,
// currency, languages (incl. Rwanda's exclusion of Kiswahili/Swahili,
// San Marino's capital==name collision, Serbia/Kosovo distinctness), and
// that no country outside the supplied batch got accidentally populated.
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
  { slug: 'romania', name: 'Romania', flag: 'RO', capital: 'Bucharest', pop: '18,800,605', currency: 'Romanian Leu (RON) · lei', langs: 'Romanian' },
  { slug: 'russia', name: 'Russia', flag: 'RU', capital: 'Moscow', pop: '143,394,458', currency: 'Russian Ruble (RUB) · ₽', langs: 'Russian' },
  { slug: 'rwanda', name: 'Rwanda', flag: 'RW', capital: 'Kigali', pop: '14,889,693', currency: 'Rwandan Franc (RWF) · FRw', langs: 'Kinyarwanda, English, French' },
  { slug: 'saint-lucia', name: 'Saint Lucia', flag: 'LC', capital: 'Castries', pop: '180,488', currency: 'East Caribbean Dollar (XCD) · $', langs: 'English' },
  { slug: 'samoa', name: 'Samoa', flag: 'WS', capital: 'Apia', pop: '220,528', currency: 'Samoan Tala (WST) · T$', langs: 'Samoan, English' },
  { slug: 'san-marino', name: 'San Marino', flag: 'SM', capital: 'San Marino', pop: '33,605', currency: 'Euro (EUR) · €', langs: 'Italian' },
  { slug: 'senegal', name: 'Senegal', flag: 'SN', capital: 'Dakar', pop: '19,366,548', currency: 'West African CFA Franc (XOF) · CFA', langs: 'French' },
  { slug: 'serbia', name: 'Serbia', flag: 'RS', capital: 'Belgrade', pop: '6,641,964', currency: 'Serbian Dinar (RSD) · дин.', langs: 'Serbian' },
  { slug: 'seychelles', name: 'Seychelles', flag: 'SC', capital: 'Victoria', pop: '134,959', currency: 'Seychellois Rupee (SCR) · ₨', langs: 'Seychellois Creole, English, French' },
  { slug: 'singapore', name: 'Singapore', flag: 'SG', capital: 'Singapore', pop: '5,905,748', currency: 'Singapore Dollar (SGD) · $', langs: 'Malay, Mandarin, Tamil, English' },
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
  // Scoped to the facts <dl> (via its aria-label) rather than the whole
  // page, since San Marino and Singapore's capital text matches the
  // country/heading name too.
  check(`${t.name}: capital renders`, (await p.getByLabel(`${t.name} facts`).getByText(t.capital, { exact: true }).count()) > 0)
  check(`${t.name}: population renders exact formatted value`, await p.getByText(t.pop, { exact: true }).isVisible())
  check(`${t.name}: no year/estimate text anywhere`, (await p.getByText(/estimate as of|\b2026\b/i).count()) === 0)
  check(`${t.name}: currency renders`, await p.getByText(t.currency, { exact: true }).isVisible())
  check(`${t.name}: languages render`, await p.getByText(t.langs, { exact: true }).isVisible())
  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`${t.name}: no horizontal overflow`, noOverflow)
}

// Rwanda must never render Kiswahili/Swahili.
await p.goto(`${BASE}/results/rwanda`); await p.waitForTimeout(200)
check('Rwanda: no Kiswahili/Swahili text', (await p.getByText(/Kiswahili|Swahili/i).count()) === 0)

// Serbia and Kosovo must be fully distinct records (different flag, capital, area).
await p.goto(`${BASE}/results/serbia`); await p.waitForTimeout(200)
const serbiaFlag = await p.getByRole('img', { name: 'Flag of Serbia' }).getAttribute('src')
check('Serbia: flag is RS, not Kosovo\'s XK', serbiaFlag === '/flags/RS.png')
check('Serbia: no Pristina text (Kosovo\'s capital)', (await p.getByText('Pristina').count()) === 0)
await p.goto(`${BASE}/results/kosovo`); await p.waitForTimeout(200)
check('Kosovo: still renders its own Pristina capital, unaffected by Serbia', await p.getByText('Pristina').isVisible())
check('Kosovo: no Belgrade text (Serbia\'s capital)', (await p.getByText('Belgrade').count()) === 0)

// Neighbouring alphabetical entries must remain untouched (placeholder path).
for (const slug of ['slovakia', 'slovenia', 'somalia']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
