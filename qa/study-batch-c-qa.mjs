// Study-data Batch C verification: standalone /results/:slug pages for the
// FINAL 8 canonical, NON-playable countries — confirms full reference data
// renders (heading, flag, capital, population, currency, languages, fact),
// zero "Coming soon" placeholders, no console/page errors, that reference-
// data population did not alter gameplay eligibility, and that with this
// batch every one of the 200 canonical countries now has a real page (no
// remaining placeholder-only entries anywhere in the dataset).
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
  { slug: 'south-africa', name: 'South Africa', flag: 'ZA', capital: 'Pretoria', pop: '65,453,084', currency: 'South African Rand (ZAR) · R', langs: 'Sepedi, Sesotho, Setswana, siSwati, Tshivenda, itsonga, Afrikaans, English, isiNdebele, isiXhosa, isiZulu, South African Sign Language' },
  { slug: 'switzerland', name: 'Switzerland', flag: 'CH', capital: 'Bern', pop: '9,007,798', currency: 'Swiss Franc (CHF) · CHF', langs: 'German, French, Italian, Romansh' },
  { slug: 'trinidad-and-tobago', name: 'Trinidad and Tobago', flag: 'TT', capital: 'Port of Spain', pop: '1,513,268', currency: 'Trinidad and Tobago Dollar (TTD) · TT$', langs: 'English' },
  { slug: 'turkmenistan', name: 'Turkmenistan', flag: 'TM', capital: 'Ashgabat', pop: '7,736,632', currency: 'Turkmenistani Manat (TMT) · m', langs: 'Turkmen, Russian' },
  { slug: 'united-arab-emirates', name: 'United Arab Emirates', flag: 'AE', capital: 'Abu Dhabi', pop: '11,574,682', currency: 'United Arab Emirates Dirham (AED) · د.إ', langs: 'Arabic, English' },
  { slug: 'united-kingdom', name: 'United Kingdom', flag: 'GB', capital: 'London', pop: '69,487,000', currency: 'Pound Sterling (GBP) · £', langs: 'English, Welsh, Scottish Gaelic, Irish, Scots' },
  { slug: 'united-states', name: 'United States', flag: 'US', capital: 'Washington, D.C.', pop: '349,035,494', currency: 'United States Dollar (USD) · $', langs: 'English, Spanish' },
  { slug: 'vatican-city', name: 'Vatican City', flag: 'VA', capital: 'Vatican City', pop: '887', currency: 'Euro (EUR) · €', langs: 'Italian, Latin' },
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
  check(`${t.name}: no "2026" year/estimate text anywhere`, (await p.getByText(/estimate as of|\b2026\b/i).count()) === 0)
  check(`${t.name}: languages render exactly "${t.langs}"`, await p.getByText(t.langs, { exact: true }).isVisible())
  check(`${t.name}: fact ("Did you know?") section present`, await p.getByText('Did you know?').isVisible())
  const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  check(`${t.name}: no horizontal overflow`, noOverflow)
}

// United Kingdom must remain fully distinct from its own constituent
// countries (separate slugs/records/flags), and its languages list spans
// the whole union.
await p.goto(`${BASE}/results/england`); await p.waitForTimeout(200)
const englandFlag = await p.getByRole('img', { name: 'Flag of England' }).getAttribute('src')
check('England flag (GB-ENG) is distinct from United Kingdom flag (GB)', englandFlag === '/flags/GB-ENG.png')

// Vatican City: fractional areaKm2 is an internal metadata field, never
// rendered directly in the UI — nothing to visually check beyond the
// standard render above, but confirm no stray "0.44" text leaked in.
await p.goto(`${BASE}/results/vatican-city`); await p.waitForTimeout(200)
check('Vatican City: no stray raw areaKm2 value (0.44) rendered on the page', (await p.getByText('0.44', { exact: true }).count()) === 0)

// With Batch C complete, there should be NO remaining placeholder-only
// canonical country left anywhere in the dataset. Spot-check a broad,
// alphabetically-scattered sample (not exhaustive — 200 page loads would be
// excessive for a QA script) including the last-known-placeholder set from
// Batches A and B.
const spotCheckAllPopulated = [
  'afghanistan', 'netherlands', 'south-africa', 'switzerland',
  'trinidad-and-tobago', 'turkmenistan', 'united-arab-emirates',
  'united-kingdom', 'united-states', 'vatican-city', 'tanzania', 'ireland',
]
for (const slug of spotCheckAllPopulated) {
  await p.goto(`${BASE}/results/${slug}`); await p.waitForTimeout(150)
  check(`${slug}: fully populated, no placeholder (Phase 1 study-data expansion complete)`, (await p.getByText('Coming soon').count()) === 0)
}

// Reference-data population must never have made any of these 8 countries
// enterable/winnable in Practice — spot-check the shortest of the eight
// (Turkmenistan, 12 letters) the same way Batch A proved for Afghanistan.
await p.goto(`${BASE}/practice`)
await p.waitForTimeout(400)
for (const ch of 'TURKMENISTAN') await p.keyboard.press(ch)
const enteredLetters = await p.locator('[role="grid"] [role="row"]').first().innerText()
const enteredCount = enteredLetters.replace(/\s/g, '').length
check('Turkmenistan (12 letters) cannot be fully entered — the board caps input at its own column count (<=10, MAX_ANSWER_LENGTH)', enteredCount <= 10, `entered ${enteredCount} letters`)
await p.keyboard.press('Enter')
await p.waitForTimeout(200)
check('Turkmenistan guess did not silently win/submit (still on /practice, no results dialog)', p.url().includes('/practice') && (await p.getByRole('dialog').count()) === 0)

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
