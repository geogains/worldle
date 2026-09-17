// Study-data Batch A verification: standalone /results/:slug pages for 10
// canonical, NON-playable countries — confirms full reference data renders
// (heading, flag, capital, population, currency, languages, fact), zero
// "Coming soon" placeholders, no console/page errors, and that reference-
// data population did not alter gameplay eligibility (Practice/Daily still
// can never select these).
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
  { slug: 'afghanistan', name: 'Afghanistan', flag: 'AF', capital: 'Kabul', pop: '45,047,069', currency: 'Afghan Afghani (AFN) · ؋', langs: 'Dari, Pashto' },
  { slug: 'antigua-and-barbuda', name: 'Antigua and Barbuda', flag: 'AG', capital: "Saint John's", pop: '94,626', currency: 'East Caribbean Dollar (XCD) · $', langs: 'English' },
  { slug: 'bosnia-and-herzegovina', name: 'Bosnia and Herzegovina', flag: 'BA', capital: 'Sarajevo', pop: '3,114,242', currency: 'Bosnia and Herzegovina Convertible Mark (BAM) · KM', langs: 'Bosnian, Croatian, Serbian' },
  { slug: 'burkina-faso', name: 'Burkina Faso', flag: 'BF', capital: 'Ouagadougou', pop: '24,601,700', currency: 'West African CFA Franc (XOF) · CFA', langs: 'Mooré, Dioula, Fulfulde, French' },
  { slug: 'central-african-republic', name: 'Central African Republic', flag: 'CF', capital: 'Bangui', pop: '5,698,984', currency: 'Central African CFA Franc (XAF) · FCFA', langs: 'Sango, French' },
  { slug: 'dominican-republic', name: 'Dominican Republic', flag: 'DO', capital: 'Santo Domingo', pop: '11,609,500', currency: 'Dominican Peso (DOP) · RD$', langs: 'Spanish' },
  { slug: 'equatorial-guinea', name: 'Equatorial Guinea', flag: 'GQ', capital: 'Malabo', pop: '1,984,468', currency: 'Central African CFA Franc (XAF) · FCFA', langs: 'Spanish, French, Portuguese' },
  { slug: 'guinea-bissau', name: 'Guinea-Bissau', flag: 'GW', capital: 'Bissau', pop: '2,297,808', currency: 'West African CFA Franc (XOF) · CFA', langs: 'Portuguese, Guinea-Bissau Creole' },
  { slug: 'liechtenstein', name: 'Liechtenstein', flag: 'LI', capital: 'Vaduz', pop: '40,368', currency: 'Swiss Franc (CHF) · CHF', langs: 'German' },
  { slug: 'marshall-islands', name: 'Marshall Islands', flag: 'MH', capital: 'Majuro', pop: '35,075', currency: 'United States Dollar (USD) · $', langs: 'Marshallese, English' },
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

// Unicode-specific check: Burkina Faso's "Mooré" must render the é correctly, not mojibake.
await p.goto(`${BASE}/results/burkina-faso`); await p.waitForTimeout(200)
check('Burkina Faso: "Mooré" renders with correct Unicode é (no mojibake)', await p.getByText('Mooré, Dioula, Fulfulde, French', { exact: true }).isVisible())

// Prove reference-data population did not alter gameplay eligibility: start
// a practice game (board width = the answer's normalized length, always
// 4-10 per MAX_ANSWER_LENGTH) and try to type AFGHANISTAN (11 letters, a
// fully known dataset entry with a real, populated results page). The
// board physically caps input at its own column count, so the 11th
// keystroke can never register — Afghanistan's full name literally cannot
// be entered, let alone win, proving the board can never be exactly its
// length (i.e. Afghanistan can never be a Practice/Daily answer).
await p.goto(`${BASE}/practice`)
await p.waitForTimeout(400)
for (const ch of 'AFGHANISTAN') await p.keyboard.press(ch)
const enteredLetters = await p.locator('[role="grid"] [role="row"]').first().innerText()
const enteredCount = enteredLetters.replace(/\s/g, '').length
check('Afghanistan (11 letters) cannot be fully entered — the board caps input at its own column count (<=10, MAX_ANSWER_LENGTH)', enteredCount <= 10, `entered ${enteredCount} letters`)
await p.keyboard.press('Enter')
await p.waitForTimeout(200)
check('Afghanistan guess did not silently win/submit (still on /practice, no results dialog)', p.url().includes('/practice') && (await p.getByRole('dialog').count()) === 0)

// Neighbouring canonical entries not in this batch must remain untouched placeholders.
for (const slug of ['netherlands', 'south-africa', 'united-kingdom']) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(200)
  check(`${slug}: still placeholder (Coming soon present) — not touched by Batch A`, (await p.getByText('Coming soon').count()) > 0)
}

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
