// Batch 17 (Uganda..Zimbabwe, the final normal batch) verification:
// standalone /results/:slug pages, no completed game — checks
// placeholders, flags, population, currency, languages (incl. Ukraine's
// exclusion of Russian, Uzbekistan's Unicode soʻm, Vietnam's Unicode Đồng,
// Zimbabwe's full 16-language array), and confirms Mauritania remains the
// sole unpopulated playable country.
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

const ZIMBABWE_LANGS = 'Chewa, Chibarwe, English, Kalanga, Koisan, Nambya, Ndau, Ndebele, Shangani, Shona, Sign Language, Sotho, Tonga, Tswana, Venda, Xhosa'

const cases = [
  { slug: 'uganda', name: 'Uganda', flag: 'UG', capital: 'Kampala', pop: '52,761,469', currency: 'Ugandan Shilling (UGX) · USh', langs: 'English, Swahili' },
  { slug: 'ukraine', name: 'Ukraine', flag: 'UA', capital: 'Kyiv', pop: '39,535,849', currency: 'Ukrainian Hryvnia (UAH) · ₴', langs: 'Ukrainian' },
  { slug: 'uruguay', name: 'Uruguay', flag: 'UY', capital: 'Montevideo', pop: '3,382,537', currency: 'Uruguayan Peso (UYU) · $', langs: 'Spanish' },
  { slug: 'uzbekistan', name: 'Uzbekistan', flag: 'UZ', capital: 'Tashkent', pop: '37,724,223', currency: 'Uzbekistani Som (UZS) · soʻm', langs: 'Uzbek' },
  { slug: 'vanuatu', name: 'Vanuatu', flag: 'VU', capital: 'Port Vila', pop: '342,564', currency: 'Vanuatu Vatu (VUV) · VT', langs: 'Bislama, English, French' },
  { slug: 'venezuela', name: 'Venezuela', flag: 'VE', capital: 'Caracas', pop: '28,633,711', currency: 'Venezuelan Bolívar (VES) · Bs.', langs: 'Spanish' },
  { slug: 'vietnam', name: 'Vietnam', flag: 'VN', capital: 'Hanoi', pop: '102,177,431', currency: 'Vietnamese Đồng (VND) · ₫', langs: 'Vietnamese' },
  { slug: 'yemen', name: 'Yemen', flag: 'YE', capital: "Sana'a", pop: '42,961,653', currency: 'Yemeni Rial (YER) · ﷼', langs: 'Arabic' },
  { slug: 'zambia', name: 'Zambia', flag: 'ZM', capital: 'Lusaka', pop: '22,521,915', currency: 'Zambian Kwacha (ZMW) · ZK', langs: 'English' },
  { slug: 'zimbabwe', name: 'Zimbabwe', flag: 'ZW', capital: 'Harare', pop: '17,273,580', currency: 'Zimbabwe Gold (ZWG) · ZiG', langs: ZIMBABWE_LANGS },
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

// Ukraine must never render Russian.
await p.goto(`${BASE}/results/ukraine`); await p.waitForTimeout(200)
check('Ukraine: no Russian text', (await p.getByText(/Russian/i).count()) === 0)

// Zimbabwe: exact 16-language count check.
await p.goto(`${BASE}/results/zimbabwe`); await p.waitForTimeout(200)
const zwLangsText = await p.getByLabel('Zimbabwe facts').locator('.country-result__fact').last().locator('dd').innerText()
check('Zimbabwe: exactly 16 languages, comma-split, no truncation/reordering', zwLangsText.split(', ').length === 16 && zwLangsText === ZIMBABWE_LANGS, zwLangsText)

// Mauritania: confirmed still the sole unpopulated playable country.
await p.goto(`${BASE}/results/mauritania`); await p.waitForTimeout(200)
check('Mauritania: still placeholder (Coming soon present)', (await p.getByText('Coming soon').count()) > 0)
check('Mauritania: no flag image rendered (no mapped asset)', (await p.getByRole('img', { name: /Flag of Mauritania/i }).count()) === 0)

await browser.close()
console.log('\nCONSOLE/PAGE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
console.log('FAILURES:', failures.length ? '\n' + failures.join('\n') : 'none')
if (errors.length || failures.length) process.exitCode = 1
