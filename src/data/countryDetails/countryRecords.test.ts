import { describe, expect, it } from 'vitest'
import { ANSWER_POOL, COUNTRIES, findCountryById, isEligibleAnswer } from '../countries'
import { countryCodeForSlug, flagUrlForCode } from './flags'
import {
  COUNTRY_RECORDS,
  formatCurrency,
  formatPopulation,
  formatPopulationNote,
  getCountryRecord,
  type CountryRecord,
} from './countryRecords'

// Batch 1, playable-answer subset, + Tanzania. Every slug here must resolve
// through getCountryRecord(); the exact-membership test below is the single
// place that needs updating when a future batch is added.
//
// Afghanistan (11 letters) and Antigua and Barbuda (17 letters) were part of
// the ORIGINAL Batch 1 submission but removed AT THE TIME: both are valid
// gameplay *guesses* and keep their canonical dataset entry and flag
// mapping, but neither can ever be selected as a daily/practice *answer*
// (normalized length outside 4-10 — see isEligibleAnswer, data/countries.ts).
// Under the since-obsoleted "playable-only" policy, a results-data record
// for either was considered unreachable dead data — that policy has been
// reversed for the Study feature (see the module comment in
// countryRecords.ts), and both are now populated for real in
// STUDY_BATCH_A_SLUGS below, alongside 8 other non-playable canonical
// countries. See the dedicated "Study-data Batch A" describe block further
// down, and the invariant tests below (which no longer require every
// COUNTRY_RECORDS key to be answer-eligible).
const BATCH_1_SLUGS = [
  'albania', 'algeria', 'andorra', 'angola',
  'argentina', 'armenia', 'australia', 'austria',
] as const
// Batch 2 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding, so no eligibility removals were needed this time.
const BATCH_2_SLUGS = [
  'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados',
  'belarus', 'belgium', 'belize', 'benin', 'bhutan',
] as const
// Batch 3 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Bolivia carries an unusually long (37-entry) official-languages
// array — deliberately preserved in full, not shortened.
const BATCH_3_SLUGS = [
  'bolivia', 'botswana', 'brazil', 'brunei', 'bulgaria',
  'burundi', 'cabo-verde', 'cambodia', 'cameroon', 'canada',
] as const
// Batch 4 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. "congo" is the Republic of the Congo (CG/COG) — DR Congo is a
// distinct, still-unpopulated slug ("dr-congo") and must not be confused
// with it.
const BATCH_4_SLUGS = [
  'chad', 'chile', 'china', 'colombia', 'comoros',
  'congo', 'costa-rica', 'croatia', 'cuba', 'cyprus',
] as const
// Batch 5 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. "dr-congo" is the Democratic Republic of the Congo (CD/COD) —
// distinct from "congo" (Republic of the Congo, CG/COG, Batch 4). Eritrea
// has an empty `languages` array (no de jure official language), same
// deliberate meaning as Australia's.
const BATCH_5_SLUGS = [
  'czechia', 'denmark', 'djibouti', 'dominica', 'dr-congo',
  'ecuador', 'egypt', 'el-salvador', 'eritrea', 'estonia',
] as const
// Batch 6 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Eswatini deliberately carries two national official languages
// (siSwati, English); Finland deliberately carries two (Finnish, Swedish).
// Georgia carries only Georgian — Abkhazian's co-official status is
// territorial (Abkhazia only), not nationwide, so it is not listed here.
const BATCH_6_SLUGS = [
  'eswatini', 'ethiopia', 'fiji', 'finland', 'france',
  'gabon', 'gambia', 'georgia', 'germany', 'ghana',
] as const
// Batch 7 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Guatemala lists Spanish only; Guyana lists English only (Guyanese
// Creolese is widely spoken but not treated as official in this schema);
// Haiti deliberately carries two (Haitian Creole, French); India carries
// exactly Hindi and English — not the full 22-language Eighth Schedule, and
// Hindi is not labelled a "national language" (India has none by law).
const BATCH_7_SLUGS = [
  'greece', 'grenada', 'guatemala', 'guinea', 'guyana',
  'haiti', 'honduras', 'hungary', 'iceland', 'india',
] as const
// Batch 8 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Iraq carries exactly Arabic and Kurdish (its two nationwide
// official languages — Turkmen/Syriac/Armenian are official only in
// specific administrative units, not nationwide); Ireland carries Irish
// then English, in that order; Israel carries Hebrew only (Arabic's special
// status under current Israeli Basic Law is not equal statewide official
// status in this schema); Jamaica and Jordan each list a single official
// language (English, Arabic respectively) despite other widely-used
// languages. "ivory-coast" keeps its gameplay display name "Ivory Coast"
// with officialName "Republic of Côte d'Ivoire" — same pattern as
// "congo"/"dr-congo".
const BATCH_8_SLUGS = [
  'indonesia', 'iran', 'iraq', 'ireland', 'israel',
  'italy', 'ivory-coast', 'jamaica', 'japan', 'jordan',
] as const
// Batch 9 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Kazakhstan, Kenya, Kiribati, Kosovo, Kyrgyzstan and Lesotho each
// carry two nationwide official languages, in the supplied order; Kuwait,
// Laos, Latvia and Lebanon each list one (Lebanon: Arabic only — French has
// legally permitted uses but is not co-equal official status here). Kosovo
// uses the project's existing non-ISO XK/XKS convention (see COUNTRY_CODES
// in flags.ts) and its population figure is UN WPP-derived rather than the
// Worldometer table used for most other records — preserved exactly as
// supplied either way.
const BATCH_9_SLUGS = [
  'kazakhstan', 'kenya', 'kiribati', 'kosovo', 'kuwait',
  'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho',
] as const
// Batch 10 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Luxembourg preserves all three official languages in order
// (Luxembourgish, French, German); Malawi lists English only (Chichewa is
// the common language, not official, per the Malawi government); Malaysia
// lists Malay only (not English/Mandarin/Tamil). Mali is the notable
// edge case: under its 2023 constitution its 13 national languages became
// official and French became a working language only, so Mali's array is
// the full 13 national languages with French deliberately excluded.
const BATCH_10_SLUGS = [
  'liberia', 'libya', 'lithuania', 'luxembourg', 'madagascar',
  'malawi', 'malaysia', 'maldives', 'mali', 'malta',
] as const
const MALI_LANGUAGES = [
  'Bambara', 'Bobo', 'Bozo', 'Dogon', 'Fula', 'Hassaniya Arabic', 'Kassonke',
  'Maninka', 'Minyanka', 'Senufo', 'Songhay', 'Soninke', 'Tamasheq',
] as const
// Batch 11 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Two current-law edge cases: New Zealand's English became
// statutorily official under the English Language Act 2026 (in force
// August 2026), so it is listed as official rather than merely de facto,
// alongside Māori and New Zealand Sign Language; Niger's 2025 Charter of
// Refoundation makes Hausa the sole national/official language, demoting
// French and English to working languages, so neither is listed. Nauru's
// capital is preserved as "Yaren" (the administrative centre/Parliament
// location) rather than converted to a placeholder, despite Nauru having
// no officially designated capital.
const BATCH_11_SLUGS = [
  'myanmar', 'namibia', 'nauru', 'nepal', 'new-zealand',
  'nicaragua', 'niger', 'nigeria', 'north-korea', 'norway',
] as const
// Batch 12 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Palestine is the notable edge case: it issues no national
// currency, so its currency object is the Israeli New Shekel (the
// principal currency actually used there for everyday/official
// transactions) — not documented anywhere as a Palestinian national
// currency — and its capital is preserved as the supplied "East Jerusalem"
// display value, with no political commentary added.
const BATCH_12_SLUGS = [
  'oman', 'pakistan', 'palau', 'palestine', 'panama',
  'paraguay', 'peru', 'poland', 'portugal', 'qatar',
] as const
// Batch 13 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Rwanda's three official languages follow its 2023 constitution
// and deliberately exclude Kiswahili/Swahili; "serbia" and "kosovo" are
// distinct pre-existing records with their own iso codes, capitals and
// areaKm2 — Serbia's supplied area (77_474) is preserved exactly, with no
// Kosovo-area (10_887) addition; "san-marino" shares its capital's name
// with the country itself (same pattern as Luxembourg, Batch 10).
const BATCH_13_SLUGS = [
  'romania', 'russia', 'rwanda', 'saint-lucia', 'samoa',
  'san-marino', 'senegal', 'serbia', 'seychelles', 'singapore',
] as const
// Batch 14 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Several nationwide fields deliberately exclude territorially or
// minority co-official languages: Slovenia excludes Italian/Hungarian
// (minority-area-only status), Spain excludes Catalan/Basque/Galician/
// Valencian (co-official only in their autonomous communities), Sweden
// excludes Finnish/Yiddish/Meänkieli/Romani Chib/Sami (protected national
// minority languages), and Sri Lanka excludes English (the constitutional
// link language, not an official language in the same classification).
const BATCH_14_SLUGS = [
  'slovakia', 'slovenia', 'somalia', 'south-korea', 'south-sudan',
  'spain', 'sri-lanka', 'sudan', 'suriname', 'sweden',
] as const
// Batch 15 (this task): all 10 pre-verified as ANSWER_POOL members before
// adding. Syria's currency represents the post-1-January-2026
// redenominated Syrian pound, still coded SYP; Taiwan carries `languages:
// []` (same deliberate meaning as Australia/Eritrea — equal legal status
// for multiple national languages, not one statutory official language,
// so Mandarin is not inserted); Tajikistan excludes Russian; Timor-Leste
// excludes English/Indonesian; "turkey" keeps its gameplay display name
// while officialName is "Republic of Türkiye" (same pattern as
// "ivory-coast"); Tonga preserves the Unicode ʻokina in its capital and
// currency name.
const BATCH_15_SLUGS = [
  'syria', 'taiwan', 'tajikistan', 'thailand', 'timor-leste',
  'togo', 'tonga', 'tunisia', 'turkey', 'tuvalu',
] as const
// Batch 16 (this task): 9 of the 10 supplied countries were pre-verified as
// ANSWER_POOL members and added. "mauritania" was deliberately EXCLUDED at
// the time — the task supplied a full record for it, but public/flags/
// MR.png did not exist yet (verified by directory listing), so it stayed
// unmapped rather than getting a fabricated flag path. It was completed in
// its own follow-up once a real MR.png was added — see MAURITANIA_SLUG
// below. Mauritius and Mexico both carry `languages: []` (same deliberate
// meaning as Australia/Eritrea/Taiwan — Mexico's Indigenous languages and
// Spanish are national, not sole statutory official, languages, so
// Spanish is not auto-inserted).
const BATCH_16_SLUGS = [
  'mauritius', 'mexico', 'micronesia', 'moldova', 'monaco',
  'mongolia', 'montenegro', 'morocco', 'mozambique',
] as const
// Batch 17 is the final normal batch — all 10 pre-verified as ANSWER_POOL
// members before adding. Zimbabwe's currency (Zimbabwe Gold, ZWG, symbol
// ZiG) was checked against the rest of the project for a contradictory
// older-dataset assumption (e.g. the pre-2024 Zimbabwe dollar); none
// exists anywhere in the codebase, so it is used as supplied. Zimbabwe's
// 16 official languages are preserved in full, in order.
const ZIMBABWE_LANGUAGES = [
  'Chewa', 'Chibarwe', 'English', 'Kalanga', 'Koisan', 'Nambya', 'Ndau', 'Ndebele',
  'Shangani', 'Shona', 'Sign Language', 'Sotho', 'Tonga', 'Tswana', 'Venda', 'Xhosa',
] as const
const BATCH_17_SLUGS = [
  'uganda', 'ukraine', 'uruguay', 'uzbekistan', 'vanuatu',
  'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe',
] as const
// Mauritania completion (this task): the sole gap left after Batch 17. A
// real public/flags/MR.png was added, so mauritania -> MR is now mapped in
// flags.ts and this record uses the same data originally supplied for
// Batch 16, unchanged. With this, every one of the 169 ANSWER_POOL
// countries has a COUNTRY_RECORDS entry.
const MAURITANIA_SLUG = 'mauritania' as const

// England, Scotland and Wales (this task): constituent countries of the
// United Kingdom added to the gameplay dataset with complete
// COUNTRY_RECORDS from the moment they became playable — not placeholders.
// Their iso2/iso3 are omitted (no fake sovereign ISO code invented); their
// flags use real ISO 3166-2 subdivision codes (GB-ENG/GB-SCT/GB-WLS), never
// the United Kingdom's own GB code. Population figures are the latest
// available UK-statistical-source mid-year estimates (mid-2025, asOf 2025).
const UK_CONSTITUENT_SLUGS = ['england', 'scotland', 'wales'] as const

// Study-data Batch A (this task): the first 10 of 28 canonical, NON-playable
// countries (normalized name over MAX_ANSWER_LENGTH) to get a complete
// COUNTRY_RECORDS entry, under the revised "complete reference dataset"
// policy (see the module comment in countryRecords.ts). Afghanistan and
// Antigua and Barbuda are the same two countries originally removed from
// Batch 1 for being non-playable — they're back for real. 18 canonical
// countries remain unpopulated after this batch (Study-data Batches B/C).
const STUDY_BATCH_A_SLUGS = [
  'afghanistan', 'antigua-and-barbuda', 'bosnia-and-herzegovina', 'burkina-faso',
  'central-african-republic', 'dominican-republic', 'equatorial-guinea',
  'guinea-bissau', 'liechtenstein', 'marshall-islands',
] as const

// Study-data Batch B (this task): continues the non-playable expansion.
// Netherlands' capital is preserved exactly as the constitutional capital,
// Amsterdam — not replaced with The Hague (seat of government/parliament).
// 8 canonical countries remain unpopulated after this batch (Study-data
// Batch C).
const STUDY_BATCH_B_SLUGS = [
  'netherlands', 'north-macedonia', 'papua-new-guinea', 'philippines',
  'saint-kitts-and-nevis', 'saint-vincent-and-the-grenadines',
  'sao-tome-and-principe', 'saudi-arabia', 'sierra-leone', 'solomon-islands',
] as const

// Study-data Batch C (this task): the FINAL 8 of 28 non-playable canonical
// countries to get a complete COUNTRY_RECORDS entry. With this batch, every
// one of the 200 canonical COUNTRIES entries has a record — invariant 3 is
// now globally satisfied (see the "tracks progress toward invariant 3" test
// below, which now asserts completion rather than partial progress).
const STUDY_BATCH_C_SLUGS = [
  'south-africa', 'switzerland', 'trinidad-and-tobago', 'turkmenistan',
  'united-arab-emirates', 'united-kingdom', 'united-states', 'vatican-city',
] as const

// LANGUAGE POLICY REVISION (semantic-audit follow-up, after Batch 17 and the
// Mauritania completion): `languages` now means "principal languages useful
// to a geography learner," not "statutory official languages only" — see
// the field's own doc comment in countryRecords.ts. As a direct result,
// Australia, Eritrea, Taiwan, Mauritius and Mexico no longer have
// `languages: []`, and Botswana, Malawi and Cabo Verde gained an
// additional de facto/national language. Batch-log comments above that
// describe the pre-revision values (e.g. "Malawi lists English only")
// describe what was true when each batch was written, not the current
// data — see the dedicated tests further down for the current values.
const POPULATED_SLUGS = [
  ...BATCH_1_SLUGS, ...BATCH_2_SLUGS, ...BATCH_3_SLUGS, ...BATCH_4_SLUGS, ...BATCH_5_SLUGS, ...BATCH_6_SLUGS,
  ...BATCH_7_SLUGS, ...BATCH_8_SLUGS, ...BATCH_9_SLUGS, ...BATCH_10_SLUGS, ...BATCH_11_SLUGS, ...BATCH_12_SLUGS,
  ...BATCH_13_SLUGS, ...BATCH_14_SLUGS, ...BATCH_15_SLUGS, ...BATCH_16_SLUGS, ...BATCH_17_SLUGS,
  MAURITANIA_SLUG,
  ...UK_CONSTITUENT_SLUGS,
  ...STUDY_BATCH_A_SLUGS,
  ...STUDY_BATCH_B_SLUGS,
  ...STUDY_BATCH_C_SLUGS,
  'tanzania',
]

describe('getCountryRecord', () => {
  it('looks up the Tanzania test case by slug', () => {
    const record = getCountryRecord('tanzania')
    expect(record).toEqual({
      name: 'Tanzania',
      officialName: 'United Republic of Tanzania',
      iso2: 'TZ',
      iso3: 'TZA',
      capital: 'Dodoma',
      currency: { name: 'Tanzanian Shilling', code: 'TZS', symbol: 'TSh' },
      population: { value: 68_600_000, asOf: 2026 },
      continent: 'Africa',
      languages: ['Swahili', 'English'],
      areaKm2: 947_303,
      flag: '/flags/TZ.png',
      fact: 'Tanzania is home to Mount Kilimanjaro, the highest mountain in Africa.',
    })
  })

  it('preserves currency.name, currency.code and currency.symbol', () => {
    const record = getCountryRecord('tanzania')!
    expect(record.currency.name).toBe('Tanzanian Shilling')
    expect(record.currency.code).toBe('TZS')
    expect(record.currency.symbol).toBe('TSh')
  })

  it('preserves population.value and population.asOf', () => {
    const record = getCountryRecord('tanzania')!
    expect(record.population.value).toBe(68_600_000)
    expect(record.population.asOf).toBe(2026)
  })

  it('lists official languages only', () => {
    // Swahili and English are Tanzania's official languages; this is not a
    // "widely spoken" list (e.g. it does not enumerate every regional
    // language spoken in the country).
    const record = getCountryRecord('tanzania')!
    expect(record.languages).toEqual(['Swahili', 'English'])
  })

  it('uses the verified flag asset path, not the naive name-based guess', () => {
    // public/flags/ has no tanzania.png; the real asset is ISO2-code-named.
    const record = getCountryRecord('tanzania')!
    expect(record.flag).toBe('/flags/TZ.png')
  })

  it('returns null only for a genuinely non-existent id — every real gameplay country now has a record', () => {
    // Spain, then Thailand, then Zimbabwe, then Mauritania were this
    // fixture in successive batches, each in turn becoming populated.
    // With the Mauritania follow-up complete, there is no real gameplay
    // country left with no COUNTRY_RECORDS entry.
    expect(getCountryRecord('not-a-country')).toBeNull()
  })

  it('has exactly all 200 populated slugs (Batch 1-17, the Mauritania completion, England/Scotland/Wales, and Study-data Batches A/B/C) plus Tanzania — the full 200-canonical reference set, matching COUNTRIES exactly', () => {
    expect(new Set(Object.keys(COUNTRY_RECORDS))).toEqual(new Set(POPULATED_SLUGS))
    expect(Object.keys(COUNTRY_RECORDS)).toHaveLength(200)
  })

  it('"mauritania" is no longer absent — it is now fully populated, using the same data originally supplied for Batch 16', () => {
    expect('mauritania' in COUNTRY_RECORDS).toBe(true)
    expect(getCountryRecord('mauritania')).not.toBeNull()
  })

  it('every record key is a real canonical country id (invariant 1: COUNTRY_RECORDS keys must belong to COUNTRIES)', () => {
    for (const slug of Object.keys(COUNTRY_RECORDS)) {
      expect(findCountryById(slug), slug).toBeDefined()
    }
  })

  it('every ANSWER_POOL entry has a COUNTRY_RECORDS entry (invariant 2) — answer-eligibility is no longer required of COUNTRY_RECORDS keys themselves', () => {
    for (const country of ANSWER_POOL) {
      expect(getCountryRecord(country.id), country.id).not.toBeNull()
    }
    // The converse is deliberately NOT asserted: COUNTRY_RECORDS now
    // legitimately contains non-answer-eligible entries too (Study-data
    // Batch A), so "every record key is answer-eligible" is retired.
  })

  it('invariant 3 is now globally satisfied: every COUNTRIES entry has a COUNTRY_RECORDS entry (Study-data Batch C was the final batch)', () => {
    const withoutRecords = COUNTRIES.filter((c) => !(c.id in COUNTRY_RECORDS))
    // Derived live from COUNTRIES/COUNTRY_RECORDS, not hardcoded as a name
    // list, so this can never silently drift from reality.
    expect(withoutRecords).toHaveLength(0)
    expect(withoutRecords).toEqual([])
  })

  it('Afghanistan and Antigua and Barbuda are now fully populated (Study-data Batch A) — reversing the old "removed because non-playable" policy — while remaining non-playable', () => {
    const afghanistan = findCountryById('afghanistan')!
    const antiguaAndBarbuda = findCountryById('antigua-and-barbuda')!
    expect(afghanistan.length).toBe(11)
    expect(antiguaAndBarbuda.length).toBe(17)
    // Still correctly non-playable — this batch is data-only and never
    // touched MIN_ANSWER_LENGTH/MAX_ANSWER_LENGTH/isEligibleAnswer/ANSWER_POOL.
    expect(isEligibleAnswer(afghanistan)).toBe(false)
    expect(isEligibleAnswer(antiguaAndBarbuda)).toBe(false)
    expect(ANSWER_POOL.some((c) => c.id === 'afghanistan')).toBe(false)
    expect(ANSWER_POOL.some((c) => c.id === 'antigua-and-barbuda')).toBe(false)
    // ...but now resolve real data instead of null.
    expect(getCountryRecord('afghanistan')).not.toBeNull()
    expect(getCountryRecord('antigua-and-barbuda')).not.toBeNull()
    expect(countryCodeForSlug('afghanistan')).toBe('AF')
    expect(countryCodeForSlug('antigua-and-barbuda')).toBe('AG')
  })

  it('every populated record resolves through getCountryRecord() and matches its own slug', () => {
    for (const slug of POPULATED_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      expect(record!.name).toBe(findCountryById(slug)!.name)
    }
  })

  it("every record's flag path matches the verified flags.ts mapping (never a hand-typed guess)", () => {
    // Guards against a CountryRecord.flag field drifting from the mapping
    // that flags.test.ts / audit-flags.ts actually verify against disk.
    for (const slug of POPULATED_SLUGS) {
      const record = getCountryRecord(slug)!
      const code = countryCodeForSlug(slug)
      expect(code, slug).not.toBeNull()
      expect(record.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Australia has no de jure official language, but shows English as the principal/de facto language (post language-policy revision)', () => {
    const record = getCountryRecord('australia')!
    expect(record.languages).toEqual(['English'])
  })

  it('Batch 1 currency and population sub-fields are all preserved', () => {
    const argentina = getCountryRecord('argentina')!
    expect(argentina.currency).toEqual({ name: 'Argentine Peso', code: 'ARS', symbol: '$' })
    expect(argentina.population).toEqual({ value: 46_003_734, asOf: 2026 })
  })

  it('Batch 2 currency and population sub-fields are all preserved, including non-Latin symbols', () => {
    const azerbaijan = getCountryRecord('azerbaijan')!
    expect(azerbaijan.currency).toEqual({ name: 'Azerbaijani Manat', code: 'AZN', symbol: '₼' })
    expect(azerbaijan.population).toEqual({ value: 10_454_855, asOf: 2026 })
    const bahrain = getCountryRecord('bahrain')!
    expect(bahrain.currency.symbol).toBe('د.ب')
    const bangladesh = getCountryRecord('bangladesh')!
    expect(bangladesh.currency.symbol).toBe('৳')
  })

  it('Batch 2 multi-language countries preserve every official language, in order', () => {
    expect(getCountryRecord('belarus')!.languages).toEqual(['Belarusian', 'Russian'])
    expect(getCountryRecord('belgium')!.languages).toEqual(['Dutch', 'French', 'German'])
  })

  it('every Batch 2 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_2_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Bolivia preserves all 37 official languages, in order, with no truncation', () => {
    const record = getCountryRecord('bolivia')!
    expect(record.languages).toHaveLength(37)
    expect(record.languages[0]).toBe('Spanish')
    expect(record.languages).toContain('Aymara')
    expect(record.languages).toContain('Quechua')
    expect(record.languages).toContain("Guarasu'we") // apostrophe preserved
    expect(record.languages[record.languages.length - 1]).toBe('Zamuco')
    // Every entry present, nothing collapsed or deduplicated away.
    expect(new Set(record.languages).size).toBe(37)
  })

  it('Bulgaria intentionally uses EUR/Euro/€ in this 2026 dataset', () => {
    const record = getCountryRecord('bulgaria')!
    expect(record.currency).toEqual({ name: 'Euro', code: 'EUR', symbol: '€' })
  })

  it('Batch 3 currency symbols are preserved, including non-Latin script (៛ Cambodian riel)', () => {
    expect(getCountryRecord('cambodia')!.currency.symbol).toBe('៛')
    expect(getCountryRecord('cameroon')!.currency).toEqual({ name: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA' })
  })

  it('every Batch 3 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_3_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Congo resolves to the Republic of the Congo (CG/COG), never confused with DR Congo', () => {
    const record = getCountryRecord('congo')!
    expect(record.name).toBe('Congo')
    expect(record.officialName).toBe('Republic of the Congo')
    expect(record.iso2).toBe('CG')
    expect(record.iso3).toBe('COG')
    expect(record.capital).toBe('Brazzaville')
    expect(record.flag).toBe('/flags/CG.png')
    // DR Congo (Batch 5) is a distinct record — see the dedicated
    // "DR Congo resolves to..." test below, which checks the two never
    // collide on any field.
  })

  it('Comoros preserves all three official languages, in order', () => {
    const record = getCountryRecord('comoros')!
    expect(record.languages).toEqual(['Comorian (Shikomor)', 'French', 'Arabic'])
  })

  it('China uses the full "Standard Chinese (Putonghua)" label, not a shorthand', () => {
    const record = getCountryRecord('china')!
    expect(record.languages).toEqual(['Standard Chinese (Putonghua)'])
  })

  it('Colombia lists only Spanish — Indigenous languages are territorially, not nationally, official', () => {
    const record = getCountryRecord('colombia')!
    expect(record.languages).toEqual(['Spanish'])
  })

  it('Batch 4 currency symbols are preserved, including ¥ (China) and ₡ (Costa Rica)', () => {
    expect(getCountryRecord('china')!.currency).toEqual({ name: 'Renminbi', code: 'CNY', symbol: '¥' })
    expect(getCountryRecord('costa-rica')!.currency).toEqual({ name: 'Costa Rican Colón', code: 'CRC', symbol: '₡' })
    expect(getCountryRecord('croatia')!.currency.symbol).toBe('€')
    expect(getCountryRecord('cyprus')!.currency.symbol).toBe('€')
  })

  it('every Batch 4 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_4_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('DR Congo resolves to the Democratic Republic of the Congo (CD/COD), distinct from Congo (CG/COG)', () => {
    const drCongo = getCountryRecord('dr-congo')!
    expect(drCongo.name).toBe('DR Congo')
    expect(drCongo.officialName).toBe('Democratic Republic of the Congo')
    expect(drCongo.iso2).toBe('CD')
    expect(drCongo.iso3).toBe('COD')
    expect(drCongo.capital).toBe('Kinshasa')
    expect(drCongo.flag).toBe('/flags/CD.png')

    const congo = getCountryRecord('congo')!
    expect(congo.iso2).toBe('CG')
    expect(congo.iso3).toBe('COG')
    expect(congo.capital).toBe('Brazzaville')

    // No field collision between the two records.
    expect(drCongo.iso2).not.toBe(congo.iso2)
    expect(drCongo.iso3).not.toBe(congo.iso3)
    expect(drCongo.flag).not.toBe(congo.flag)
    expect(drCongo.capital).not.toBe(congo.capital)
  })

  it('Eritrea has no de jure official language, but shows its three working languages (post language-policy revision)', () => {
    const record = getCountryRecord('eritrea')!
    expect(record.languages).toEqual(['Tigrinya', 'Arabic', 'English'])
  })

  it('Ecuador lists only Spanish — Kichwa/Shuar are officially recognised for intercultural relations, not nationally', () => {
    const record = getCountryRecord('ecuador')!
    expect(record.languages).toEqual(['Spanish'])
  })

  it('Batch 5 currency symbols are preserved, including Kč (Czechia) and E£ (Egypt)', () => {
    expect(getCountryRecord('czechia')!.currency).toEqual({ name: 'Czech Koruna', code: 'CZK', symbol: 'Kč' })
    expect(getCountryRecord('egypt')!.currency).toEqual({ name: 'Egyptian Pound', code: 'EGP', symbol: 'E£' })
    expect(getCountryRecord('estonia')!.currency.symbol).toBe('€')
  })

  it('every Batch 5 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_5_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 6 currency symbols are preserved, including ₾ (Georgia), € (Germany/Finland/France) and ₵ (Ghana)', () => {
    expect(getCountryRecord('georgia')!.currency).toEqual({ name: 'Georgian Lari', code: 'GEL', symbol: '₾' })
    expect(getCountryRecord('germany')!.currency.symbol).toBe('€')
    expect(getCountryRecord('finland')!.currency.symbol).toBe('€')
    expect(getCountryRecord('france')!.currency.symbol).toBe('€')
    expect(getCountryRecord('ghana')!.currency).toEqual({ name: 'Ghanaian Cedi', code: 'GHS', symbol: '₵' })
  })

  it('Eswatini and Finland both carry two national official languages, in order', () => {
    expect(getCountryRecord('eswatini')!.languages).toEqual(['siSwati', 'English'])
    expect(getCountryRecord('finland')!.languages).toEqual(['Finnish', 'Swedish'])
  })

  it('Georgia lists only Georgian — Abkhazian is co-official within Abkhazia only, not nationwide', () => {
    expect(getCountryRecord('georgia')!.languages).toEqual(['Georgian'])
  })

  it('every Batch 6 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_6_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 7 currency symbols are preserved, including € (Greece), Q (Guatemala), Ft (Hungary) and ₹ (India)', () => {
    expect(getCountryRecord('greece')!.currency.symbol).toBe('€')
    expect(getCountryRecord('guatemala')!.currency).toEqual({ name: 'Guatemalan Quetzal', code: 'GTQ', symbol: 'Q' })
    expect(getCountryRecord('hungary')!.currency).toEqual({ name: 'Hungarian Forint', code: 'HUF', symbol: 'Ft' })
    expect(getCountryRecord('india')!.currency).toEqual({ name: 'Indian Rupee', code: 'INR', symbol: '₹' })
  })

  it('Guatemala lists Spanish only', () => {
    expect(getCountryRecord('guatemala')!.languages).toEqual(['Spanish'])
  })

  it('Guyana lists English only — Guyanese Creolese is widely spoken but not treated as official here', () => {
    expect(getCountryRecord('guyana')!.languages).toEqual(['English'])
  })

  it('Haiti carries exactly two official languages, in order: Haitian Creole, French', () => {
    expect(getCountryRecord('haiti')!.languages).toEqual(['Haitian Creole', 'French'])
  })

  it('India carries exactly Hindi and English — not the full 22-language Eighth Schedule list', () => {
    const record = getCountryRecord('india')!
    expect(record.languages).toEqual(['Hindi', 'English'])
    expect(record.languages).toHaveLength(2)
  })

  it('every Batch 7 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_7_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 8 currency symbols are preserved, including Rp (Indonesia), ﷼ (Iran), ع.د (Iraq), ₪ (Israel), ¥ (Japan) and د.ا (Jordan)', () => {
    expect(getCountryRecord('indonesia')!.currency).toEqual({ name: 'Indonesian Rupiah', code: 'IDR', symbol: 'Rp' })
    expect(getCountryRecord('iran')!.currency).toEqual({ name: 'Iranian Rial', code: 'IRR', symbol: '﷼' })
    expect(getCountryRecord('iraq')!.currency).toEqual({ name: 'Iraqi Dinar', code: 'IQD', symbol: 'ع.د' })
    expect(getCountryRecord('israel')!.currency).toEqual({ name: 'Israeli New Shekel', code: 'ILS', symbol: '₪' })
    expect(getCountryRecord('japan')!.currency).toEqual({ name: 'Japanese Yen', code: 'JPY', symbol: '¥' })
    expect(getCountryRecord('jordan')!.currency).toEqual({ name: 'Jordanian Dinar', code: 'JOD', symbol: 'د.ا' })
  })

  it('Iraq carries exactly two nationwide official languages, in order: Arabic, Kurdish — no Turkmen/Syriac/Armenian', () => {
    expect(getCountryRecord('iraq')!.languages).toEqual(['Arabic', 'Kurdish'])
  })

  it('Ireland carries exactly two official languages, in order: Irish, English', () => {
    expect(getCountryRecord('ireland')!.languages).toEqual(['Irish', 'English'])
  })

  it('Israel lists Hebrew only — Arabic special status is not equal statewide official status here', () => {
    expect(getCountryRecord('israel')!.languages).toEqual(['Hebrew'])
    expect(getCountryRecord('israel')!.capital).toBe('Jerusalem')
  })

  it('Ivory Coast keeps its gameplay display name while officialName is the French-derived form', () => {
    const record = getCountryRecord('ivory-coast')!
    expect(record.name).toBe('Ivory Coast')
    expect(record.officialName).toBe("Republic of Côte d'Ivoire")
    expect(record.iso2).toBe('CI')
    expect(record.iso3).toBe('CIV')
    expect(record.capital).toBe('Yamoussoukro')
    expect(record.languages).toEqual(['French'])
    expect(record.currency).toEqual({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' })
  })

  it('Jamaica lists English only — Jamaican Patois is widely spoken but not official here', () => {
    expect(getCountryRecord('jamaica')!.languages).toEqual(['English'])
  })

  it('Japan lists Japanese', () => {
    expect(getCountryRecord('japan')!.languages).toEqual(['Japanese'])
  })

  it('Jordan lists Arabic only — English is widely used but not official', () => {
    expect(getCountryRecord('jordan')!.languages).toEqual(['Arabic'])
  })

  it('every Batch 8 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_8_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 9 currency symbols are preserved, including ₸ (Kazakhstan), € (Kosovo/Latvia), د.ك (Kuwait), сом (Kyrgyzstan), ₭ (Laos) and ل.ل (Lebanon)', () => {
    expect(getCountryRecord('kazakhstan')!.currency).toEqual({ name: 'Kazakhstani Tenge', code: 'KZT', symbol: '₸' })
    expect(getCountryRecord('kosovo')!.currency).toEqual({ name: 'Euro', code: 'EUR', symbol: '€' })
    expect(getCountryRecord('latvia')!.currency.symbol).toBe('€')
    expect(getCountryRecord('kuwait')!.currency).toEqual({ name: 'Kuwaiti Dinar', code: 'KWD', symbol: 'د.ك' })
    expect(getCountryRecord('kyrgyzstan')!.currency).toEqual({ name: 'Kyrgyzstani Som', code: 'KGS', symbol: 'сом' })
    expect(getCountryRecord('laos')!.currency).toEqual({ name: 'Lao Kip', code: 'LAK', symbol: '₭' })
    expect(getCountryRecord('lebanon')!.currency).toEqual({ name: 'Lebanese Pound', code: 'LBP', symbol: 'ل.ل' })
  })

  it('Kazakhstan carries exactly two languages, in order: Kazakh, Russian', () => {
    expect(getCountryRecord('kazakhstan')!.languages).toEqual(['Kazakh', 'Russian'])
  })

  it('Kenya carries exactly two languages, in order: Kiswahili, English', () => {
    expect(getCountryRecord('kenya')!.languages).toEqual(['Kiswahili', 'English'])
  })

  it('Kiribati carries exactly two languages, in order: Gilbertese, English', () => {
    expect(getCountryRecord('kiribati')!.languages).toEqual(['Gilbertese', 'English'])
  })

  it('Kosovo uses the project\'s existing non-ISO XK/XKS convention, renders Pristina/EUR, and carries exactly Albanian, Serbian (no Turkish/Bosnian/Roma)', () => {
    const record = getCountryRecord('kosovo')!
    expect(record.iso2).toBe('XK')
    expect(record.iso3).toBe('XKS')
    expect(record.flag).toBe('/flags/XK.png')
    expect(record.capital).toBe('Pristina')
    expect(record.currency.code).toBe('EUR')
    expect(record.languages).toEqual(['Albanian', 'Serbian'])
    expect(record.population.value).toBe(1_798_188)
  })

  it('Kyrgyzstan carries exactly two languages, in order: Kyrgyz, Russian', () => {
    expect(getCountryRecord('kyrgyzstan')!.languages).toEqual(['Kyrgyz', 'Russian'])
  })

  it('Latvia lists Latvian only', () => {
    expect(getCountryRecord('latvia')!.languages).toEqual(['Latvian'])
  })

  it('Lebanon lists Arabic only — French has legally permitted uses but is not co-equal official status here', () => {
    expect(getCountryRecord('lebanon')!.languages).toEqual(['Arabic'])
  })

  it('Lesotho carries exactly two languages, in order: Sesotho, English', () => {
    expect(getCountryRecord('lesotho')!.languages).toEqual(['Sesotho', 'English'])
  })

  it('every Batch 9 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_9_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 10 currency symbols are preserved, including ل.د (Libya), € (Lithuania/Luxembourg/Malta), Ar (Madagascar), MK (Malawi), RM (Malaysia), Rf (Maldives) and CFA (Mali)', () => {
    expect(getCountryRecord('libya')!.currency).toEqual({ name: 'Libyan Dinar', code: 'LYD', symbol: 'ل.د' })
    expect(getCountryRecord('lithuania')!.currency.symbol).toBe('€')
    expect(getCountryRecord('luxembourg')!.currency.symbol).toBe('€')
    expect(getCountryRecord('malta')!.currency.symbol).toBe('€')
    expect(getCountryRecord('madagascar')!.currency).toEqual({ name: 'Malagasy Ariary', code: 'MGA', symbol: 'Ar' })
    expect(getCountryRecord('malawi')!.currency).toEqual({ name: 'Malawian Kwacha', code: 'MWK', symbol: 'MK' })
    expect(getCountryRecord('malaysia')!.currency).toEqual({ name: 'Malaysian Ringgit', code: 'MYR', symbol: 'RM' })
    expect(getCountryRecord('maldives')!.currency).toEqual({ name: 'Maldivian Rufiyaa', code: 'MVR', symbol: 'Rf' })
    expect(getCountryRecord('mali')!.currency).toEqual({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' })
  })

  it('Liberia and Libya each list a single official language', () => {
    expect(getCountryRecord('liberia')!.languages).toEqual(['English'])
    expect(getCountryRecord('libya')!.languages).toEqual(['Arabic'])
  })

  it('Luxembourg preserves all three official languages in order: Luxembourgish, French, German', () => {
    expect(getCountryRecord('luxembourg')!.languages).toEqual(['Luxembourgish', 'French', 'German'])
  })

  it('Madagascar carries exactly two languages, in order: Malagasy, French', () => {
    expect(getCountryRecord('madagascar')!.languages).toEqual(['Malagasy', 'French'])
  })

  it('Malawi lists English and Chichewa — Chichewa is the "common language" (de facto national language) per the Malawi government, now shown post language-policy revision', () => {
    expect(getCountryRecord('malawi')!.languages).toEqual(['English', 'Chichewa'])
  })

  it('Malaysia lists Malay only — not English, Mandarin or Tamil', () => {
    expect(getCountryRecord('malaysia')!.languages).toEqual(['Malay'])
  })

  it('Maldives lists Dhivehi only', () => {
    expect(getCountryRecord('maldives')!.languages).toEqual(['Dhivehi'])
  })

  it('Mali carries its full 13 national official languages and deliberately excludes French (2023 constitution: French is a working language only)', () => {
    const record = getCountryRecord('mali')!
    expect(record.languages).toEqual([...MALI_LANGUAGES])
    expect(record.languages).toHaveLength(13)
    expect(record.languages).not.toContain('French')
  })

  it('Malta carries exactly two languages, in order: Maltese, English', () => {
    expect(getCountryRecord('malta')!.languages).toEqual(['Maltese', 'English'])
  })

  it('every Batch 10 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_10_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 11 currency symbols are preserved, including N$ (Namibia), रू (Nepal), C$ (Nicaragua), CFA (Niger), ₦ (Nigeria), ₩ (North Korea) and kr (Norway)', () => {
    expect(getCountryRecord('namibia')!.currency).toEqual({ name: 'Namibian Dollar', code: 'NAD', symbol: 'N$' })
    expect(getCountryRecord('nepal')!.currency).toEqual({ name: 'Nepalese Rupee', code: 'NPR', symbol: 'रू' })
    expect(getCountryRecord('nicaragua')!.currency).toEqual({ name: 'Nicaraguan Córdoba', code: 'NIO', symbol: 'C$' })
    expect(getCountryRecord('niger')!.currency).toEqual({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' })
    expect(getCountryRecord('nigeria')!.currency).toEqual({ name: 'Nigerian Naira', code: 'NGN', symbol: '₦' })
    expect(getCountryRecord('north-korea')!.currency).toEqual({ name: 'North Korean Won', code: 'KPW', symbol: '₩' })
    expect(getCountryRecord('norway')!.currency).toEqual({ name: 'Norwegian Krone', code: 'NOK', symbol: 'kr' })
  })

  it('Myanmar, Namibia, Nigeria, North Korea and Norway each list a single official language', () => {
    expect(getCountryRecord('myanmar')!.languages).toEqual(['Burmese'])
    expect(getCountryRecord('namibia')!.languages).toEqual(['English'])
    expect(getCountryRecord('nigeria')!.languages).toEqual(['English'])
    expect(getCountryRecord('north-korea')!.languages).toEqual(['Korean'])
    expect(getCountryRecord('norway')!.languages).toEqual(['Norwegian'])
  })

  it('Nauru preserves "Yaren" as its capital (no officially designated capital, not converted to a placeholder) and lists exactly Nauruan, English', () => {
    const record = getCountryRecord('nauru')!
    expect(record.capital).toBe('Yaren')
    expect(record.languages).toEqual(['Nauruan', 'English'])
  })

  it('Nepal lists Nepali only — no provincial official languages', () => {
    expect(getCountryRecord('nepal')!.languages).toEqual(['Nepali'])
  })

  it('New Zealand lists exactly English, Māori, New Zealand Sign Language — English is official (English Language Act 2026, in force August 2026), not merely de facto', () => {
    const record = getCountryRecord('new-zealand')!
    expect(record.languages).toEqual(['English', 'Māori', 'New Zealand Sign Language'])
    expect(record.languages).toContain('English')
  })

  it('Nicaragua lists Spanish only — the regionally-official Caribbean Coast languages are not listed here', () => {
    expect(getCountryRecord('nicaragua')!.languages).toEqual(['Spanish'])
  })

  it('Niger lists Hausa only (2025 Charter of Refoundation) and does not render French or English as official', () => {
    const record = getCountryRecord('niger')!
    expect(record.languages).toEqual(['Hausa'])
    expect(record.languages).not.toContain('French')
    expect(record.languages).not.toContain('English')
  })

  it('every Batch 11 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_11_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 12 currency symbols are preserved, including ر.ع. (Oman), ₨ (Pakistan), ₪ (Palestine), B/. (Panama), ₲ (Paraguay), S/ (Peru), zł (Poland), € (Portugal) and ر.ق (Qatar)', () => {
    expect(getCountryRecord('oman')!.currency).toEqual({ name: 'Omani Rial', code: 'OMR', symbol: 'ر.ع.' })
    expect(getCountryRecord('pakistan')!.currency).toEqual({ name: 'Pakistani Rupee', code: 'PKR', symbol: '₨' })
    expect(getCountryRecord('palestine')!.currency).toEqual({ name: 'Israeli New Shekel', code: 'ILS', symbol: '₪' })
    expect(getCountryRecord('panama')!.currency).toEqual({ name: 'Panamanian Balboa', code: 'PAB', symbol: 'B/.' })
    expect(getCountryRecord('paraguay')!.currency).toEqual({ name: 'Paraguayan Guaraní', code: 'PYG', symbol: '₲' })
    expect(getCountryRecord('peru')!.currency).toEqual({ name: 'Peruvian Sol', code: 'PEN', symbol: 'S/' })
    expect(getCountryRecord('poland')!.currency).toEqual({ name: 'Polish Złoty', code: 'PLN', symbol: 'zł' })
    expect(getCountryRecord('portugal')!.currency.symbol).toBe('€')
    expect(getCountryRecord('qatar')!.currency).toEqual({ name: 'Qatari Riyal', code: 'QAR', symbol: 'ر.ق' })
  })

  it('Oman, Panama, Peru, Poland, Portugal and Qatar each list a single official language', () => {
    expect(getCountryRecord('oman')!.languages).toEqual(['Arabic'])
    expect(getCountryRecord('panama')!.languages).toEqual(['Spanish'])
    expect(getCountryRecord('peru')!.languages).toEqual(['Spanish'])
    expect(getCountryRecord('poland')!.languages).toEqual(['Polish'])
    expect(getCountryRecord('portugal')!.languages).toEqual(['Portuguese'])
    expect(getCountryRecord('qatar')!.languages).toEqual(['Arabic'])
  })

  it('Pakistan carries exactly two languages, in order: Urdu, English', () => {
    expect(getCountryRecord('pakistan')!.languages).toEqual(['Urdu', 'English'])
  })

  it('Palau carries exactly two languages, in order: Palauan, English, with capital Ngerulmud and USD currency', () => {
    const record = getCountryRecord('palau')!
    expect(record.languages).toEqual(['Palauan', 'English'])
    expect(record.capital).toBe('Ngerulmud')
    expect(record.currency).toEqual({ name: 'United States Dollar', code: 'USD', symbol: '$' })
  })

  it('Palestine uses PS/PSE, loads /flags/PS.png, renders East Jerusalem, Arabic only, and ILS/₪ without documenting ILS as a Palestinian national currency', () => {
    const record = getCountryRecord('palestine')!
    expect(record.iso2).toBe('PS')
    expect(record.iso3).toBe('PSE')
    expect(record.flag).toBe('/flags/PS.png')
    expect(record.capital).toBe('East Jerusalem')
    expect(record.languages).toEqual(['Arabic'])
    expect(record.currency).toEqual({ name: 'Israeli New Shekel', code: 'ILS', symbol: '₪' })
    expect(record.currency.name).not.toMatch(/Palestinian/i)
  })

  it('Paraguay carries exactly two languages, in order: Spanish, Guaraní', () => {
    expect(getCountryRecord('paraguay')!.languages).toEqual(['Spanish', 'Guaraní'])
  })

  it('Peru lists Spanish only — Quechua/Aymara are territorially official, not added to this nationwide field', () => {
    const record = getCountryRecord('peru')!
    expect(record.languages).toEqual(['Spanish'])
    expect(record.languages).not.toContain('Quechua')
    expect(record.languages).not.toContain('Aymara')
  })

  it('every Batch 12 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_12_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 13 currency symbols are preserved, including lei (Romania), ₽ (Russia), FRw (Rwanda), T$ (Samoa), € (San Marino), CFA (Senegal), дин. (Serbia) and ₨ (Seychelles)', () => {
    expect(getCountryRecord('romania')!.currency).toEqual({ name: 'Romanian Leu', code: 'RON', symbol: 'lei' })
    expect(getCountryRecord('russia')!.currency).toEqual({ name: 'Russian Ruble', code: 'RUB', symbol: '₽' })
    expect(getCountryRecord('rwanda')!.currency).toEqual({ name: 'Rwandan Franc', code: 'RWF', symbol: 'FRw' })
    expect(getCountryRecord('samoa')!.currency).toEqual({ name: 'Samoan Tala', code: 'WST', symbol: 'T$' })
    expect(getCountryRecord('san-marino')!.currency.symbol).toBe('€')
    expect(getCountryRecord('senegal')!.currency).toEqual({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' })
    expect(getCountryRecord('serbia')!.currency).toEqual({ name: 'Serbian Dinar', code: 'RSD', symbol: 'дин.' })
    expect(getCountryRecord('seychelles')!.currency).toEqual({ name: 'Seychellois Rupee', code: 'SCR', symbol: '₨' })
  })

  it('Romania, Russia, San Marino and Senegal each list a single official language', () => {
    expect(getCountryRecord('romania')!.languages).toEqual(['Romanian'])
    expect(getCountryRecord('russia')!.languages).toEqual(['Russian'])
    expect(getCountryRecord('san-marino')!.languages).toEqual(['Italian'])
    expect(getCountryRecord('senegal')!.languages).toEqual(['French'])
  })

  it('Rwanda carries exactly three languages, in order: Kinyarwanda, English, French, and never Kiswahili/Swahili (2023 constitution)', () => {
    const record = getCountryRecord('rwanda')!
    expect(record.languages).toEqual(['Kinyarwanda', 'English', 'French'])
    expect(record.languages).not.toContain('Kiswahili')
    expect(record.languages).not.toContain('Swahili')
  })

  it('Saint Lucia lists English only', () => {
    expect(getCountryRecord('saint-lucia')!.languages).toEqual(['English'])
  })

  it('Samoa carries exactly two languages, in order: Samoan, English', () => {
    expect(getCountryRecord('samoa')!.languages).toEqual(['Samoan', 'English'])
  })

  it('San Marino resolves its capital as "San Marino" despite matching the country name', () => {
    const record = getCountryRecord('san-marino')!
    expect(record.name).toBe('San Marino')
    expect(record.capital).toBe('San Marino')
  })

  it('Serbia resolves RS/SRB, Belgrade, areaKm2 77_474 and Serbian only, and remains completely distinct from Kosovo', () => {
    const serbia = getCountryRecord('serbia')!
    const kosovo = getCountryRecord('kosovo')!
    expect(serbia.iso2).toBe('RS')
    expect(serbia.iso3).toBe('SRB')
    expect(serbia.capital).toBe('Belgrade')
    expect(serbia.areaKm2).toBe(77_474)
    expect(serbia.languages).toEqual(['Serbian'])
    expect(serbia.iso2).not.toBe(kosovo.iso2)
    expect(serbia.capital).not.toBe(kosovo.capital)
    expect(serbia.areaKm2).not.toBe(kosovo.areaKm2)
    expect(kosovo.areaKm2).toBe(10_887)
  })

  it('Seychelles carries exactly three languages, in order: Seychellois Creole, English, French', () => {
    expect(getCountryRecord('seychelles')!.languages).toEqual(['Seychellois Creole', 'English', 'French'])
  })

  it('Singapore carries exactly four languages, in order: Malay, Mandarin, Tamil, English', () => {
    expect(getCountryRecord('singapore')!.languages).toEqual(['Malay', 'Mandarin', 'Tamil', 'English'])
  })

  it('every Batch 13 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_13_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 14 currency symbols are preserved, including € (Slovakia/Slovenia/Spain), Sh.So. (Somalia), ₩ (South Korea), SS£ (South Sudan), Rs (Sri Lanka), ج.س. (Sudan) and kr (Sweden)', () => {
    expect(getCountryRecord('slovakia')!.currency.symbol).toBe('€')
    expect(getCountryRecord('slovenia')!.currency.symbol).toBe('€')
    expect(getCountryRecord('spain')!.currency.symbol).toBe('€')
    expect(getCountryRecord('somalia')!.currency).toEqual({ name: 'Somali Shilling', code: 'SOS', symbol: 'Sh.So.' })
    expect(getCountryRecord('south-korea')!.currency).toEqual({ name: 'South Korean Won', code: 'KRW', symbol: '₩' })
    expect(getCountryRecord('south-sudan')!.currency).toEqual({ name: 'South Sudanese Pound', code: 'SSP', symbol: 'SS£' })
    expect(getCountryRecord('sri-lanka')!.currency).toEqual({ name: 'Sri Lankan Rupee', code: 'LKR', symbol: 'Rs' })
    expect(getCountryRecord('sudan')!.currency).toEqual({ name: 'Sudanese Pound', code: 'SDG', symbol: 'ج.س.' })
    expect(getCountryRecord('sweden')!.currency).toEqual({ name: 'Swedish Krona', code: 'SEK', symbol: 'kr' })
  })

  it('Slovakia, South Korea, South Sudan and Suriname each list a single official language', () => {
    expect(getCountryRecord('slovakia')!.languages).toEqual(['Slovak'])
    expect(getCountryRecord('south-korea')!.languages).toEqual(['Korean'])
    expect(getCountryRecord('south-sudan')!.languages).toEqual(['English'])
    expect(getCountryRecord('suriname')!.languages).toEqual(['Dutch'])
  })

  it('Slovenia lists Slovenian only and never Italian or Hungarian (minority-area-only status)', () => {
    const record = getCountryRecord('slovenia')!
    expect(record.languages).toEqual(['Slovenian'])
    expect(record.languages).not.toContain('Italian')
    expect(record.languages).not.toContain('Hungarian')
  })

  it('Somalia carries exactly two languages, in order: Somali, Arabic', () => {
    expect(getCountryRecord('somalia')!.languages).toEqual(['Somali', 'Arabic'])
  })

  it('Spain lists Spanish only and never Catalan, Basque, Galician or Valencian (co-official only in autonomous communities)', () => {
    const record = getCountryRecord('spain')!
    expect(record.languages).toEqual(['Spanish'])
    for (const lang of ['Catalan', 'Basque', 'Galician', 'Valencian']) expect(record.languages).not.toContain(lang)
  })

  it('Sri Lanka carries exactly two languages, in order: Sinhala, Tamil, and never English (the constitutional link language)', () => {
    const record = getCountryRecord('sri-lanka')!
    expect(record.languages).toEqual(['Sinhala', 'Tamil'])
    expect(record.languages).not.toContain('English')
  })

  it('Sudan carries exactly two languages, in order: Arabic, English', () => {
    expect(getCountryRecord('sudan')!.languages).toEqual(['Arabic', 'English'])
  })

  it('Sweden lists Swedish only and never Finnish, Yiddish, Meänkieli, Romani Chib or Sami (protected national minority languages)', () => {
    const record = getCountryRecord('sweden')!
    expect(record.languages).toEqual(['Swedish'])
    for (const lang of ['Finnish', 'Yiddish', 'Meänkieli', 'Romani Chib', 'Sami']) expect(record.languages).not.toContain(lang)
  })

  it('every Batch 14 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_14_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 15 currency symbols are preserved, including £S (Syria), NT$ (Taiwan), SM (Tajikistan), ฿ (Thailand), CFA (Togo), T$ (Tonga), DT (Tunisia) and ₺ (Turkey)', () => {
    expect(getCountryRecord('syria')!.currency).toEqual({ name: 'Syrian Pound', code: 'SYP', symbol: '£S' })
    expect(getCountryRecord('taiwan')!.currency).toEqual({ name: 'New Taiwan Dollar', code: 'TWD', symbol: 'NT$' })
    expect(getCountryRecord('tajikistan')!.currency).toEqual({ name: 'Tajikistani Somoni', code: 'TJS', symbol: 'SM' })
    expect(getCountryRecord('thailand')!.currency).toEqual({ name: 'Thai Baht', code: 'THB', symbol: '฿' })
    expect(getCountryRecord('togo')!.currency).toEqual({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' })
    expect(getCountryRecord('tonga')!.currency).toEqual({ name: 'Tongan Paʻanga', code: 'TOP', symbol: 'T$' })
    expect(getCountryRecord('tunisia')!.currency).toEqual({ name: 'Tunisian Dinar', code: 'TND', symbol: 'DT' })
    expect(getCountryRecord('turkey')!.currency).toEqual({ name: 'Turkish Lira', code: 'TRY', symbol: '₺' })
  })

  it('Syria retains SYP for the post-2026-redenominated Syrian pound, not an invented code or the pre-2026 denomination', () => {
    const record = getCountryRecord('syria')!
    expect(record.currency.code).toBe('SYP')
    expect(record.currency.name).toBe('Syrian Pound')
    expect(record.currency.symbol).toBe('£S')
  })

  it('Taiwan resolves TW/TWN/Taipei/TWD·NT$ and shows Mandarin as the principal language (post language-policy revision)', () => {
    const record = getCountryRecord('taiwan')!
    expect(record.iso2).toBe('TW')
    expect(record.iso3).toBe('TWN')
    expect(record.capital).toBe('Taipei')
    expect(record.currency).toEqual({ name: 'New Taiwan Dollar', code: 'TWD', symbol: 'NT$' })
    expect(record.languages).toEqual(['Mandarin'])
  })

  it('Tajikistan lists Tajik only and never Russian', () => {
    const record = getCountryRecord('tajikistan')!
    expect(record.languages).toEqual(['Tajik'])
    expect(record.languages).not.toContain('Russian')
  })

  it('Thailand, Togo and Tunisia each list a single official language', () => {
    expect(getCountryRecord('thailand')!.languages).toEqual(['Thai'])
    expect(getCountryRecord('togo')!.languages).toEqual(['French'])
    expect(getCountryRecord('tunisia')!.languages).toEqual(['Arabic'])
  })

  it('Timor-Leste carries exactly two languages, in order: Portuguese, Tetum, and never English or Indonesian', () => {
    const record = getCountryRecord('timor-leste')!
    expect(record.languages).toEqual(['Portuguese', 'Tetum'])
    expect(record.languages).not.toContain('English')
    expect(record.languages).not.toContain('Indonesian')
  })

  it('Tonga carries exactly two languages, in order: Tongan, English, and preserves the Unicode ʻokina in its capital and currency name', () => {
    const record = getCountryRecord('tonga')!
    expect(record.languages).toEqual(['Tongan', 'English'])
    expect(record.capital).toBe('Nukuʻalofa')
    expect(record.currency.name).toBe('Tongan Paʻanga')
  })

  it('Turkey keeps its gameplay display name while officialName is "Republic of Türkiye", and resolves Ankara/Turkish/TRY/₺', () => {
    const record = getCountryRecord('turkey')!
    expect(record.name).toBe('Turkey')
    expect(record.officialName).toBe('Republic of Türkiye')
    expect(record.capital).toBe('Ankara')
    expect(record.languages).toEqual(['Turkish'])
    expect(record.currency).toEqual({ name: 'Turkish Lira', code: 'TRY', symbol: '₺' })
  })

  it('Tuvalu carries exactly two languages, in order: Tuvaluan, English, with capital Funafuti, AUD currency and areaKm2 26', () => {
    const record = getCountryRecord('tuvalu')!
    expect(record.languages).toEqual(['Tuvaluan', 'English'])
    expect(record.capital).toBe('Funafuti')
    expect(record.currency).toEqual({ name: 'Australian Dollar', code: 'AUD', symbol: '$' })
    expect(record.areaKm2).toBe(26)
  })

  it('every Batch 15 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_15_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 16 currency symbols are preserved, including ₨ (Mauritius), € (Monaco/Montenegro), ₮ (Mongolia) and د.م. (Morocco)', () => {
    expect(getCountryRecord('mauritius')!.currency).toEqual({ name: 'Mauritian Rupee', code: 'MUR', symbol: '₨' })
    expect(getCountryRecord('monaco')!.currency.symbol).toBe('€')
    expect(getCountryRecord('montenegro')!.currency.symbol).toBe('€')
    expect(getCountryRecord('mongolia')!.currency).toEqual({ name: 'Mongolian Tögrög', code: 'MNT', symbol: '₮' })
    expect(getCountryRecord('morocco')!.currency).toEqual({ name: 'Moroccan Dirham', code: 'MAD', symbol: 'د.م.' })
  })

  it('Mauritius and Mexico each show their principal language(s) (post language-policy revision)', () => {
    const mauritius = getCountryRecord('mauritius')!
    expect(mauritius.languages).toEqual(['Mauritian Creole', 'English', 'French'])

    const mexico = getCountryRecord('mexico')!
    expect(mexico.languages).toEqual(['Spanish'])
  })

  it('Micronesia, Monaco and Mozambique each list a single official language', () => {
    expect(getCountryRecord('micronesia')!.languages).toEqual(['English'])
    expect(getCountryRecord('monaco')!.languages).toEqual(['French'])
    expect(getCountryRecord('mozambique')!.languages).toEqual(['Portuguese'])
  })

  it('Moldova lists Romanian only and preserves the Unicode capital Chișinău', () => {
    const record = getCountryRecord('moldova')!
    expect(record.languages).toEqual(['Romanian'])
    expect(record.capital).toBe('Chișinău')
  })

  it('Monaco resolves its capital as "Monaco" despite matching the country name', () => {
    const record = getCountryRecord('monaco')!
    expect(record.name).toBe('Monaco')
    expect(record.capital).toBe('Monaco')
  })

  it('Montenegro carries all five official languages in full, not collapsed to Montenegrin only', () => {
    const record = getCountryRecord('montenegro')!
    expect(record.languages).toEqual(['Montenegrin', 'Serbian', 'Bosnian', 'Albanian', 'Croatian'])
    expect(record.languages).toHaveLength(5)
  })

  it('Morocco carries exactly two languages, in order: Arabic, Amazigh', () => {
    expect(getCountryRecord('morocco')!.languages).toEqual(['Arabic', 'Amazigh'])
  })

  it('every Batch 16 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_16_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })

  it('Batch 17 currency symbols are preserved, including USh (Uganda), ₴ (Ukraine), soʻm (Uzbekistan), VT (Vanuatu), Bs. (Venezuela), ₫ (Vietnam), ﷼ (Yemen), ZK (Zambia) and ZiG (Zimbabwe)', () => {
    expect(getCountryRecord('uganda')!.currency).toEqual({ name: 'Ugandan Shilling', code: 'UGX', symbol: 'USh' })
    expect(getCountryRecord('ukraine')!.currency).toEqual({ name: 'Ukrainian Hryvnia', code: 'UAH', symbol: '₴' })
    expect(getCountryRecord('uzbekistan')!.currency).toEqual({ name: 'Uzbekistani Som', code: 'UZS', symbol: 'soʻm' })
    expect(getCountryRecord('vanuatu')!.currency).toEqual({ name: 'Vanuatu Vatu', code: 'VUV', symbol: 'VT' })
    expect(getCountryRecord('venezuela')!.currency).toEqual({ name: 'Venezuelan Bolívar', code: 'VES', symbol: 'Bs.' })
    expect(getCountryRecord('vietnam')!.currency).toEqual({ name: 'Vietnamese Đồng', code: 'VND', symbol: '₫' })
    expect(getCountryRecord('yemen')!.currency).toEqual({ name: 'Yemeni Rial', code: 'YER', symbol: '﷼' })
    expect(getCountryRecord('zambia')!.currency).toEqual({ name: 'Zambian Kwacha', code: 'ZMW', symbol: 'ZK' })
    expect(getCountryRecord('zimbabwe')!.currency).toEqual({ name: 'Zimbabwe Gold', code: 'ZWG', symbol: 'ZiG' })
  })

  it('Uganda carries exactly two languages, in order: English, Swahili', () => {
    expect(getCountryRecord('uganda')!.languages).toEqual(['English', 'Swahili'])
  })

  it('Ukraine lists Ukrainian only and never Russian', () => {
    const record = getCountryRecord('ukraine')!
    expect(record.languages).toEqual(['Ukrainian'])
    expect(record.languages).not.toContain('Russian')
    expect(record.capital).toBe('Kyiv')
  })

  it('Uruguay, Venezuela, Yemen and Zambia each list a single official language', () => {
    expect(getCountryRecord('uruguay')!.languages).toEqual(['Spanish'])
    expect(getCountryRecord('venezuela')!.languages).toEqual(['Spanish'])
    expect(getCountryRecord('yemen')!.languages).toEqual(['Arabic'])
    expect(getCountryRecord('zambia')!.languages).toEqual(['English'])
  })

  it('Uzbekistan lists Uzbek only and preserves the Unicode modifier apostrophe in soʻm', () => {
    const record = getCountryRecord('uzbekistan')!
    expect(record.languages).toEqual(['Uzbek'])
    expect(record.currency.symbol).toBe('soʻm')
  })

  it('Vanuatu carries exactly three languages, in order: Bislama, English, French', () => {
    expect(getCountryRecord('vanuatu')!.languages).toEqual(['Bislama', 'English', 'French'])
  })

  it('Vietnam lists Vietnamese only and preserves the Unicode in Vietnamese Đồng / ₫', () => {
    const record = getCountryRecord('vietnam')!
    expect(record.languages).toEqual(['Vietnamese'])
    expect(record.currency).toEqual({ name: 'Vietnamese Đồng', code: 'VND', symbol: '₫' })
  })

  it("Yemen preserves the capital Sana'a", () => {
    expect(getCountryRecord('yemen')!.capital).toBe("Sana'a")
  })

  it('Zimbabwe carries its full 16 official languages, in the supplied order, with no truncation or reordering', () => {
    const record = getCountryRecord('zimbabwe')!
    expect(record.languages).toEqual([...ZIMBABWE_LANGUAGES])
    expect(record.languages).toHaveLength(16)
  })

  it('Zimbabwe currency is Zimbabwe Gold / ZWG / ZiG — no contradictory pre-existing project data exists (verified: no ZWL/old-Zimbabwe-dollar reference anywhere in the codebase)', () => {
    const record = getCountryRecord('zimbabwe')!
    expect(record.currency).toEqual({ name: 'Zimbabwe Gold', code: 'ZWG', symbol: 'ZiG' })
  })

  it('every Batch 17 record resolves through getCountryRecord() and every flag matches the verified mapping', () => {
    for (const slug of BATCH_17_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
    }
  })
})

describe('Mauritania completion (the final playable country, follow-up to Batch 16)', () => {
  it('resolves exactly the supplied record, matching MR/MRT, Nouakchott, MRU/UM currency and Arabic only', () => {
    const record = getCountryRecord('mauritania')
    expect(record).toEqual({
      name: 'Mauritania',
      officialName: 'Islamic Republic of Mauritania',
      iso2: 'MR',
      iso3: 'MRT',
      capital: 'Nouakchott',
      currency: { name: 'Mauritanian Ouguiya', code: 'MRU', symbol: 'UM' },
      population: { value: 5_484_612, asOf: 2026 },
      continent: 'Africa',
      languages: ['Arabic'],
      areaKm2: 1_030_700,
      flag: '/flags/MR.png',
      fact: "Much of Mauritania lies within the Sahara Desert, while its Atlantic coast contains important fishing grounds.",
    })
  })

  it('lists Arabic only and never Pulaar, Soninke or Wolof', () => {
    const record = getCountryRecord('mauritania')!
    expect(record.languages).toEqual(['Arabic'])
    for (const lang of ['Pulaar', 'Soninke', 'Wolof']) expect(record.languages).not.toContain(lang)
  })

  it('formats population as a rounded "5 million" with no year/estimate note', () => {
    const record = getCountryRecord('mauritania')!
    expect(formatPopulation(record.population)).toBe('5 million')
  })

  it('resolves through getCountryRecord() and its flag matches the verified mapping', () => {
    const record = getCountryRecord('mauritania')
    expect(record).not.toBeNull()
    const code = countryCodeForSlug('mauritania')
    expect(code).toBe('MR')
    expect(record!.flag).toBe(flagUrlForCode(code!))
  })
})

describe('England, Scotland and Wales (this task): constituent-country completion, added with full records, not placeholders', () => {
  it('England resolves exactly: London, GBP/£, English only, no iso2/iso3, GB-ENG flag', () => {
    const record = getCountryRecord('england')!
    expect(record.name).toBe('England')
    expect(record.officialName).toBe('England')
    expect(record.iso2).toBeUndefined()
    expect(record.iso3).toBeUndefined()
    expect(record.capital).toBe('London')
    expect(record.currency).toEqual({ name: 'Pound Sterling', code: 'GBP', symbol: '£' })
    expect(record.continent).toBe('Europe')
    expect(record.languages).toEqual(['English'])
    expect(record.areaKm2).toBe(130_279)
    expect(record.flag).toBe('/flags/GB-ENG.png')
  })

  it('Scotland resolves exactly: Edinburgh, GBP/£, English/Scots/Scottish Gaelic, no iso2/iso3, GB-SCT flag', () => {
    const record = getCountryRecord('scotland')!
    expect(record.name).toBe('Scotland')
    expect(record.officialName).toBe('Scotland')
    expect(record.iso2).toBeUndefined()
    expect(record.iso3).toBeUndefined()
    expect(record.capital).toBe('Edinburgh')
    expect(record.currency).toEqual({ name: 'Pound Sterling', code: 'GBP', symbol: '£' })
    expect(record.continent).toBe('Europe')
    expect(record.languages).toEqual(['English', 'Scots', 'Scottish Gaelic'])
    expect(record.areaKm2).toBe(77_933)
    expect(record.flag).toBe('/flags/GB-SCT.png')
  })

  it('Wales resolves exactly: Cardiff, GBP/£, English/Welsh, no iso2/iso3, GB-WLS flag', () => {
    const record = getCountryRecord('wales')!
    expect(record.name).toBe('Wales')
    expect(record.officialName).toBe('Wales')
    expect(record.iso2).toBeUndefined()
    expect(record.iso3).toBeUndefined()
    expect(record.capital).toBe('Cardiff')
    expect(record.currency).toEqual({ name: 'Pound Sterling', code: 'GBP', symbol: '£' })
    expect(record.continent).toBe('Europe')
    expect(record.languages).toEqual(['English', 'Welsh'])
    expect(record.areaKm2).toBe(20_779)
    expect(record.flag).toBe('/flags/GB-WLS.png')
  })

  it('does not add Welsh to England or Scotland, and does not add Scottish Gaelic to England or Wales', () => {
    expect(getCountryRecord('england')!.languages).not.toContain('Welsh')
    expect(getCountryRecord('scotland')!.languages).not.toContain('Welsh')
    expect(getCountryRecord('england')!.languages).not.toContain('Scottish Gaelic')
    expect(getCountryRecord('wales')!.languages).not.toContain('Scottish Gaelic')
  })

  it('population figures use the latest available mid-2025 UK-statistical-source estimates, asOf 2025 (not forced to 2026)', () => {
    // ONS "Population estimates for England and Wales: mid-2025" (England,
    // Wales) and National Records of Scotland "Mid-2025 population
    // estimates" (Scotland) — both reference 30 June 2025.
    expect(getCountryRecord('england')!.population).toEqual({ value: 58_834_800, asOf: 2025 })
    expect(getCountryRecord('scotland')!.population).toEqual({ value: 5_545_500, asOf: 2025 })
    expect(getCountryRecord('wales')!.population).toEqual({ value: 3_175_200, asOf: 2025 })
  })

  it('formats each population rounded to the nearest million', () => {
    expect(formatPopulation(getCountryRecord('england')!.population)).toBe('59 million')
    expect(formatPopulation(getCountryRecord('scotland')!.population)).toBe('6 million')
    expect(formatPopulation(getCountryRecord('wales')!.population)).toBe('3 million')
  })

  it('every record resolves through getCountryRecord() and its flag matches the verified ISO 3166-2 mapping (not the United Kingdom\'s GB code)', () => {
    for (const slug of UK_CONSTITUENT_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
      expect(code, slug).not.toBe('GB')
    }
  })
})

describe('Study-data Batch A (this task): the first 10 non-playable canonical countries to get complete reference records', () => {
  it('Afghanistan resolves exactly: Kabul, AF/AFG, AFN · ؋, Dari/Pashto', () => {
    const record = getCountryRecord('afghanistan')!
    expect(record.iso2).toBe('AF')
    expect(record.iso3).toBe('AFG')
    expect(record.capital).toBe('Kabul')
    expect(record.currency).toEqual({ name: 'Afghan Afghani', code: 'AFN', symbol: '؋' })
    expect(record.languages).toEqual(['Dari', 'Pashto'])
  })

  it('Antigua and Barbuda resolves exactly: Saint John\'s, AG/ATG, XCD, English only', () => {
    const record = getCountryRecord('antigua-and-barbuda')!
    expect(record.iso2).toBe('AG')
    expect(record.iso3).toBe('ATG')
    expect(record.capital).toBe("Saint John's")
    expect(record.currency).toEqual({ name: 'East Caribbean Dollar', code: 'XCD', symbol: '$' })
    expect(record.languages).toEqual(['English'])
  })

  it('Bosnia and Herzegovina resolves exactly: Sarajevo, BA/BIH, BAM · KM, Bosnian/Croatian/Serbian', () => {
    const record = getCountryRecord('bosnia-and-herzegovina')!
    expect(record.iso2).toBe('BA')
    expect(record.iso3).toBe('BIH')
    expect(record.capital).toBe('Sarajevo')
    expect(record.currency).toEqual({ name: 'Bosnia and Herzegovina Convertible Mark', code: 'BAM', symbol: 'KM' })
    expect(record.languages).toEqual(['Bosnian', 'Croatian', 'Serbian'])
  })

  it('Burkina Faso resolves exactly: Ouagadougou, BF/BFA, XOF · CFA, Mooré/Dioula/Fulfulde/French, preserving Unicode é in Mooré', () => {
    const record = getCountryRecord('burkina-faso')!
    expect(record.iso2).toBe('BF')
    expect(record.iso3).toBe('BFA')
    expect(record.capital).toBe('Ouagadougou')
    expect(record.currency).toEqual({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' })
    expect(record.languages).toEqual(['Mooré', 'Dioula', 'Fulfulde', 'French'])
    expect(record.languages[0]).toBe('Mooré')
    expect(record.languages[0]).toContain('é')
  })

  it('Central African Republic resolves exactly: Bangui, CF/CAF, XAF · FCFA, Sango/French', () => {
    const record = getCountryRecord('central-african-republic')!
    expect(record.iso2).toBe('CF')
    expect(record.iso3).toBe('CAF')
    expect(record.capital).toBe('Bangui')
    expect(record.currency).toEqual({ name: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA' })
    expect(record.languages).toEqual(['Sango', 'French'])
  })

  it('Dominican Republic resolves exactly: Santo Domingo, DO/DOM, DOP · RD$, Spanish only', () => {
    const record = getCountryRecord('dominican-republic')!
    expect(record.iso2).toBe('DO')
    expect(record.iso3).toBe('DOM')
    expect(record.capital).toBe('Santo Domingo')
    expect(record.currency).toEqual({ name: 'Dominican Peso', code: 'DOP', symbol: 'RD$' })
    expect(record.languages).toEqual(['Spanish'])
  })

  it('Equatorial Guinea resolves exactly: Malabo, GQ/GNQ, XAF · FCFA, Spanish/French/Portuguese', () => {
    const record = getCountryRecord('equatorial-guinea')!
    expect(record.iso2).toBe('GQ')
    expect(record.iso3).toBe('GNQ')
    expect(record.capital).toBe('Malabo')
    expect(record.currency).toEqual({ name: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA' })
    expect(record.languages).toEqual(['Spanish', 'French', 'Portuguese'])
  })

  it('Guinea-Bissau resolves exactly: Bissau, GW/GNB, XOF · CFA, Portuguese/Guinea-Bissau Creole', () => {
    const record = getCountryRecord('guinea-bissau')!
    expect(record.iso2).toBe('GW')
    expect(record.iso3).toBe('GNB')
    expect(record.capital).toBe('Bissau')
    expect(record.currency).toEqual({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' })
    expect(record.languages).toEqual(['Portuguese', 'Guinea-Bissau Creole'])
  })

  it('Liechtenstein resolves exactly: Vaduz, LI/LIE, CHF, German only', () => {
    const record = getCountryRecord('liechtenstein')!
    expect(record.iso2).toBe('LI')
    expect(record.iso3).toBe('LIE')
    expect(record.capital).toBe('Vaduz')
    expect(record.currency).toEqual({ name: 'Swiss Franc', code: 'CHF', symbol: 'CHF' })
    expect(record.languages).toEqual(['German'])
  })

  it('Marshall Islands resolves exactly: Majuro, MH/MHL, USD, Marshallese/English', () => {
    const record = getCountryRecord('marshall-islands')!
    expect(record.iso2).toBe('MH')
    expect(record.iso3).toBe('MHL')
    expect(record.capital).toBe('Majuro')
    expect(record.currency).toEqual({ name: 'United States Dollar', code: 'USD', symbol: '$' })
    expect(record.languages).toEqual(['Marshallese', 'English'])
  })

  it('every Study-data Batch A record resolves through getCountryRecord(), its flag matches the verified mapping, and none is answer-eligible', () => {
    for (const slug of STUDY_BATCH_A_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
      const country = findCountryById(slug)!
      expect(isEligibleAnswer(country), slug).toBe(false)
      expect(ANSWER_POOL.some((c) => c.id === slug), slug).toBe(false)
    }
  })

  it('formats each population per the display rounding rules, with no year/estimate text', () => {
    expect(formatPopulation(getCountryRecord('afghanistan')!.population)).toBe('45 million')
    expect(formatPopulation(getCountryRecord('antigua-and-barbuda')!.population)).toBe('95,000')
    expect(formatPopulation(getCountryRecord('marshall-islands')!.population)).toBe('35,000')
  })
})

describe('Study-data Batch B (this task): 10 more non-playable canonical countries get complete reference records', () => {
  it('Netherlands resolves exactly: Amsterdam (NOT The Hague), NL/NLD, EUR · €, Dutch only', () => {
    const record = getCountryRecord('netherlands')!
    expect(record.iso2).toBe('NL')
    expect(record.iso3).toBe('NLD')
    expect(record.capital).toBe('Amsterdam')
    expect(record.capital).not.toBe('The Hague')
    expect(record.currency).toEqual({ name: 'Euro', code: 'EUR', symbol: '€' })
    expect(record.languages).toEqual(['Dutch'])
    expect(record.fact).toContain('The Hague')
  })

  it('North Macedonia resolves exactly: Skopje, MK/MKD, Macedonian Denar · ден, Macedonian/Albanian', () => {
    const record = getCountryRecord('north-macedonia')!
    expect(record.iso2).toBe('MK')
    expect(record.iso3).toBe('MKD')
    expect(record.capital).toBe('Skopje')
    expect(record.currency).toEqual({ name: 'Macedonian Denar', code: 'MKD', symbol: 'ден' })
    expect(record.languages).toEqual(['Macedonian', 'Albanian'])
  })

  it('Papua New Guinea resolves exactly: Port Moresby, PG/PNG, PGK · K, English/Tok Pisin/Hiri Motu, fact mentions 800+ languages', () => {
    const record = getCountryRecord('papua-new-guinea')!
    expect(record.iso2).toBe('PG')
    expect(record.iso3).toBe('PNG')
    expect(record.capital).toBe('Port Moresby')
    expect(record.currency).toEqual({ name: 'Papua New Guinean Kina', code: 'PGK', symbol: 'K' })
    expect(record.languages).toEqual(['English', 'Tok Pisin', 'Hiri Motu'])
    expect(record.fact).toContain('800')
  })

  it('Philippines resolves exactly: Manila, PH/PHL, PHP · ₱, Filipino/English', () => {
    const record = getCountryRecord('philippines')!
    expect(record.iso2).toBe('PH')
    expect(record.iso3).toBe('PHL')
    expect(record.capital).toBe('Manila')
    expect(record.currency).toEqual({ name: 'Philippine Peso', code: 'PHP', symbol: '₱' })
    expect(record.languages).toEqual(['Filipino', 'English'])
  })

  it('Saint Kitts and Nevis resolves exactly: Basseterre, KN/KNA, XCD, English only', () => {
    const record = getCountryRecord('saint-kitts-and-nevis')!
    expect(record.iso2).toBe('KN')
    expect(record.iso3).toBe('KNA')
    expect(record.capital).toBe('Basseterre')
    expect(record.currency).toEqual({ name: 'East Caribbean Dollar', code: 'XCD', symbol: '$' })
    expect(record.languages).toEqual(['English'])
  })

  it('Saint Vincent and the Grenadines resolves exactly: Kingstown, VC/VCT, XCD, English only', () => {
    const record = getCountryRecord('saint-vincent-and-the-grenadines')!
    expect(record.iso2).toBe('VC')
    expect(record.iso3).toBe('VCT')
    expect(record.capital).toBe('Kingstown')
    expect(record.currency).toEqual({ name: 'East Caribbean Dollar', code: 'XCD', symbol: '$' })
    expect(record.languages).toEqual(['English'])
  })

  it('São Tomé and Príncipe resolves exactly: São Tomé, ST/STP, STN · Db, Portuguese only, with Unicode preserved intact', () => {
    const record = getCountryRecord('sao-tome-and-principe')!
    expect(record.name).toBe('São Tomé and Príncipe')
    expect(record.iso2).toBe('ST')
    expect(record.iso3).toBe('STP')
    expect(record.capital).toBe('São Tomé')
    expect(record.currency).toEqual({ name: 'São Tomé and Príncipe Dobra', code: 'STN', symbol: 'Db' })
    expect(record.languages).toEqual(['Portuguese'])
    // Explicit character-level checks — no normalization/rendering step
    // should have stripped or mangled the diacritics.
    expect(record.name).toContain('ã')
    expect(record.name).toContain('é')
    expect(record.name).toContain('í')
    expect(record.capital).toBe('São Tomé')
  })

  it('Saudi Arabia resolves exactly: Riyadh, SA/SAU, SAR · ﷼, Arabic only', () => {
    const record = getCountryRecord('saudi-arabia')!
    expect(record.iso2).toBe('SA')
    expect(record.iso3).toBe('SAU')
    expect(record.capital).toBe('Riyadh')
    expect(record.currency).toEqual({ name: 'Saudi Riyal', code: 'SAR', symbol: '﷼' })
    expect(record.languages).toEqual(['Arabic'])
  })

  it('Sierra Leone resolves exactly: Freetown, SL/SLE, SLE · Le, English/Krio', () => {
    const record = getCountryRecord('sierra-leone')!
    expect(record.iso2).toBe('SL')
    expect(record.iso3).toBe('SLE')
    expect(record.capital).toBe('Freetown')
    expect(record.currency).toEqual({ name: 'Sierra Leonean Leone', code: 'SLE', symbol: 'Le' })
    expect(record.languages).toEqual(['English', 'Krio'])
  })

  it('Solomon Islands resolves exactly: Honiara, SB/SLB, SBD, English/Solomon Islands Pijin', () => {
    const record = getCountryRecord('solomon-islands')!
    expect(record.iso2).toBe('SB')
    expect(record.iso3).toBe('SLB')
    expect(record.capital).toBe('Honiara')
    expect(record.currency).toEqual({ name: 'Solomon Islands Dollar', code: 'SBD', symbol: '$' })
    expect(record.languages).toEqual(['English', 'Solomon Islands Pijin'])
  })

  it('every Study-data Batch B record resolves through getCountryRecord(), its flag matches the verified mapping, and none is answer-eligible', () => {
    for (const slug of STUDY_BATCH_B_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
      const country = findCountryById(slug)!
      expect(isEligibleAnswer(country), slug).toBe(false)
      expect(ANSWER_POOL.some((c) => c.id === slug), slug).toBe(false)
    }
  })

  it('formats each population per the display rounding rules, with no year/estimate text', () => {
    expect(formatPopulation(getCountryRecord('netherlands')!.population)).toBe('18 million')
    expect(formatPopulation(getCountryRecord('saint-kitts-and-nevis')!.population)).toBe('47,000')
    expect(formatPopulation(getCountryRecord('solomon-islands')!.population)).toBe('858,000')
  })
})

describe('Study-data Batch C (this task): the final 8 non-playable canonical countries get complete reference records — invariant 3 is now globally satisfied', () => {
  it('South Africa resolves exactly: Pretoria, ZA/ZAF, ZAR · R, all 12 official languages preserved in supplied order (including lowercase "itsonga")', () => {
    const record = getCountryRecord('south-africa')!
    expect(record.iso2).toBe('ZA')
    expect(record.iso3).toBe('ZAF')
    expect(record.capital).toBe('Pretoria')
    expect(record.currency).toEqual({ name: 'South African Rand', code: 'ZAR', symbol: 'R' })
    expect(record.languages).toEqual([
      'Sepedi', 'Sesotho', 'Setswana', 'siSwati', 'Tshivenda', 'itsonga',
      'Afrikaans', 'English', 'isiNdebele', 'isiXhosa', 'isiZulu', 'South African Sign Language',
    ])
    expect(record.languages).toHaveLength(12)
    // Preserved exactly as supplied, not silently corrected to "Xitsonga".
    expect(record.languages).toContain('itsonga')
  })

  it('Switzerland resolves exactly: Bern, CH/CHE, Swiss Franc · CHF, German/French/Italian/Romansh', () => {
    const record = getCountryRecord('switzerland')!
    expect(record.iso2).toBe('CH')
    expect(record.iso3).toBe('CHE')
    expect(record.capital).toBe('Bern')
    expect(record.currency).toEqual({ name: 'Swiss Franc', code: 'CHF', symbol: 'CHF' })
    expect(record.languages).toEqual(['German', 'French', 'Italian', 'Romansh'])
  })

  it('Trinidad and Tobago resolves exactly: Port of Spain, TT/TTO, TTD · TT$, English only', () => {
    const record = getCountryRecord('trinidad-and-tobago')!
    expect(record.iso2).toBe('TT')
    expect(record.iso3).toBe('TTO')
    expect(record.capital).toBe('Port of Spain')
    expect(record.currency).toEqual({ name: 'Trinidad and Tobago Dollar', code: 'TTD', symbol: 'TT$' })
    expect(record.languages).toEqual(['English'])
  })

  it('Turkmenistan resolves exactly: Ashgabat, TM/TKM, Turkmenistani Manat · m, Turkmen/Russian', () => {
    const record = getCountryRecord('turkmenistan')!
    expect(record.iso2).toBe('TM')
    expect(record.iso3).toBe('TKM')
    expect(record.capital).toBe('Ashgabat')
    expect(record.currency).toEqual({ name: 'Turkmenistani Manat', code: 'TMT', symbol: 'm' })
    expect(record.languages).toEqual(['Turkmen', 'Russian'])
  })

  it('United Arab Emirates resolves exactly: Abu Dhabi, AE/ARE, AED · د.إ, Arabic/English', () => {
    const record = getCountryRecord('united-arab-emirates')!
    expect(record.iso2).toBe('AE')
    expect(record.iso3).toBe('ARE')
    expect(record.capital).toBe('Abu Dhabi')
    expect(record.currency).toEqual({ name: 'United Arab Emirates Dirham', code: 'AED', symbol: 'د.إ' })
    expect(record.languages).toEqual(['Arabic', 'English'])
  })

  it('United Kingdom resolves exactly: London, GB/GBR, GBP · £, English/Welsh/Scottish Gaelic/Irish/Scots — distinct from its own constituent country records', () => {
    const record = getCountryRecord('united-kingdom')!
    expect(record.iso2).toBe('GB')
    expect(record.iso3).toBe('GBR')
    expect(record.capital).toBe('London')
    expect(record.currency).toEqual({ name: 'Pound Sterling', code: 'GBP', symbol: '£' })
    expect(record.languages).toEqual(['English', 'Welsh', 'Scottish Gaelic', 'Irish', 'Scots'])
    // Distinct record from england/scotland/wales — this is the union-wide entry.
    const england = getCountryRecord('england')!
    expect(record).not.toEqual(england)
    expect(record.flag).toBe('/flags/GB.png')
    expect(england.flag).not.toBe('/flags/GB.png')
  })

  it('United States resolves exactly: Washington, D.C., US/USA, USD · $, English/Spanish', () => {
    const record = getCountryRecord('united-states')!
    expect(record.iso2).toBe('US')
    expect(record.iso3).toBe('USA')
    expect(record.capital).toBe('Washington, D.C.')
    expect(record.currency).toEqual({ name: 'United States Dollar', code: 'USD', symbol: '$' })
    expect(record.languages).toEqual(['English', 'Spanish'])
  })

  it('Vatican City resolves exactly: Vatican City, VA/VAT, EUR · €, Italian/Latin, with a fractional areaKm2', () => {
    const record = getCountryRecord('vatican-city')!
    expect(record.iso2).toBe('VA')
    expect(record.iso3).toBe('VAT')
    expect(record.capital).toBe('Vatican City')
    expect(record.currency).toEqual({ name: 'Euro', code: 'EUR', symbol: '€' })
    expect(record.languages).toEqual(['Italian', 'Latin'])
    // The only non-integer areaKm2 in the dataset — valid under `number`.
    expect(record.areaKm2).toBe(0.44)
    expect(Number.isInteger(record.areaKm2)).toBe(false)
  })

  it('every Study-data Batch C record resolves through getCountryRecord(), its flag matches the verified mapping, and none is answer-eligible', () => {
    for (const slug of STUDY_BATCH_C_SLUGS) {
      const record = getCountryRecord(slug)
      expect(record, slug).not.toBeNull()
      const code = countryCodeForSlug(slug)
      expect(record!.flag, slug).toBe(flagUrlForCode(code!))
      const country = findCountryById(slug)!
      expect(isEligibleAnswer(country), slug).toBe(false)
      expect(ANSWER_POOL.some((c) => c.id === slug), slug).toBe(false)
    }
  })

  it('formats each population per the display rounding rules, with no year/estimate text', () => {
    expect(formatPopulation(getCountryRecord('south-africa')!.population)).toBe('65 million')
    expect(formatPopulation(getCountryRecord('united-states')!.population)).toBe('349 million')
    expect(formatPopulation(getCountryRecord('vatican-city')!.population)).toBe('887')
  })

  it('invariant 3 is fully satisfied: every canonical COUNTRIES entry now has a COUNTRY_RECORDS entry, and COUNTRY_RECORDS has exactly 200 keys', () => {
    const withoutRecords = COUNTRIES.filter((c) => !(c.id in COUNTRY_RECORDS))
    expect(withoutRecords).toEqual([])
    expect(Object.keys(COUNTRY_RECORDS)).toHaveLength(200)
    expect(COUNTRIES).toHaveLength(200)
    expect(ANSWER_POOL).toHaveLength(172)
  })
})

describe('formatting helpers (how a future UI would consume the raw record)', () => {
  const record: CountryRecord = getCountryRecord('tanzania')!

  it('formats population rounded to the nearest million, with no unit', () => {
    expect(formatPopulation(record.population)).toBe('69 million')
  })

  it('formats the population year as a small secondary note, not a main stat', () => {
    expect(formatPopulationNote(record.population)).toBe('Estimate as of 2026')
  })

  it('formats currency with name, code and symbol', () => {
    const formatted = formatCurrency(record.currency)
    expect(formatted).toContain('Tanzanian Shilling')
    expect(formatted).toContain('TZS')
    expect(formatted).toContain('TSh')
  })
})

describe('formatPopulation() display rounding (geography-reference formatting; population.value itself is never modified)', () => {
  const pop = (value: number) => ({ value, asOf: 2026 })

  it('billions: up to 2 decimals, no unnecessary trailing zeroes', () => {
    expect(formatPopulation(pop(1_412_914_089))).toBe('1.41 billion')
    expect(formatPopulation(pop(1_400_000_000))).toBe('1.4 billion')
    expect(formatPopulation(pop(1_005_000_000))).toBe('1.01 billion')
  })

  it('999,999,999 rounds up cleanly across the billion boundary to "1 billion", not "1000 million"', () => {
    expect(formatPopulation(pop(999_999_999))).toBe('1 billion')
  })

  it('millions: nearest whole million, normal rounding (not always up)', () => {
    expect(formatPopulation(pop(349_035_494))).toBe('349 million')
    expect(formatPopulation(pop(58_834_800))).toBe('59 million')
    expect(formatPopulation(pop(1_499_999))).toBe('1 million')
    expect(formatPopulation(pop(1_500_000))).toBe('2 million')
  })

  it('thousands: nearest whole thousand, comma-grouped', () => {
    expect(formatPopulation(pop(999_499))).toBe('999,000')
    expect(formatPopulation(pop(244_994))).toBe('245,000')
    expect(formatPopulation(pop(40_368))).toBe('40,000')
    expect(formatPopulation(pop(1_499))).toBe('1,000')
    expect(formatPopulation(pop(1_500))).toBe('2,000')
  })

  it('999,500 rounds up cleanly across the million boundary to "1 million", not "1,000,000"', () => {
    expect(formatPopulation(pop(999_500))).toBe('1 million')
  })

  it('under 1,000: the exact whole number, never "0,000" or "0 thousand"', () => {
    expect(formatPopulation(pop(887))).toBe('887')
  })

  it('real country records produce the expected display strings', () => {
    expect(formatPopulation(getCountryRecord('china')!.population)).toBe('1.41 billion')
    expect(formatPopulation(getCountryRecord('india')!.population)).toBe('1.48 billion')
    expect(formatPopulation(getCountryRecord('united-states')!.population)).toBe('349 million')
    expect(formatPopulation(getCountryRecord('united-kingdom')!.population)).toBe('69 million')
    expect(formatPopulation(getCountryRecord('england')!.population)).toBe('59 million')
    expect(formatPopulation(getCountryRecord('sao-tome-and-principe')!.population)).toBe('245,000')
    expect(formatPopulation(getCountryRecord('liechtenstein')!.population)).toBe('40,000')
    expect(formatPopulation(getCountryRecord('vatican-city')!.population)).toBe('887')
  })

  it('never modifies the underlying population.value or population.asOf', () => {
    const raw = getCountryRecord('china')!.population
    expect(raw.value).toBe(1_412_914_089)
    expect(raw.asOf).toBe(2026)
    formatPopulation(raw)
    expect(raw.value).toBe(1_412_914_089)
    expect(raw.asOf).toBe(2026)
  })
})
