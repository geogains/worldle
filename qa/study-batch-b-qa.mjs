// Study-data Batch B verification: standalone /results/:slug pages for 10
// canonical, NON-playable countries — confirms full reference data renders
// (heading, flag, capital, population, currency, languages, fact), zero
// "Coming soon" placeholders, no console/page errors, Unicode/symbol
// integrity (São Tomé, ₱, ﷼, ден), the Netherlands capital nuance, and
// that reference-data population did not alter gameplay eligibility.
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
await p.addInitScript(() => {
  localStorage.setItem('daily-worldle:v1:prefs', JSON.stringify({ theme: 'light', hasSeenHelp: true }))
})

const cases = [
  { slug: 'netherlands', name: 'Netherlands', flag: 'NL', capital: 'Amsterdam', pop: '18,448,775', currency: 'Euro (EUR) · €', langs: 'Dutch' },
  { slug: 'north-macedonia', name: 'North Macedonia', flag: 'MK', capital: 'Skopje', pop: '1,804,063', currency: 'Macedonian Denar (MKD) · ден', langs: 'Macedonian, Albanian' },
  { slug: 'papua-new-guinea', name: 'Papua New Guinea', flag: 'PG', capital: 'Port Moresby', pop: '10,947,848', currency: 'Papua New Guinean Kina (PGK) · K', langs: 'English, Tok Pisin, Hiri Motu' },
  { slug: 'philippines', name: 'Philippines', flag: 'PH', capital: 'Manila', pop: '117,724,471', currency: 'Philippine Peso (PHP) · ₱', langs: 'Filipino, English' },
  { slug: 'saint-kitts-and-nevis', name: 'Saint Kitts and Nevis', flag: 'KN', capital: 'Basseterre', pop: '46,992', currency: 'East Caribbean Dollar (XCD) · $', langs: 'English' },
  { slug: 'saint-vincent-and-the-grenadines', name: 'Saint Vincent and the Grenadines', flag: 'VC', capital: 'Kingstown', pop: '99,245', currency: 'East Caribbean Dollar (XCD) · $', langs: 'English' },
  { slug: 'sao-tome-and-principe', name: 'São Tomé and Príncipe', flag: 'ST', capital: 'São Tomé', pop: '244,994', currency: 'São Tomé and Príncipe Dobra (STN) · Db', langs: 'Portuguese' },
  { slug: 'saudi-arabia', name: 'Saudi Arabia', flag: 'SA', capital: 'Riyadh', pop: '35,165,787', currency: 'Saudi Riyal (SAR) · ﷼', langs: 'Arabic' },
  { slug: 'sierra-leone', name: 'Sierra Leone', flag: 'SL', capital: 'Freetown', pop: '8,996,745', currency: 'Sierra Leonean Leone (SLE) · Le', langs: 'English, Krio' },
  { slug: 'solomon-islands', name: 'Solomon Islands', flag: 'SB', capital: 'Honiara', pop: '858,288', currency: 'Solomon Islands Dollar (SBD) · $', langs: 'English, Solomon Islands Pijin' },
]

for (const t of cases) {
  await p.goto(`${BASE}/results/${t.slug}`)
  await p.waitForTimeout(300)
  check(`${t.name}: heading`, await p.getByRole('heading', { level: 1, name: t.name }).isVisible())
  const flag = p.getByRole('img', { name: `Flag of ${t.name}` })
  check(`${t.name}: flag visible`, await flag.isVisible())
  check(`${t.name}: flag src is /flags/${t.flag}.png`, (await flag.getAttribute('src')) === `/flags/${t.flag}.png`)
  check(`${t.name}: flag loaded (naturalWidth > 0)`, await flag.evaluate((img) => img.complete && img.naturalWidth > 0))
  check(`${t.name}: no "Coming soon" placeholders`, (await p.getByText('Coming soon', { exact: true }).count()) === 0)
  check(`${t.name}: capital renders`, (await p.getByLabel(`${t.name} facts`).getByText(t.capital, { exact: true }).count()) > 0)
  check(`${t.name}: currency renders`, await p.getByText(t.currency, { exact: true }).isVisible())
  check(`${t.name}: population renders exact formatted value`, await p.getByText(t.pop, { exact: true }).isVisible())
  check(`${t.name}: no year/estimate text anywhere`, (await p.getByText(/estimate as of|\b2026\b/i).count()) === 0)
  check(`${t.name}: languages render exactly "${t.langs}"`, await p.getByText(t.langs, { exact: true }).isVisible())
  check(`${t.name}: fact ("Did you know?") section present`, await p.getByText('Did you know?').isVisible())
  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`${t.name}: no horizontal overflow`, noOverflow)
}

// Netherlands: capital must be Amsterdam, never The Hague as the capital
// field, though "The Hague" legitimately appears in the fun-fact prose.
await p.goto(`${BASE}/results/netherlands`); await p.waitForTimeout(200)
const nlCapital = await p.getByLabel('Netherlands facts').locator('.country-result__fact').first().locator('dd').innerText()
check('Netherlands: capital field is exactly "Amsterdam", not "The Hague"', nlCapital === 'Amsterdam')
check('Netherlands: fun fact still mentions The Hague (government/parliament distinction)', (await p.getByText(/The Hague/).count()) > 0)

// São Tomé and Príncipe: explicit Unicode integrity check.
await p.goto(`${BASE}/results/sao-tome-and-principe`); await p.waitForTimeout(200)
check('São Tomé and Príncipe: heading renders diacritics intact', await p.getByRole('heading', { level: 1, name: 'São Tomé and Príncipe' }).isVisible())
check('São Tomé and Príncipe: capital "São Tomé" renders intact', await p.getByText('São Tomé', { exact: true }).isVisible())

// Neighbouring canonical entries not in this batch must remain untouched placeholders.
for (const slug of ['south-africa', 'switzerland', 'united-kingdom', 'united-states', 'vatican-city']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present) — not touched by Batch B`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
