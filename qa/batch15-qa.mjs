// Batch 15 (Syria..Tuvalu) verification: standalone /results/:slug pages,
// no completed game — checks placeholders, flags, population, currency
// (incl. Syria's post-2026 SYP), languages (incl. Taiwan's "No official
// language" fallback, exclusions for Tajikistan/Timor-Leste), Turkey's
// display name vs officialName, and Tonga's Unicode ʻokina, plus the
// no-other-country-populated guard.
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
  { slug: 'syria', name: 'Syria', flag: 'SY', capital: 'Damascus', pop: '26,472,497', currency: 'Syrian Pound (SYP) · £S', langs: 'Arabic' },
  { slug: 'taiwan', name: 'Taiwan', flag: 'TW', capital: 'Taipei', pop: '23,011,292', currency: 'New Taiwan Dollar (TWD) · NT$', langs: 'No official language' },
  { slug: 'tajikistan', name: 'Tajikistan', flag: 'TJ', capital: 'Dushanbe', pop: '10,978,599', currency: 'Tajikistani Somoni (TJS) · SM', langs: 'Tajik' },
  { slug: 'thailand', name: 'Thailand', flag: 'TH', capital: 'Bangkok', pop: '71,559,614', currency: 'Thai Baht (THB) · ฿', langs: 'Thai' },
  { slug: 'timor-leste', name: 'Timor-Leste', flag: 'TL', capital: 'Dili', pop: '1,436,923', currency: 'United States Dollar (USD) · $', langs: 'Portuguese, Tetum' },
  { slug: 'togo', name: 'Togo', flag: 'TG', capital: 'Lomé', pop: '9,930,918', currency: 'West African CFA Franc (XOF) · CFA', langs: 'French' },
  { slug: 'tonga', name: 'Tonga', flag: 'TO', capital: 'Nukuʻalofa', pop: '103,291', currency: 'Tongan Paʻanga (TOP) · T$', langs: 'Tongan, English' },
  { slug: 'tunisia', name: 'Tunisia', flag: 'TN', capital: 'Tunis', pop: '12,415,138', currency: 'Tunisian Dinar (TND) · DT', langs: 'Arabic' },
  { slug: 'turkey', name: 'Turkey', flag: 'TR', capital: 'Ankara', pop: '87,926,082', currency: 'Turkish Lira (TRY) · ₺', langs: 'Turkish' },
  { slug: 'tuvalu', name: 'Tuvalu', flag: 'TV', capital: 'Funafuti', pop: '9,362', currency: 'Australian Dollar (AUD) · $', langs: 'Tuvaluan, English' },
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

// Taiwan must never show Mandarin.
await p.goto(`${BASE}/results/taiwan`); await p.waitForTimeout(200)
check('Taiwan: no Mandarin text', (await p.getByText(/Mandarin/i).count()) === 0)

// Tajikistan must never show Russian.
await p.goto(`${BASE}/results/tajikistan`); await p.waitForTimeout(200)
check('Tajikistan: no Russian text', (await p.getByText(/Russian/i).count()) === 0)

// Timor-Leste must never show English/Indonesian.
await p.goto(`${BASE}/results/timor-leste`); await p.waitForTimeout(200)
check('Timor-Leste: no English/Indonesian text', (await p.getByText(/\bEnglish\b|Indonesian/i).count()) === 0)

// Turkey: heading must stay "Turkey", never "Türkiye" or "Republic of".
await p.goto(`${BASE}/results/turkey`); await p.waitForTimeout(200)
check('Turkey: no "Türkiye" or "Republic of" text anywhere', (await p.getByText(/Türkiye|Republic of/i).count()) === 0)

// Neighbouring alphabetical entries must remain untouched (placeholder path).
for (const slug of ['uganda', 'ukraine', 'uruguay']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
