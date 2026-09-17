// Batch 9 (Kazakhstan..Lesotho) verification: standalone /results/:slug
// pages, no completed game — checks placeholders, flags, population,
// currency, languages, and that no other country got accidentally populated.
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
  { slug: 'kazakhstan', name: 'Kazakhstan', flag: 'KZ', capital: 'Astana', pop: '21,083,626', currency: 'Kazakhstani Tenge (KZT) · ₸', langs: 'Kazakh, Russian' },
  { slug: 'kenya', name: 'Kenya', flag: 'KE', capital: 'Nairobi', pop: '58,636,412', currency: 'Kenyan Shilling (KES) · KSh', langs: 'Kiswahili, English' },
  { slug: 'kiribati', name: 'Kiribati', flag: 'KI', capital: 'South Tarawa', pop: '138,445', currency: 'Australian Dollar (AUD) · $', langs: 'Gilbertese, English' },
  { slug: 'kosovo', name: 'Kosovo', flag: 'XK', capital: 'Pristina', pop: '1,798,188', currency: 'Euro (EUR) · €', langs: 'Albanian, Serbian' },
  { slug: 'kuwait', name: 'Kuwait', flag: 'KW', capital: 'Kuwait City', pop: '5,102,773', currency: 'Kuwaiti Dinar (KWD) · د.ك', langs: 'Arabic' },
  { slug: 'kyrgyzstan', name: 'Kyrgyzstan', flag: 'KG', capital: 'Bishkek', pop: '7,400,465', currency: 'Kyrgyzstani Som (KGS) · сом', langs: 'Kyrgyz, Russian' },
  { slug: 'laos', name: 'Laos', flag: 'LA', capital: 'Vientiane', pop: '7,974,017', currency: 'Lao Kip (LAK) · ₭', langs: 'Lao' },
  { slug: 'latvia', name: 'Latvia', flag: 'LV', capital: 'Riga', pop: '1,835,935', currency: 'Euro (EUR) · €', langs: 'Latvian' },
  { slug: 'lebanon', name: 'Lebanon', flag: 'LB', capital: 'Beirut', pop: '5,897,467', currency: 'Lebanese Pound (LBP) · ل.ل', langs: 'Arabic' },
  { slug: 'lesotho', name: 'Lesotho', flag: 'LS', capital: 'Maseru', pop: '2,389,336', currency: 'Lesotho Loti (LSL) · L', langs: 'Sesotho, English' },
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

// Kosovo must not render Turkish/Bosnian/Roma anywhere.
await p.goto(`${BASE}/results/kosovo`); await p.waitForTimeout(200)
check('Kosovo: no Turkish/Bosnian/Roma text', (await p.getByText(/Turkish|Bosnian|Roma/i).count()) === 0)

// Neighbouring alphabetical entries must remain untouched (placeholder path).
for (const slug of ['liberia', 'libya', 'lithuania']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present)`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
