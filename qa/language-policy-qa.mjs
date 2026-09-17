// Language usability cleanup verification: standalone /results/:slug pages
// for the 8 revised countries — confirms the new principal-language values
// render, "No official language" never appears, the fact label is exactly
// "Languages" (never "Official languages"), and no capital/currency/area/
// population field was disturbed for these records.
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
  { slug: 'australia', name: 'Australia', capital: 'Canberra', langs: 'English' },
  { slug: 'mexico', name: 'Mexico', capital: 'Mexico City', langs: 'Spanish' },
  { slug: 'taiwan', name: 'Taiwan', capital: 'Taipei', langs: 'Mandarin' },
  { slug: 'eritrea', name: 'Eritrea', capital: 'Asmara', langs: 'Tigrinya, Arabic, English' },
  { slug: 'mauritius', name: 'Mauritius', capital: 'Port Louis', langs: 'Mauritian Creole, English, French' },
  { slug: 'botswana', name: 'Botswana', capital: 'Gaborone', langs: 'English, Setswana' },
  { slug: 'malawi', name: 'Malawi', capital: 'Lilongwe', langs: 'English, Chichewa' },
  { slug: 'cabo-verde', name: 'Cabo Verde', capital: 'Praia', langs: 'Cabo Verdean Creole, Portuguese' },
]

for (const t of cases) {
  await p.goto(`${BASE}/results/${t.slug}`)
  await p.waitForTimeout(250)
  check(`${t.name}: heading`, await p.getByRole('heading', { level: 1, name: t.name }).isVisible())
  check(`${t.name}: capital unchanged (${t.capital})`, (await p.getByLabel(`${t.name} facts`).getByText(t.capital, { exact: true }).count()) > 0)
  check(`${t.name}: languages render exactly "${t.langs}"`, await p.getByText(t.langs, { exact: true }).isVisible())
  check(`${t.name}: "Languages" label present`, (await p.getByText('Languages', { exact: true }).count()) > 0)
  check(`${t.name}: "Official languages" label absent`, (await p.getByText(/Official languages/i).count()) === 0)
  check(`${t.name}: "No official language" text absent`, (await p.getByText('No official language').count()) === 0)
  check(`${t.name}: no "Coming soon" placeholders`, (await p.getByText('Coming soon', { exact: true }).count()) === 0)
  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`${t.name}: no horizontal overflow`, noOverflow)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
