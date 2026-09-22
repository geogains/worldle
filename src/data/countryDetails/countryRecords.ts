/**
 * Raw, structured country data — the source of truth for verified facts.
 *
 * This is a distinct layer from CountryFactsRecord/CountryDetails in
 * types.ts: that layer is the *resolved, UI-facing* shape (flat display
 * strings, each independently falling back to a "Coming soon" placeholder).
 * This layer is the *authoring* shape — it matches an external country-data
 * schema field-for-field (nested currency/population objects, ISO2/ISO3,
 * official name, area) so a record can be pasted in from a data source
 * without reshaping it, and so structured sub-fields (e.g. currency.code,
 * population.asOf) are preserved for whatever the future UI wants to do
 * with them, rather than being flattened away immediately.
 *
 * A country's entry in COUNTRY_FACTS (records.ts) — what the existing
 * results page (CountryResultScreen / CountryResultCard) actually renders
 * today — is derived from its CountryRecord here via toCountryFactsRecord().
 * That keeps a single source of truth: edit a country here, and both this
 * raw layer and the existing results page pick it up.
 *
 * Keyed by country slug (= data/countries.ts Country.id), same convention
 * as COUNTRY_CODES and COUNTRY_FACTS.
 */

export interface CountryCurrency {
  name: string
  code: string
  symbol: string
}

export interface CountryPopulation {
  value: number
  /**
   * The year this population figure is estimated as of. Deliberately not a
   * top-level "main stat" — it's metadata about `value`, meant to be shown
   * as a small secondary note (e.g. "Estimate as of 2026"), never as its
   * own headline figure. See formatPopulationNote().
   */
  asOf: number
}

export interface CountryRecord {
  name: string
  officialName: string
  /**
   * ISO 3166-1 alpha-2 code. Omitted for non-sovereign entities that have
   * no ISO 3166-1 country code of their own — e.g. England/Scotland/Wales,
   * constituent countries of the United Kingdom rather than sovereign
   * states. Never invent a value here to fill the gap; omit the field
   * instead. (Flag rendering does not depend on this field at all — see
   * COUNTRY_CODES in flags.ts, which is looked up by slug independently
   * and already supports a real ISO 3166-2 subdivision code for exactly
   * this case.)
   */
  iso2?: string
  /** ISO 3166-1 alpha-3 code. Omitted under the same rule as `iso2`. */
  iso3?: string

  capital: string
  currency: CountryCurrency
  population: CountryPopulation
  continent: string

  /**
   * PRINCIPAL LANGUAGES POLICY (locked after a semantic-consistency audit
   * found the earlier "principal languages useful to a geography learner"
   * wording was being applied inconsistently — see git history for the
   * full audit trail). This is deliberately NOT a complete list of a
   * country's legally official, national, recognised, regional, Indigenous
   * or minority languages. Include a language only if it is:
   *
   *  1. an ANCHOR — routinely used by the national government for
   *     nationwide administration, OR functions as a major nationwide
   *     lingua franca (>50% combined first+second-language reach or
   *     equivalent strong evidence); legal "official"/"national" status is
   *     supporting evidence only and never automatically qualifies a
   *     language on its own — where formal/procedural government use
   *     conflicts with evidence a language is no longer routinely used,
   *     prefer the current functional/usage evidence;
   *  2. OR spoken as a first/home language by >=10% of the national
   *     population (never total L1+L2, never an ethnic-population proxy
   *     unless no better data exists, never absolute speaker count).
   *
   * Regional-only official status does not qualify a language unless it
   * independently clears the 10% national threshold. Sign languages are
   * judged against the anchor criteria only (nationwide legal recognition
   * plus institutional function), never the spoken-language population
   * test, since comparable census data doesn't exist for them. A country
   * is never left with an empty array — where no official language is
   * declared, the de facto nationwide administrative language qualifies as
   * an anchor (e.g. Mexico -> Spanish, Taiwan -> Mandarin).
   */
  languages: string[]

  areaKm2: number

  /**
   * Public URL of the flag asset. Prefer resolving this via the existing
   * flags.ts (countryCodeForSlug + flagUrlForCode), which is what
   * CountryDetails.flagUrl actually uses — that mapping is verified against
   * the real files in public/flags/ (see flags.test.ts / audit-flags.ts).
   * This field exists so the record matches the source schema exactly and
   * so a caller with only a CountryRecord (no slug/lookup) still has a
   * flag URL; keep the two in sync when editing a record.
   */
  flag: string

  fact: string
}

/**
 * Verified country records, keyed by slug, alphabetically ordered.
 *
 * POLICY (revised for the Study feature — see Batch A note below): this
 * dataset is becoming the COMPLETE reference dataset for every canonical
 * entry in COUNTRIES, not just playable answers. The old rule — "scoped to
 * playable answers only... a record for a non-playable country would be
 * dead data" — is now obsolete and intentionally reversed. A country's
 * ANSWER_POOL/isEligibleAnswer status (normalized length 4-10, see
 * data/countries.ts) governs whether it can be a daily/practice *answer*;
 * it no longer governs whether it belongs in this dataset. The current
 * invariant (see countryRecords.test.ts) is:
 *   1. every COUNTRY_RECORDS key must correspond to a canonical COUNTRIES
 *      entry;
 *   2. every ANSWER_POOL entry must have a COUNTRY_RECORDS entry;
 *   3. eventually (once all Study-data batches land) every COUNTRIES entry
 *      should have a COUNTRY_RECORDS entry — NOT yet true mid-rollout, so
 *      the test tracks and reports the remaining gap rather than asserting
 *      it's already zero.
 *
 * Batch 1 (Albania .. Austria; Afghanistan and Antigua and Barbuda were
 * removed from the ORIGINAL submission at the time — both are valid
 * gameplay guesses and keep their canonical dataset entry and flag mapping,
 * but are too long to ever be selected as an answer: AFGHANISTAN is 11
 * letters, ANTIGUAANDBARBUDA is 17, both over MAX_ANSWER_LENGTH; both were
 * later added for real in Study-data Batch A, see below — this removal was
 * never about them being unworthy of a results page, only about the
 * now-obsolete "playable-only" policy), Batch 2 (Azerbaijan
 * .. Bhutan), Batch 3 (Bolivia .. Canada), Batch 4 (Chad .. Cyprus) and
 * Batch 5 (Czechia .. Estonia, all pre-verified as ANSWER_POOL members
 * before adding), Batch 6 (Eswatini .. Ghana, all pre-verified as
 * ANSWER_POOL members before adding), Batch 7 (Greece .. India, all
 * pre-verified as ANSWER_POOL members before adding), Batch 8 (Indonesia
 * .. Jordan, all pre-verified as ANSWER_POOL members before adding — "Ivory
 * Coast" keeps its gameplay display name and slug "ivory-coast" while
 * officialName remains "Republic of Côte d'Ivoire") and Batch 9 (Kazakhstan
 * .. Lesotho, all pre-verified as ANSWER_POOL members before adding —
 * Kosovo uses the project's existing non-ISO XK/XKS convention, see
 * COUNTRY_CODES in flags.ts) and Batch 10 (Liberia .. Malta, all
 * pre-verified as ANSWER_POOL members before adding — Mali follows its 2023
 * constitution: 13 national languages are official and French is a working
 * language only, so French is deliberately excluded from Mali's languages
 * array) and Batch 11 (Myanmar .. Norway, all pre-verified as ANSWER_POOL
 * members before adding — two current-law edge cases: New Zealand's English
 * became statutorily official under the English Language Act 2026 (in force
 * August 2026), so English is listed as official rather than merely de
 * facto; Niger's 2025 Charter of Refoundation makes Hausa the sole
 * national/official language, with French and English demoted to working
 * languages, so neither is listed here) and Batch 12 (Oman .. Qatar, all
 * pre-verified as ANSWER_POOL members before adding — Palestine's currency
 * object is the Israeli New Shekel because Palestine issues no national
 * currency and ILS is the principal currency used for everyday/official
 * transactions there; this is not documented anywhere as a Palestinian
 * national currency, and its supplied capital display value "East
 * Jerusalem" is preserved as-is, with no political commentary added) and
 * Batch 13 (Romania .. Singapore, all pre-verified as ANSWER_POOL members
 * before adding — Rwanda's three official languages follow its 2023
 * constitution and deliberately exclude Kiswahili/Swahili; "serbia" and
 * "kosovo" are distinct pre-existing records with their own iso codes,
 * capitals and areaKm2 — Serbia's supplied area is preserved exactly,
 * with no Kosovo-area addition) and Batch 14 (Slovakia .. Sweden, all
 * pre-verified as ANSWER_POOL members before adding — several nationwide
 * fields deliberately exclude territorially/minority co-official languages:
 * Slovenia excludes Italian/Hungarian, Spain excludes Catalan/Basque/
 * Galician/Valencian, Sweden excludes Finnish/Yiddish/Meänkieli/Romani Chib/
 * Sami, and Sri Lanka excludes English, which is the constitutional link
 * language rather than an official language in the same classification) and
 * Batch 15 (Syria .. Tuvalu, all pre-verified as ANSWER_POOL members before
 * adding — Syria's currency represents the post-1-January-2026
 * redenominated Syrian pound, still coded SYP; Taiwan's National Languages
 * Development Act gives equal legal status to multiple national languages
 * rather than designating one statutory official language (at the time,
 * this batch left Taiwan's languages array empty rather than inserting
 * Mandarin — see the note below on the later language-policy revision);
 * Tajikistan excludes Russian (constitutional language of interethnic
 * communication, not the state language); Timor-Leste excludes English/
 * Indonesian (working languages only); "turkey" keeps its gameplay display
 * name while officialName is "Republic of Türkiye" — same pattern as
 * "ivory-coast") and Batch 16 (Mauritius .. Mozambique, all pre-verified
 * as ANSWER_POOL members before adding; Mexico's Indigenous languages and
 * Spanish are national languages under Mexican law, not a sole statutory
 * official language — at the time, this batch left Mexico's and
 * Mauritius's languages arrays empty rather than inserting a principal
 * language (see the note below); Montenegro's five official languages are
 * preserved in full).
 *
 * LANGUAGE POLICY REVISION (semantic-audit follow-up, after Batch 17): the
 * `languages` field's meaning changed from "statutory official languages
 * only" to "principal languages useful to a geography learner" — see the
 * field's own doc comment above. As a direct result, Australia, Eritrea,
 * Taiwan, Mauritius and Mexico no longer have `languages: []`, and
 * Botswana, Malawi and Cabo Verde gained an additional de facto/national
 * language alongside their existing official one. No other record's
 * `languages` value changed in that revision.
 *
 * "mauritania" was deliberately EXCLUDED from Batch 16 — that task supplied
 * a full record for it, but public/flags/MR.png did not exist yet
 * (verified by directory listing) and inventing that asset path was out of
 * scope. It remained the sole documented flag-mapping gap (see
 * COUNTRY_CODES in flags.ts) until a real MR.png asset was added and
 * completed in its own follow-up: mauritania -> MR is now mapped in
 * flags.ts, and the record below uses the same data originally supplied
 * for Batch 16, unchanged.
 *
 * Batch 17 (Uganda .. Zimbabwe) is the final normal batch, all pre-verified
 * as ANSWER_POOL members before adding. Zimbabwe's currency is the
 * Zimbabwe Gold (ZWG, symbol ZiG) — verified against the rest of this
 * project (no ZWL/old-Zimbabwe-dollar reference exists anywhere else in
 * the codebase), so no contradiction was found and the supplied record is
 * used as-is.
 *
 * With the mauritania follow-up and Batch 17 both complete, every playable
 * (ANSWER_POOL) country had a COUNTRY_RECORDS entry — 169 of 169 at the
 * time.
 *
 * England, Scotland and Wales (a later task) extend the dataset further:
 * constituent countries of the United Kingdom, added to RAW_COUNTRY_NAMES
 * alongside the sovereign states, with complete COUNTRY_RECORDS entries
 * (not placeholders) from the moment they became playable answers. Their
 * `iso2`/`iso3` are omitted (see the CountryRecord field doc comments) —
 * no fake sovereign ISO code was invented for them. Population figures use
 * the latest available UK-statistical-source mid-year estimates (mid-2025,
 * asOf 2025 — not forced to 2026) rather than an invented or outdated
 * figure; see each record's own comment for its source. This brought the
 * total to 172 of 172 ANSWER_POOL countries populated, plus Tanzania (the
 * original design/architecture test case) — every playable answer had a
 * complete record.
 *
 * Study-data Batch A (this task) begins a SEPARATE expansion: populating
 * canonical, NON-playable countries too (Afghanistan, Antigua and Barbuda,
 * Bosnia and Herzegovina, Burkina Faso, Central African Republic, Dominican
 * Republic, Equatorial Guinea, Guinea-Bissau, Liechtenstein, Marshall
 * Islands — 10 of the 28 canonical countries whose normalized name exceeds
 * MAX_ANSWER_LENGTH and can therefore never be a playable answer). Their
 * `/results/:slug` pages are now fully populated reference pages exactly
 * like any playable country's, with no ANSWER_POOL membership required —
 * see getCountryDetails()/buildCountryDetails() in index.ts, which have
 * never gated on answer-eligibility. Afghanistan and Antigua and Barbuda in
 * particular are the same two countries the Batch 1 note above describes
 * as originally removed for being non-playable — they are back, for real,
 * under the new policy.
 *
 * Study-data Batch B (this task) continues the same non-playable expansion:
 * Netherlands, North Macedonia, Papua New Guinea, Philippines, Saint Kitts
 * and Nevis, Saint Vincent and the Grenadines, São Tomé and Príncipe, Saudi
 * Arabia, Sierra Leone, Solomon Islands. Netherlands' capital is preserved
 * exactly as the constitutional capital, Amsterdam — not replaced with The
 * Hague (seat of government/parliament); see that record's own comment.
 *
 * Study-data Batch C (this task) is the FINAL batch of the non-playable
 * expansion: South Africa, Switzerland, Trinidad and Tobago, Turkmenistan,
 * United Arab Emirates, United Kingdom, United States, Vatican City. With
 * these 8 added, every one of the 200 canonical COUNTRIES entries now has a
 * COUNTRY_RECORDS entry — invariant 3 (see the project-level notes this
 * dataset was built against) is globally satisfied for the first time.
 * South Africa's and Switzerland's capitals follow the same
 * single-value-plus-fact-text convention already used for Bolivia, Sri
 * Lanka, Eswatini, Nauru and the Netherlands (contested/multiple/no
 * de-jure capital); see each record's own comment. There is no longer any
 * "every OTHER country stays on the placeholder path" caveat — this object
 * now covers all canonical countries, though 28 of them (the ones whose
 * normalized name falls outside MIN_ANSWER_LENGTH/MAX_ANSWER_LENGTH) remain
 * permanently non-playable regardless. See records.ts, whose COUNTRY_FACTS
 * derivation covers whatever is present in this object automatically (no
 * per-country listing needed).
 *
 * "congo" is the Republic of the Congo (CG/COG) — distinct from
 * "dr-congo" (Democratic Republic of the Congo, not yet in this dataset).
 * Do not conflate the two when adding DR Congo in a future batch.
 *
 * A later Principal Languages policy pass (see the `languages` field doc
 * comment above) replaced the earlier, inconsistently-applied "principal
 * languages useful to a geography learner" wording with a precise,
 * reproducible anchor/threshold rule, and rebuilt every record's
 * `languages` array against it — see each changed record's own comment
 * for its source/rationale. Bolivia's array, for example, was reduced from
 * a full 37-entry constitutional list to the 3 languages that clear the
 * anchor/10%-threshold bar (Spanish, Quechua, Aymara); see its own comment.
 *
 * No populated record currently uses `languages: []` — see the `languages`
 * field doc comment above for the current policy. hasValue() in
 * index.ts still treats a present empty array as verified (not missing
 * data) should a future record ever need one, but CountryResultCard no
 * longer has a special "no official language" fallback to render it.
 */
export const COUNTRY_RECORDS: Readonly<Record<string, CountryRecord>> = Object.freeze({
  albania: {
    name: 'Albania',
    officialName: 'Republic of Albania',
    iso2: 'AL',
    iso3: 'ALB',
    capital: 'Tirana',
    currency: Object.freeze({ name: 'Albanian Lek', code: 'ALL', symbol: 'L' }),
    population: Object.freeze({ value: 2_751_025, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Albanian'],
    areaKm2: 28_748,
    flag: '/flags/AL.png',
    fact: 'Albania is one of the few countries in Europe with both Adriatic and Ionian coastlines.',
  },
  algeria: {
    name: 'Algeria',
    officialName: "People's Democratic Republic of Algeria",
    iso2: 'DZ',
    iso3: 'DZA',
    capital: 'Algiers',
    currency: Object.freeze({ name: 'Algerian Dinar', code: 'DZD', symbol: 'د.ج' }),
    population: Object.freeze({ value: 48_028_334, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Arabic', 'Tamazight'],
    areaKm2: 2_381_741,
    flag: '/flags/DZ.png',
    fact: 'Algeria is the largest country in Africa by total area.',
  },
  andorra: {
    name: 'Andorra',
    officialName: 'Principality of Andorra',
    iso2: 'AD',
    iso3: 'AND',
    capital: 'Andorra la Vella',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 83_753, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Catalan'],
    areaKm2: 468,
    flag: '/flags/AD.png',
    fact: 'Andorra is a small landlocked country in the Pyrenees between France and Spain.',
  },
  angola: {
    name: 'Angola',
    officialName: 'Republic of Angola',
    iso2: 'AO',
    iso3: 'AGO',
    capital: 'Luanda',
    currency: Object.freeze({ name: 'Angolan Kwanza', code: 'AOA', symbol: 'Kz' }),
    population: Object.freeze({ value: 40_215_179, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Portuguese'],
    areaKm2: 1_246_700,
    flag: '/flags/AO.png',
    fact: 'Angola has a short section of coastline belonging to the exclave of Cabinda, separated from the rest of the country.',
  },
  argentina: {
    name: 'Argentina',
    officialName: 'Argentine Republic',
    iso2: 'AR',
    iso3: 'ARG',
    capital: 'Buenos Aires',
    currency: Object.freeze({ name: 'Argentine Peso', code: 'ARS', symbol: '$' }),
    population: Object.freeze({ value: 46_003_734, asOf: 2026 }),
    continent: 'South America',
    languages: ['Spanish'],
    areaKm2: 2_780_400,
    flag: '/flags/AR.png',
    fact: 'Argentina is the largest Spanish-speaking country in the world by area.',
  },
  armenia: {
    name: 'Armenia',
    officialName: 'Republic of Armenia',
    iso2: 'AM',
    iso3: 'ARM',
    capital: 'Yerevan',
    currency: Object.freeze({ name: 'Armenian Dram', code: 'AMD', symbol: '֏' }),
    population: Object.freeze({ value: 2_930_915, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Armenian'],
    areaKm2: 29_743,
    flag: '/flags/AM.png',
    fact: 'Armenia was the first country to adopt Christianity as a state religion, traditionally dated to the early fourth century.',
  },
  australia: {
    name: 'Australia',
    officialName: 'Commonwealth of Australia',
    iso2: 'AU',
    iso3: 'AUS',
    capital: 'Canberra',
    currency: Object.freeze({ name: 'Australian Dollar', code: 'AUD', symbol: '$' }),
    population: Object.freeze({ value: 27_227_096, asOf: 2026 }),
    continent: 'Oceania',
    // No official national language at the federal level, but English is
    // the overwhelming de facto national language — shown here per the
    // "principal languages useful to a geography learner" policy (see the
    // module comment above), not a strict statutory-official-only field.
    languages: ['English'],
    areaKm2: 7_692_024,
    flag: '/flags/AU.png',
    fact: 'Australia is the only country that occupies an entire continental mainland.',
  },
  austria: {
    name: 'Austria',
    officialName: 'Republic of Austria',
    iso2: 'AT',
    iso3: 'AUT',
    capital: 'Vienna',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 9_107_266, asOf: 2026 }),
    continent: 'Europe',
    languages: ['German'],
    areaKm2: 83_879,
    flag: '/flags/AT.png',
    fact: 'Austria is a landlocked Alpine country whose capital, Vienna, was the centre of the Habsburg Empire for centuries.',
  },
  azerbaijan: {
    name: 'Azerbaijan',
    officialName: 'Republic of Azerbaijan',
    iso2: 'AZ',
    iso3: 'AZE',
    capital: 'Baku',
    currency: Object.freeze({ name: 'Azerbaijani Manat', code: 'AZN', symbol: '₼' }),
    population: Object.freeze({ value: 10_454_855, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Azerbaijani'],
    areaKm2: 86_600,
    flag: '/flags/AZ.png',
    fact: 'Azerbaijan lies on the western shore of the Caspian Sea and is often described as a crossroads between Eastern Europe and Western Asia.',
  },
  bahamas: {
    name: 'Bahamas',
    officialName: 'Commonwealth of The Bahamas',
    iso2: 'BS',
    iso3: 'BHS',
    capital: 'Nassau',
    currency: Object.freeze({ name: 'Bahamian Dollar', code: 'BSD', symbol: '$' }),
    population: Object.freeze({ value: 404_628, asOf: 2026 }),
    continent: 'North America',
    languages: ['English'],
    areaKm2: 13_943,
    flag: '/flags/BS.png',
    fact: 'The Bahamas is an Atlantic archipelago made up of hundreds of islands and cays.',
  },
  bahrain: {
    name: 'Bahrain',
    officialName: 'Kingdom of Bahrain',
    iso2: 'BH',
    iso3: 'BHR',
    capital: 'Manama',
    currency: Object.freeze({ name: 'Bahraini Dinar', code: 'BHD', symbol: 'د.ب' }),
    population: Object.freeze({ value: 1_675_572, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Arabic'],
    areaKm2: 765,
    flag: '/flags/BH.png',
    fact: 'Bahrain is an island country in the Persian Gulf connected to Saudi Arabia by the King Fahd Causeway.',
  },
  bangladesh: {
    name: 'Bangladesh',
    officialName: "People's Republic of Bangladesh",
    iso2: 'BD',
    iso3: 'BGD',
    capital: 'Dhaka',
    currency: Object.freeze({ name: 'Bangladeshi Taka', code: 'BDT', symbol: '৳' }),
    population: Object.freeze({ value: 177_818_044, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Bangla'],
    areaKm2: 147_570,
    flag: '/flags/BD.png',
    fact: 'Bangladesh lies on the vast Ganges-Brahmaputra-Meghna delta, one of the world’s largest river deltas.',
  },
  barbados: {
    name: 'Barbados',
    officialName: 'Barbados',
    iso2: 'BB',
    iso3: 'BRB',
    capital: 'Bridgetown',
    currency: Object.freeze({ name: 'Barbadian Dollar', code: 'BBD', symbol: '$' }),
    population: Object.freeze({ value: 282_724, asOf: 2026 }),
    continent: 'North America',
    languages: ['English'],
    areaKm2: 430,
    flag: '/flags/BB.png',
    fact: 'Barbados is an island country in the eastern Caribbean and became a republic in 2021.',
  },
  belarus: {
    name: 'Belarus',
    officialName: 'Republic of Belarus',
    iso2: 'BY',
    iso3: 'BLR',
    capital: 'Minsk',
    currency: Object.freeze({ name: 'Belarusian Ruble', code: 'BYN', symbol: 'Br' }),
    population: Object.freeze({ value: 8_937_018, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Belarusian', 'Russian'],
    areaKm2: 207_600,
    flag: '/flags/BY.png',
    fact: 'Belarus is a landlocked Eastern European country with extensive forests, lakes and wetlands.',
  },
  belgium: {
    name: 'Belgium',
    officialName: 'Kingdom of Belgium',
    iso2: 'BE',
    iso3: 'BEL',
    capital: 'Brussels',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 11_774_642, asOf: 2026 }),
    continent: 'Europe',
    // Principal Languages policy: Dutch and French are both nationwide
    // federal-administrative anchors and each independently clear 10%.
    // German is one of Belgium's 3 federally-official languages but is
    // regionally confined to the small German-speaking Community (~1% of
    // the population) — not a nationwide administrative or lingua-franca
    // function, so it doesn't qualify under this field's definition.
    languages: ['Dutch', 'French'],
    areaKm2: 30_528,
    flag: '/flags/BE.png',
    fact: 'Brussels is home to major institutions of the European Union and the headquarters of NATO.',
  },
  belize: {
    name: 'Belize',
    officialName: 'Belize',
    iso2: 'BZ',
    iso3: 'BLZ',
    capital: 'Belmopan',
    currency: Object.freeze({ name: 'Belize Dollar', code: 'BZD', symbol: '$' }),
    population: Object.freeze({ value: 428_644, asOf: 2026 }),
    continent: 'North America',
    languages: ['English'],
    areaKm2: 22_966,
    flag: '/flags/BZ.png',
    fact: 'Belize is the only country in Central America whose official language is English.',
  },
  benin: {
    name: 'Benin',
    officialName: 'Republic of Benin',
    iso2: 'BJ',
    iso3: 'BEN',
    capital: 'Porto-Novo',
    currency: Object.freeze({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' }),
    population: Object.freeze({ value: 15_170_419, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: French is the administrative anchor.
    // Fon is spoken as a first/home language by 20% of the population
    // (explicitly distinguished in source data from the larger 38.4%
    // ethnic-Fon figure), clearing the 10% threshold on real language-use
    // data.
    languages: ['French', 'Fon'],
    areaKm2: 114_763,
    flag: '/flags/BJ.png',
    fact: 'Benin is historically associated with the Kingdom of Dahomey and is one of the traditional heartlands of the Vodun religion.',
  },
  bhutan: {
    name: 'Bhutan',
    officialName: 'Kingdom of Bhutan',
    iso2: 'BT',
    iso3: 'BTN',
    capital: 'Thimphu',
    currency: Object.freeze({ name: 'Bhutanese Ngultrum', code: 'BTN', symbol: 'Nu.' }),
    population: Object.freeze({ value: 802_214, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Dzongkha'],
    areaKm2: 38_394,
    flag: '/flags/BT.png',
    fact: 'Bhutan is famous for using Gross National Happiness alongside conventional economic measures when thinking about national development.',
  },
  bolivia: {
    name: 'Bolivia',
    officialName: 'Plurinational State of Bolivia',
    iso2: 'BO',
    iso3: 'BOL',
    capital: 'Sucre',
    currency: Object.freeze({ name: 'Bolivian Boliviano', code: 'BOB', symbol: 'Bs.' }),
    population: Object.freeze({ value: 12_749_291, asOf: 2026 }),
    continent: 'South America',
    // Principal Languages policy (see the `languages` field doc comment):
    // Bolivia's constitution recognises 37 official languages, but only
    // Spanish (nationwide administrative anchor) and Quechua/Aymara (each
    // ≥10% first-language share, 2012 census, INE Bolivia) clear the
    // concise geography-learning bar. The other 34 are each native to a
    // small fraction of a percent and are legally official but not
    // principal languages under this field's definition.
    languages: ['Spanish', 'Quechua', 'Aymara'],
    areaKm2: 1_098_581,
    flag: '/flags/BO.png',
    fact: "Sucre is Bolivia's constitutional capital, while La Paz is the seat of the national government.",
  },
  botswana: {
    name: 'Botswana',
    officialName: 'Republic of Botswana',
    iso2: 'BW',
    iso3: 'BWA',
    capital: 'Gaborone',
    currency: Object.freeze({ name: 'Botswana Pula', code: 'BWP', symbol: 'P' }),
    population: Object.freeze({ value: 2_603_388, asOf: 2026 }),
    continent: 'Africa',
    // English is the sole statutory official language, but Setswana is the
    // de facto national language spoken/understood by the vast majority —
    // included per the "principal languages" policy (see module comment).
    languages: ['English', 'Setswana'],
    areaKm2: 581_730,
    flag: '/flags/BW.png',
    fact: 'Botswana is home to the Okavango Delta, a vast inland delta where seasonal floodwaters spread across the Kalahari.',
  },
  brazil: {
    name: 'Brazil',
    officialName: 'Federative Republic of Brazil',
    iso2: 'BR',
    iso3: 'BRA',
    capital: 'Brasília',
    currency: Object.freeze({ name: 'Brazilian Real', code: 'BRL', symbol: 'R$' }),
    population: Object.freeze({ value: 213_562_666, asOf: 2026 }),
    continent: 'South America',
    languages: ['Portuguese'],
    areaKm2: 8_515_767,
    flag: '/flags/BR.png',
    fact: 'Brazil is the largest country in South America by both area and population.',
  },
  brunei: {
    name: 'Brunei',
    officialName: 'Brunei Darussalam',
    iso2: 'BN',
    iso3: 'BRN',
    capital: 'Bandar Seri Begawan',
    currency: Object.freeze({ name: 'Brunei Dollar', code: 'BND', symbol: '$' }),
    population: Object.freeze({ value: 469_775, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Malay'],
    areaKm2: 5_765,
    flag: '/flags/BN.png',
    fact: 'Brunei consists of two separate sections on the island of Borneo, divided by part of Malaysia.',
  },
  bulgaria: {
    name: 'Bulgaria',
    officialName: 'Republic of Bulgaria',
    iso2: 'BG',
    iso3: 'BGR',
    capital: 'Sofia',
    // This 2026 dataset uses EUR for Bulgaria, per the supplied source data.
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 6_667_659, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Bulgarian'],
    areaKm2: 110_994,
    flag: '/flags/BG.png',
    fact: 'Bulgarian is written using the Cyrillic alphabet, which originated in the medieval Bulgarian cultural sphere.',
  },
  burundi: {
    name: 'Burundi',
    officialName: 'Republic of Burundi',
    iso2: 'BI',
    iso3: 'BDI',
    capital: 'Gitega',
    currency: Object.freeze({ name: 'Burundian Franc', code: 'BIF', symbol: 'FBu' }),
    population: Object.freeze({ value: 14_729_157, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Kirundi', 'French'],
    areaKm2: 27_834,
    flag: '/flags/BI.png',
    fact: "Gitega became Burundi's political capital in 2019, replacing Bujumbura, which remains the country's largest city.",
  },
  'cabo-verde': {
    name: 'Cabo Verde',
    officialName: 'Republic of Cabo Verde',
    iso2: 'CV',
    iso3: 'CPV',
    capital: 'Praia',
    currency: Object.freeze({ name: 'Cape Verdean Escudo', code: 'CVE', symbol: 'Esc' }),
    population: Object.freeze({ value: 529_630, asOf: 2026 }),
    continent: 'Africa',
    // Cabo Verdean Creole (Kriolu) is the first/home language of nearly
    // the entire population; Portuguese is the sole statutory official
    // language, learned mainly through school and administration —
    // Kriolu is listed first per the "principal languages" policy (see
    // module comment).
    languages: ['Cabo Verdean Creole', 'Portuguese'],
    areaKm2: 4_033,
    flag: '/flags/CV.png',
    fact: 'Cabo Verde is a volcanic Atlantic archipelago located about 570 kilometres west of the African mainland.',
  },
  cambodia: {
    name: 'Cambodia',
    officialName: 'Kingdom of Cambodia',
    iso2: 'KH',
    iso3: 'KHM',
    capital: 'Phnom Penh',
    currency: Object.freeze({ name: 'Cambodian Riel', code: 'KHR', symbol: '៛' }),
    population: Object.freeze({ value: 18_051_219, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Khmer'],
    areaKm2: 181_035,
    flag: '/flags/KH.png',
    fact: "Cambodia is home to Angkor, the former capital region of the Khmer Empire and one of Southeast Asia's most important archaeological sites.",
  },
  cameroon: {
    name: 'Cameroon',
    officialName: 'Republic of Cameroon',
    iso2: 'CM',
    iso3: 'CMR',
    capital: 'Yaoundé',
    currency: Object.freeze({ name: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA' }),
    population: Object.freeze({ value: 30_640_817, asOf: 2026 }),
    continent: 'Africa',
    languages: ['English', 'French'],
    areaKm2: 475_442,
    flag: '/flags/CM.png',
    fact: 'Cameroon stretches from the Gulf of Guinea northward toward Lake Chad, giving it an unusually wide range of landscapes and climates.',
  },
  canada: {
    name: 'Canada',
    officialName: 'Canada',
    iso2: 'CA',
    iso3: 'CAN',
    capital: 'Ottawa',
    currency: Object.freeze({ name: 'Canadian Dollar', code: 'CAD', symbol: '$' }),
    population: Object.freeze({ value: 40_467_728, asOf: 2026 }),
    continent: 'North America',
    languages: ['English', 'French'],
    areaKm2: 9_984_670,
    flag: '/flags/CA.png',
    fact: 'Canada has the longest coastline of any country in the world.',
  },
  chad: {
    name: 'Chad',
    officialName: 'Republic of Chad',
    iso2: 'TD',
    iso3: 'TCD',
    capital: "N'Djamena",
    currency: Object.freeze({ name: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA' }),
    population: Object.freeze({ value: 21_560_380, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Arabic', 'French'],
    areaKm2: 1_284_000,
    flag: '/flags/TD.png',
    fact: 'Chad is named after Lake Chad, a large shallow lake shared with several neighbouring countries.',
  },
  chile: {
    name: 'Chile',
    officialName: 'Republic of Chile',
    iso2: 'CL',
    iso3: 'CHL',
    capital: 'Santiago',
    currency: Object.freeze({ name: 'Chilean Peso', code: 'CLP', symbol: '$' }),
    population: Object.freeze({ value: 19_945_850, asOf: 2026 }),
    continent: 'South America',
    languages: ['Spanish'],
    areaKm2: 756_102,
    flag: '/flags/CL.png',
    fact: 'Chile stretches for more than 4,000 kilometres along the Pacific coast of South America while remaining unusually narrow.',
  },
  china: {
    name: 'China',
    officialName: "People's Republic of China",
    iso2: 'CN',
    iso3: 'CHN',
    capital: 'Beijing',
    currency: Object.freeze({ name: 'Renminbi', code: 'CNY', symbol: '¥' }),
    population: Object.freeze({ value: 1_412_914_089, asOf: 2026 }),
    continent: 'Asia',
    // "Standard Chinese (Putonghua)" per the supplied source, not a shorthand.
    languages: ['Standard Chinese (Putonghua)'],
    areaKm2: 9_596_961,
    flag: '/flags/CN.png',
    fact: "China has one of the world's oldest continuous written traditions and is home to sections of the Great Wall stretching across northern China.",
  },
  colombia: {
    name: 'Colombia',
    officialName: 'Republic of Colombia',
    iso2: 'CO',
    iso3: 'COL',
    capital: 'Bogotá',
    currency: Object.freeze({ name: 'Colombian Peso', code: 'COP', symbol: '$' }),
    population: Object.freeze({ value: 53_936_226, asOf: 2026 }),
    continent: 'South America',
    // Spanish is Colombia's sole *national* official language; its many
    // Indigenous languages are officially recognised only within their
    // respective territories, not nationally — deliberately not listed here.
    languages: ['Spanish'],
    areaKm2: 1_141_748,
    flag: '/flags/CO.png',
    fact: 'Colombia is the only South American country with coastlines on both the Caribbean Sea and the Pacific Ocean.',
  },
  comoros: {
    name: 'Comoros',
    officialName: 'Union of the Comoros',
    iso2: 'KM',
    iso3: 'COM',
    capital: 'Moroni',
    currency: Object.freeze({ name: 'Comorian Franc', code: 'KMF', symbol: 'CF' }),
    population: Object.freeze({ value: 899_010, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Comorian (Shikomor)', 'French', 'Arabic'],
    areaKm2: 1_862,
    flag: '/flags/KM.png',
    fact: 'Comoros is a volcanic island nation in the Indian Ocean between Madagascar and the coast of Mozambique.',
  },
  congo: {
    // Republic of the Congo (CG/COG) — distinct from "dr-congo" (Democratic
    // Republic of the Congo, CD/COD). See data/countries.ts and flags.ts for
    // the same distinction; do not conflate the two records.
    name: 'Congo',
    officialName: 'Republic of the Congo',
    iso2: 'CG',
    iso3: 'COG',
    capital: 'Brazzaville',
    currency: Object.freeze({ name: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA' }),
    population: Object.freeze({ value: 6_637_785, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: French is the administrative anchor
    // (spoken by only ~30% of the population, 2006 study, but still the
    // sole official/administrative language regardless of speaker share).
    // Kituba is spoken by over 50% of the population — clears both the
    // 10% threshold and the nationwide-lingua-franca bar outright. Lingala
    // is also a national language and a major lingua franca in the
    // north/east, but no confirmed population-share figure was found —
    // flagged for follow-up, not guessed in.
    languages: ['French', 'Kituba'],
    areaKm2: 342_000,
    flag: '/flags/CG.png',
    fact: 'Brazzaville sits directly across the Congo River from Kinshasa, the capital of the Democratic Republic of the Congo.',
  },
  'costa-rica': {
    name: 'Costa Rica',
    officialName: 'Republic of Costa Rica',
    iso2: 'CR',
    iso3: 'CRI',
    capital: 'San José',
    currency: Object.freeze({ name: 'Costa Rican Colón', code: 'CRC', symbol: '₡' }),
    population: Object.freeze({ value: 5_174_789, asOf: 2026 }),
    continent: 'North America',
    languages: ['Spanish'],
    areaKm2: 51_100,
    flag: '/flags/CR.png',
    fact: 'Costa Rica abolished its standing army in 1948 and directs significant resources toward education and public services.',
  },
  croatia: {
    name: 'Croatia',
    officialName: 'Republic of Croatia',
    iso2: 'HR',
    iso3: 'HRV',
    capital: 'Zagreb',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 3_822_345, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Croatian'],
    areaKm2: 56_594,
    flag: '/flags/HR.png',
    fact: 'Croatia has more than a thousand islands, islets and reefs scattered along its Adriatic coastline.',
  },
  cuba: {
    name: 'Cuba',
    officialName: 'Republic of Cuba',
    iso2: 'CU',
    iso3: 'CUB',
    capital: 'Havana',
    currency: Object.freeze({ name: 'Cuban Peso', code: 'CUP', symbol: '$' }),
    population: Object.freeze({ value: 10_892_659, asOf: 2026 }),
    continent: 'North America',
    languages: ['Spanish'],
    areaKm2: 109_884,
    flag: '/flags/CU.png',
    fact: 'Cuba is the largest island in the Caribbean by land area.',
  },
  cyprus: {
    name: 'Cyprus',
    officialName: 'Republic of Cyprus',
    iso2: 'CY',
    iso3: 'CYP',
    capital: 'Nicosia',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 1_382_334, asOf: 2026 }),
    continent: 'Asia',
    // Principal Languages policy: Greek is the administrative anchor for
    // the Republic of Cyprus, the internationally-recognised state this
    // record represents. Turkish is still nominally co-official under the
    // 1960 constitution, and the often-cited "~20% Turkish speakers"
    // figure describes the whole island (including the Turkish-Cypriot-
    // administered north, de facto separate since 1974) — but within the
    // area the Republic of Cyprus actually administers, Turkish speakers
    // are close to 0% (one source cites 0.2%), clearing neither the
    // nationwide-administrative-anchor test nor the 10% threshold for the
    // entity this record represents.
    languages: ['Greek'],
    areaKm2: 9_251,
    flag: '/flags/CY.png',
    fact: 'Nicosia is the capital of Cyprus and remains divided by a United Nations buffer zone.',
  },
  czechia: {
    name: 'Czechia',
    officialName: 'Czech Republic',
    iso2: 'CZ',
    iso3: 'CZE',
    capital: 'Prague',
    currency: Object.freeze({ name: 'Czech Koruna', code: 'CZK', symbol: 'Kč' }),
    population: Object.freeze({ value: 10_527_781, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Czech'],
    areaKm2: 78_867,
    flag: '/flags/CZ.png',
    fact: "Prague's historic centre is known for landmarks such as Prague Castle, Charles Bridge and the medieval Old Town.",
  },
  denmark: {
    name: 'Denmark',
    officialName: 'Kingdom of Denmark',
    iso2: 'DK',
    iso3: 'DNK',
    capital: 'Copenhagen',
    currency: Object.freeze({ name: 'Danish Krone', code: 'DKK', symbol: 'kr' }),
    population: Object.freeze({ value: 6_023_520, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Danish'],
    areaKm2: 42_933,
    flag: '/flags/DK.png',
    fact: 'Denmark consists of the Jutland Peninsula and hundreds of islands, including Zealand, where Copenhagen is located.',
  },
  djibouti: {
    name: 'Djibouti',
    officialName: 'Republic of Djibouti',
    iso2: 'DJ',
    iso3: 'DJI',
    capital: 'Djibouti',
    currency: Object.freeze({ name: 'Djiboutian Franc', code: 'DJF', symbol: 'Fdj' }),
    population: Object.freeze({ value: 1_199_459, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: Arabic and French are both official/
    // administrative anchors. Somali (~524,000 speakers) and Afar
    // (~306,000 speakers) are each spoken as a first language by well over
    // 10% of Djibouti's ~1.1-1.2 million population (~47% and ~28%
    // respectively) — both clear the threshold independently of their
    // "national language" (2017) status.
    languages: ['Arabic', 'French', 'Somali', 'Afar'],
    areaKm2: 23_200,
    flag: '/flags/DJ.png',
    fact: "Djibouti sits beside the Bab el-Mandeb Strait, one of the world's most important maritime shipping routes.",
  },
  dominica: {
    name: 'Dominica',
    officialName: 'Commonwealth of Dominica',
    iso2: 'DM',
    iso3: 'DMA',
    capital: 'Roseau',
    currency: Object.freeze({ name: 'East Caribbean Dollar', code: 'XCD', symbol: '$' }),
    population: Object.freeze({ value: 65_511, asOf: 2026 }),
    continent: 'North America',
    languages: ['English'],
    areaKm2: 751,
    flag: '/flags/DM.png',
    fact: 'Dominica is known for its mountainous volcanic landscape, rainforests and the Boiling Lake in Morne Trois Pitons National Park.',
  },
  'dr-congo': {
    // Democratic Republic of the Congo (CD/COD) — distinct from "congo"
    // (Republic of the Congo, CG/COG). See the "congo" record's own comment
    // and data/countries.ts; do not conflate the two.
    name: 'DR Congo',
    officialName: 'Democratic Republic of the Congo',
    iso2: 'CD',
    iso3: 'COD',
    capital: 'Kinshasa',
    currency: Object.freeze({ name: 'Congolese Franc', code: 'CDF', symbol: 'FC' }),
    population: Object.freeze({ value: 116_452_162, asOf: 2026 }),
    continent: 'Africa',
    languages: ['French'],
    areaKm2: 2_344_858,
    flag: '/flags/CD.png',
    fact: "The Democratic Republic of the Congo contains a large share of the Congo Basin, the world's second-largest tropical rainforest.",
  },
  ecuador: {
    name: 'Ecuador',
    officialName: 'Republic of Ecuador',
    iso2: 'EC',
    iso3: 'ECU',
    capital: 'Quito',
    currency: Object.freeze({ name: 'United States Dollar', code: 'USD', symbol: '$' }),
    population: Object.freeze({ value: 18_444_506, asOf: 2026 }),
    continent: 'South America',
    // Spanish is Ecuador's sole *national* official language; Kichwa and
    // Shuar are constitutionally official for intercultural relations, not
    // nationally — deliberately not listed here (same rule as Colombia).
    languages: ['Spanish'],
    areaKm2: 283_561,
    flag: '/flags/EC.png',
    fact: 'Ecuador takes its name from the equator, which passes through the country just north of Quito.',
  },
  egypt: {
    name: 'Egypt',
    officialName: 'Arab Republic of Egypt',
    iso2: 'EG',
    iso3: 'EGY',
    capital: 'Cairo',
    currency: Object.freeze({ name: 'Egyptian Pound', code: 'EGP', symbol: 'E£' }),
    population: Object.freeze({ value: 120_101_175, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Arabic'],
    areaKm2: 1_001_450,
    flag: '/flags/EG.png',
    fact: 'Egypt is home to the pyramids of Giza, the only surviving wonder of the ancient Seven Wonders of the World.',
  },
  'el-salvador': {
    name: 'El Salvador',
    officialName: 'Republic of El Salvador',
    iso2: 'SV',
    iso3: 'SLV',
    capital: 'San Salvador',
    currency: Object.freeze({ name: 'United States Dollar', code: 'USD', symbol: '$' }),
    population: Object.freeze({ value: 6_391_253, asOf: 2026 }),
    continent: 'North America',
    languages: ['Spanish'],
    areaKm2: 21_041,
    flag: '/flags/SV.png',
    fact: 'El Salvador is the smallest country in mainland Central America by area.',
  },
  eritrea: {
    name: 'Eritrea',
    officialName: 'State of Eritrea',
    iso2: 'ER',
    iso3: 'ERI',
    capital: 'Asmara',
    currency: Object.freeze({ name: 'Eritrean Nakfa', code: 'ERN', symbol: 'Nfk' }),
    population: Object.freeze({ value: 3_682_669, asOf: 2026 }),
    continent: 'Africa',
    // Eritrea has no de jure official language — Tigrinya, Arabic and
    // English are its working languages. Shown here per the "principal
    // languages" policy (see module comment) rather than left empty.
    languages: ['Tigrinya', 'Arabic', 'English'],
    areaKm2: 117_600,
    flag: '/flags/ER.png',
    fact: 'Asmara is known for its well-preserved modernist architecture from the early twentieth century.',
  },
  estonia: {
    name: 'Estonia',
    officialName: 'Republic of Estonia',
    iso2: 'EE',
    iso3: 'EST',
    capital: 'Tallinn',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 1_331_062, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Estonian'],
    areaKm2: 45_339,
    flag: '/flags/EE.png',
    fact: 'Estonia is widely known for its digital public services and was one of the earliest countries to introduce nationwide online voting.',
  },
  eswatini: {
    name: 'Eswatini',
    officialName: 'Kingdom of Eswatini',
    iso2: 'SZ',
    iso3: 'SWZ',
    capital: 'Mbabane',
    currency: Object.freeze({ name: 'Swazi Lilangeni', code: 'SZL', symbol: 'L' }),
    population: Object.freeze({ value: 1_269_859, asOf: 2026 }),
    continent: 'Africa',
    // Eswatini has two national official languages: siSwati and English.
    languages: ['siSwati', 'English'],
    areaKm2: 17_364,
    flag: '/flags/SZ.png',
    fact: 'Eswatini is one of the world\'s few remaining absolute monarchies and is ruled by a king.',
  },
  ethiopia: {
    name: 'Ethiopia',
    officialName: 'Federal Democratic Republic of Ethiopia',
    iso2: 'ET',
    iso3: 'ETH',
    capital: 'Addis Ababa',
    currency: Object.freeze({ name: 'Ethiopian Birr', code: 'ETB', symbol: 'Br' }),
    population: Object.freeze({ value: 138_902_185, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: since the Council of Ministers' 29 Feb
    // 2020 decision, Amharic, Afaan Oromo, Tigrinya, Somali and Afar all
    // hold equal, current federal working-language status — genuine
    // administrative function, not just symbolic recognition — so all 5
    // qualify as anchors regardless of individual population share.
    languages: ['Amharic', 'Oromo', 'Somali', 'Tigrinya', 'Afar'],
    areaKm2: 1_104_300,
    flag: '/flags/ET.png',
    fact: 'Ethiopia uses its own calendar, which contains thirteen months and differs from the Gregorian calendar.',
  },
  fiji: {
    name: 'Fiji',
    officialName: 'Republic of Fiji',
    iso2: 'FJ',
    iso3: 'FJI',
    capital: 'Suva',
    currency: Object.freeze({ name: 'Fijian Dollar', code: 'FJD', symbol: '$' }),
    population: Object.freeze({ value: 937_282, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['English', 'iTaukei', 'Hindi'],
    areaKm2: 18_274,
    flag: '/flags/FJ.png',
    fact: 'Fiji is an archipelago of more than 300 islands in the South Pacific Ocean.',
  },
  finland: {
    name: 'Finland',
    officialName: 'Republic of Finland',
    iso2: 'FI',
    iso3: 'FIN',
    capital: 'Helsinki',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 5_621_739, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Finnish', 'Swedish'],
    areaKm2: 338_455,
    flag: '/flags/FI.png',
    fact: 'Finland is known as the Land of a Thousand Lakes, although it actually contains well over 100,000 lakes.',
  },
  france: {
    name: 'France',
    officialName: 'French Republic',
    iso2: 'FR',
    iso3: 'FRA',
    capital: 'Paris',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 66_746_401, asOf: 2026 }),
    continent: 'Europe',
    languages: ['French'],
    areaKm2: 551_695,
    flag: '/flags/FR.png',
    fact: 'France has territories in several parts of the world, giving it coastlines in the Atlantic, Pacific and Indian Oceans.',
  },
  gabon: {
    name: 'Gabon',
    officialName: 'Gabonese Republic',
    iso2: 'GA',
    iso3: 'GAB',
    capital: 'Libreville',
    currency: Object.freeze({ name: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA' }),
    population: Object.freeze({ value: 2_647_399, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: French is the administrative anchor.
    // Fang is Gabon's largest ethnic/language group and is widely
    // reported (secondary sources, not a primary census) as spoken at
    // home by ~32% of the population, clearing the 10% threshold; also
    // commonly described as Gabon's de facto national language.
    languages: ['French', 'Fang'],
    areaKm2: 267_668,
    flag: '/flags/GA.png',
    fact: 'Much of Gabon is covered by tropical rainforest, and the country has created extensive national parks to protect its wildlife.',
  },
  gambia: {
    name: 'Gambia',
    officialName: 'Republic of The Gambia',
    iso2: 'GM',
    iso3: 'GMB',
    capital: 'Banjul',
    currency: Object.freeze({ name: 'Gambian Dalasi', code: 'GMD', symbol: 'D' }),
    population: Object.freeze({ value: 2_884_079, asOf: 2026 }),
    continent: 'Africa',
    languages: ['English'],
    areaKm2: 11_295,
    flag: '/flags/GM.png',
    fact: 'The Gambia is a narrow country built around the Gambia River and is almost entirely surrounded by Senegal.',
  },
  georgia: {
    name: 'Georgia',
    officialName: 'Georgia',
    iso2: 'GE',
    iso3: 'GEO',
    capital: 'Tbilisi',
    currency: Object.freeze({ name: 'Georgian Lari', code: 'GEL', symbol: '₾' }),
    population: Object.freeze({ value: 3_804_642, asOf: 2026 }),
    continent: 'Asia',
    // Georgian is the sole *national* official language; Abkhazian is
    // co-official only within Abkhazia (territorial), not nationwide —
    // deliberately not listed here (same rule as Colombia/Ecuador).
    languages: ['Georgian'],
    areaKm2: 69_700,
    flag: '/flags/GE.png',
    fact: "Georgia has one of the world's oldest wine-making traditions, with archaeological evidence stretching back thousands of years.",
  },
  germany: {
    name: 'Germany',
    officialName: 'Federal Republic of Germany',
    iso2: 'DE',
    iso3: 'DEU',
    capital: 'Berlin',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 83_644_258, asOf: 2026 }),
    continent: 'Europe',
    languages: ['German'],
    areaKm2: 357_022,
    flag: '/flags/DE.png',
    fact: 'Germany is a federal country made up of 16 states known as Länder.',
  },
  ghana: {
    name: 'Ghana',
    officialName: 'Republic of Ghana',
    iso2: 'GH',
    iso3: 'GHA',
    capital: 'Accra',
    currency: Object.freeze({ name: 'Ghanaian Cedi', code: 'GHS', symbol: '₵' }),
    population: Object.freeze({ value: 35_697_557, asOf: 2026 }),
    continent: 'Africa',
    languages: ['English'],
    areaKm2: 238_533,
    flag: '/flags/GH.png',
    fact: 'Ghana was the first country in sub-Saharan Africa to gain independence from European colonial rule in 1957.',
  },
  greece: {
    name: 'Greece',
    officialName: 'Hellenic Republic',
    iso2: 'GR',
    iso3: 'GRC',
    capital: 'Athens',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 9_897_115, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Greek'],
    areaKm2: 131_957,
    flag: '/flags/GR.png',
    fact: 'Greece contains thousands of islands and is widely regarded as one of the major birthplaces of democracy and Western philosophy.',
  },
  grenada: {
    name: 'Grenada',
    officialName: 'Grenada',
    iso2: 'GD',
    iso3: 'GRD',
    capital: "Saint George's",
    currency: Object.freeze({ name: 'East Caribbean Dollar', code: 'XCD', symbol: '$' }),
    population: Object.freeze({ value: 117_362, asOf: 2026 }),
    continent: 'North America',
    languages: ['English'],
    areaKm2: 344,
    flag: '/flags/GD.png',
    fact: 'Grenada is known as the Spice Isle because of its long history of producing nutmeg, mace and other spices.',
  },
  guatemala: {
    name: 'Guatemala',
    officialName: 'Republic of Guatemala',
    iso2: 'GT',
    iso3: 'GTM',
    capital: 'Guatemala City',
    currency: Object.freeze({ name: 'Guatemalan Quetzal', code: 'GTQ', symbol: 'Q' }),
    population: Object.freeze({ value: 18_967_978, asOf: 2026 }),
    continent: 'North America',
    languages: ['Spanish'],
    areaKm2: 108_889,
    flag: '/flags/GT.png',
    fact: 'Guatemala was a major centre of Maya civilisation and is still home to numerous ancient Maya archaeological sites.',
  },
  guinea: {
    name: 'Guinea',
    officialName: 'Republic of Guinea',
    iso2: 'GN',
    iso3: 'GIN',
    capital: 'Conakry',
    currency: Object.freeze({ name: 'Guinean Franc', code: 'GNF', symbol: 'FG' }),
    population: Object.freeze({ value: 15_441_993, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: French is the administrative anchor
    // (used almost exclusively as a second language). 2014 census-derived
    // figures: Pular/Fula 35%, Maninka 25%, Susu 18% — all three clear the
    // 10% threshold by a wide margin.
    languages: ['French', 'Pular', 'Maninka', 'Susu'],
    areaKm2: 245_857,
    flag: '/flags/GN.png',
    fact: "Guinea's highlands contain the sources of several major West African rivers, including the Niger, Senegal and Gambia.",
  },
  guyana: {
    name: 'Guyana',
    officialName: 'Co-operative Republic of Guyana',
    iso2: 'GY',
    iso3: 'GUY',
    capital: 'Georgetown',
    currency: Object.freeze({ name: 'Guyanese Dollar', code: 'GYD', symbol: '$' }),
    population: Object.freeze({ value: 840_890, asOf: 2026 }),
    continent: 'South America',
    // English only — Guyanese Creolese is widely spoken but is not treated
    // as an official language in this schema.
    languages: ['English'],
    areaKm2: 214_969,
    flag: '/flags/GY.png',
    fact: 'Guyana is the only sovereign country in South America with English as its official language.',
  },
  haiti: {
    name: 'Haiti',
    officialName: 'Republic of Haiti',
    iso2: 'HT',
    iso3: 'HTI',
    capital: 'Port-au-Prince',
    currency: Object.freeze({ name: 'Haitian Gourde', code: 'HTG', symbol: 'G' }),
    population: Object.freeze({ value: 12_037_506, asOf: 2026 }),
    continent: 'North America',
    languages: ['Haitian Creole', 'French'],
    areaKm2: 27_750,
    flag: '/flags/HT.png',
    fact: 'Haiti became independent in 1804 following a successful revolution by enslaved and formerly enslaved people.',
  },
  honduras: {
    name: 'Honduras',
    officialName: 'Republic of Honduras',
    iso2: 'HN',
    iso3: 'HND',
    capital: 'Tegucigalpa',
    currency: Object.freeze({ name: 'Honduran Lempira', code: 'HNL', symbol: 'L' }),
    population: Object.freeze({ value: 11_184_760, asOf: 2026 }),
    continent: 'North America',
    languages: ['Spanish'],
    areaKm2: 112_492,
    flag: '/flags/HN.png',
    fact: 'Honduras is home to Copán, one of the most important archaeological sites of the ancient Maya civilisation.',
  },
  hungary: {
    name: 'Hungary',
    officialName: 'Hungary',
    iso2: 'HU',
    iso3: 'HUN',
    capital: 'Budapest',
    currency: Object.freeze({ name: 'Hungarian Forint', code: 'HUF', symbol: 'Ft' }),
    population: Object.freeze({ value: 9_585_818, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Hungarian'],
    areaKm2: 93_028,
    flag: '/flags/HU.png',
    fact: 'Budapest was formed in 1873 through the unification of Buda, Óbuda and Pest on opposite sides of the Danube.',
  },
  iceland: {
    name: 'Iceland',
    officialName: 'Iceland',
    iso2: 'IS',
    iso3: 'ISL',
    capital: 'Reykjavík',
    currency: Object.freeze({ name: 'Icelandic Króna', code: 'ISK', symbol: 'kr' }),
    population: Object.freeze({ value: 402_329, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Icelandic'],
    areaKm2: 103_000,
    flag: '/flags/IS.png',
    fact: 'Iceland sits on the Mid-Atlantic Ridge, making volcanic and geothermal activity a major feature of the country.',
  },
  india: {
    name: 'India',
    officialName: 'Republic of India',
    iso2: 'IN',
    iso3: 'IND',
    capital: 'New Delhi',
    currency: Object.freeze({ name: 'Indian Rupee', code: 'INR', symbol: '₹' }),
    population: Object.freeze({ value: 1_476_625_576, asOf: 2026 }),
    continent: 'Asia',
    // Hindi is the official language of the Union and English continues to
    // be used for official Union purposes — deliberately just these two,
    // not the full 22-language Eighth Schedule list, and Hindi is not
    // labelled a "national language" (India has none by law).
    languages: ['Hindi', 'English'],
    areaKm2: 3_287_263,
    flag: '/flags/IN.png',
    fact: "India is the world's most populous country and is home to an exceptionally diverse range of languages, cultures and landscapes.",
  },
  indonesia: {
    name: 'Indonesia',
    officialName: 'Republic of Indonesia',
    iso2: 'ID',
    iso3: 'IDN',
    capital: 'Jakarta',
    currency: Object.freeze({ name: 'Indonesian Rupiah', code: 'IDR', symbol: 'Rp' }),
    population: Object.freeze({ value: 287_886_782, asOf: 2026 }),
    continent: 'Asia',
    // Principal Languages policy: Indonesian is the sole official/national
    // administrative anchor. 2010 BPS (Statistics Indonesia) census data:
    // Javanese is spoken at home by 31.8% of the national population, and
    // Sundanese by ~15.5% (41.4 million speakers) — both independently
    // clear the 10% threshold on real language-use data, not an ethnic-
    // group proxy.
    languages: ['Indonesian', 'Javanese', 'Sundanese'],
    areaKm2: 1_904_569,
    flag: '/flags/ID.png',
    fact: "Indonesia is the world's largest archipelagic country, with thousands of islands stretching across Southeast Asia.",
  },
  iran: {
    name: 'Iran',
    officialName: 'Islamic Republic of Iran',
    iso2: 'IR',
    iso3: 'IRN',
    capital: 'Tehran',
    currency: Object.freeze({ name: 'Iranian Rial', code: 'IRR', symbol: '﷼' }),
    population: Object.freeze({ value: 93_168_497, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Persian'],
    areaKm2: 1_648_195,
    flag: '/flags/IR.png',
    fact: "Iran is home to one of the world's oldest continuous civilisations, with a recorded history stretching back thousands of years.",
  },
  iraq: {
    name: 'Iraq',
    officialName: 'Republic of Iraq',
    iso2: 'IQ',
    iso3: 'IRQ',
    capital: 'Baghdad',
    currency: Object.freeze({ name: 'Iraqi Dinar', code: 'IQD', symbol: 'ع.د' }),
    population: Object.freeze({ value: 48_007_437, asOf: 2026 }),
    continent: 'Asia',
    // Arabic and Kurdish are Iraq's two nationwide official languages;
    // Turkmen, Syriac and Armenian are official only in specific
    // administrative units, not nationwide — deliberately not listed here.
    languages: ['Arabic', 'Kurdish'],
    areaKm2: 438_317,
    flag: '/flags/IQ.png',
    fact: 'Much of ancient Mesopotamia lay within modern Iraq, including the lands between the Tigris and Euphrates rivers.',
  },
  ireland: {
    name: 'Ireland',
    officialName: 'Ireland',
    iso2: 'IE',
    iso3: 'IRL',
    capital: 'Dublin',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 5_356_950, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Irish', 'English'],
    areaKm2: 70_273,
    flag: '/flags/IE.png',
    fact: 'Ireland is often called the Emerald Isle because of its famously green landscape and mild Atlantic climate.',
  },
  israel: {
    name: 'Israel',
    officialName: 'State of Israel',
    iso2: 'IL',
    iso3: 'ISR',
    capital: 'Jerusalem',
    currency: Object.freeze({ name: 'Israeli New Shekel', code: 'ILS', symbol: '₪' }),
    population: Object.freeze({ value: 9_647_689, asOf: 2026 }),
    continent: 'Asia',
    // Hebrew only — Arabic has special status under current Israeli Basic
    // Law but is not entered as an equal statewide official language here.
    languages: ['Hebrew'],
    areaKm2: 22_072,
    flag: '/flags/IL.png',
    fact: 'Israel lies on the eastern Mediterranean coast and contains landscapes ranging from fertile coastal plains to the Negev Desert.',
  },
  italy: {
    name: 'Italy',
    officialName: 'Italian Republic',
    iso2: 'IT',
    iso3: 'ITA',
    capital: 'Rome',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 58_926_166, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Italian'],
    areaKm2: 302_073,
    flag: '/flags/IT.png',
    fact: 'Italy contains more UNESCO World Heritage Sites than almost any other country, reflecting its long cultural and artistic history.',
  },
  'ivory-coast': {
    // "Ivory Coast" is the gameplay display name (data/countries.ts); the
    // official name is "Republic of Côte d'Ivoire" — both are kept exactly
    // as supplied, matching the existing "congo"/"dr-congo" naming pattern.
    name: 'Ivory Coast',
    officialName: "Republic of Côte d'Ivoire",
    iso2: 'CI',
    iso3: 'CIV',
    capital: 'Yamoussoukro',
    currency: Object.freeze({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' }),
    population: Object.freeze({ value: 33_494_346, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: French is the administrative anchor.
    // Baoulé (Akan) is Ivory Coast's largest single language group —
    // independent sources put its native-speaker count at ~5.3 million
    // (2021) against a total population of ~28 million (~19%), clearing
    // the 10% threshold. Dioula functions as the country's main trade
    // lingua franca but no confirmed population-share figure was found —
    // flagged for follow-up, not guessed in.
    languages: ['French', 'Baoulé'],
    areaKm2: 322_463,
    flag: '/flags/CI.png',
    fact: "Côte d'Ivoire is one of the world's largest producers of cocoa beans.",
  },
  jamaica: {
    name: 'Jamaica',
    officialName: 'Jamaica',
    iso2: 'JM',
    iso3: 'JAM',
    capital: 'Kingston',
    currency: Object.freeze({ name: 'Jamaican Dollar', code: 'JMD', symbol: '$' }),
    population: Object.freeze({ value: 2_833_403, asOf: 2026 }),
    continent: 'North America',
    // English only — Jamaican Patois is widely spoken but not entered as an
    // official language in this schema.
    languages: ['English'],
    areaKm2: 10_991,
    flag: '/flags/JM.png',
    fact: 'Jamaica is the birthplace of reggae music and has had an outsized global influence on music and popular culture.',
  },
  japan: {
    name: 'Japan',
    officialName: 'Japan',
    iso2: 'JP',
    iso3: 'JPN',
    capital: 'Tokyo',
    currency: Object.freeze({ name: 'Japanese Yen', code: 'JPY', symbol: '¥' }),
    population: Object.freeze({ value: 122_427_731, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Japanese'],
    areaKm2: 377_975,
    flag: '/flags/JP.png',
    fact: 'Japan is an island nation made up of thousands of islands, with four main islands accounting for most of its land area.',
  },
  jordan: {
    name: 'Jordan',
    officialName: 'Hashemite Kingdom of Jordan',
    iso2: 'JO',
    iso3: 'JOR',
    capital: 'Amman',
    currency: Object.freeze({ name: 'Jordanian Dinar', code: 'JOD', symbol: 'د.ا' }),
    population: Object.freeze({ value: 11_589_532, asOf: 2026 }),
    continent: 'Asia',
    // Arabic only — English is widely used but is not official.
    languages: ['Arabic'],
    areaKm2: 89_342,
    flag: '/flags/JO.png',
    fact: 'Jordan is home to Petra, the ancient rock-cut city that was once a major trading centre of the Nabataean kingdom.',
  },
  kazakhstan: {
    name: 'Kazakhstan',
    officialName: 'Republic of Kazakhstan',
    iso2: 'KZ',
    iso3: 'KAZ',
    capital: 'Astana',
    currency: Object.freeze({ name: 'Kazakhstani Tenge', code: 'KZT', symbol: '₸' }),
    population: Object.freeze({ value: 21_083_626, asOf: 2026 }),
    continent: 'Asia',
    // Kazakh is the state language; Russian is officially used alongside
    // it in state bodies and local government.
    languages: ['Kazakh', 'Russian'],
    areaKm2: 2_724_900,
    flag: '/flags/KZ.png',
    fact: "Kazakhstan is the world's largest landlocked country by area.",
  },
  kenya: {
    name: 'Kenya',
    officialName: 'Republic of Kenya',
    iso2: 'KE',
    iso3: 'KEN',
    capital: 'Nairobi',
    currency: Object.freeze({ name: 'Kenyan Shilling', code: 'KES', symbol: 'KSh' }),
    population: Object.freeze({ value: 58_636_412, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: Swahili and English are both official
    // and administrative anchors. Kikuyu is Kenya's largest single
    // mother-tongue at ~12.7% (Afrobarometer household-language survey),
    // independently clearing the 10% first-language threshold.
    languages: ['Swahili', 'English', 'Kikuyu'],
    areaKm2: 580_367,
    flag: '/flags/KE.png',
    fact: 'Kenya is crossed by the equator and contains landscapes ranging from the Great Rift Valley to the Indian Ocean coast.',
  },
  kiribati: {
    name: 'Kiribati',
    officialName: 'Republic of Kiribati',
    iso2: 'KI',
    iso3: 'KIR',
    capital: 'South Tarawa',
    currency: Object.freeze({ name: 'Australian Dollar', code: 'AUD', symbol: '$' }),
    population: Object.freeze({ value: 138_445, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['Gilbertese', 'English'],
    areaKm2: 811,
    flag: '/flags/KI.png',
    fact: 'Kiribati is the only country whose territory lies in all four hemispheres.',
  },
  kosovo: {
    // XK/XKS is the project's existing non-ISO convention for Kosovo (see
    // the module comment above COUNTRY_CODES in flags.ts) — not an official
    // ISO 3166-1 assignment, kept exactly as the rest of the app uses it.
    // Population is UN WPP-derived rather than the Worldometer country
    // table used for most other records here; preserved exactly as supplied.
    name: 'Kosovo',
    officialName: 'Republic of Kosovo',
    iso2: 'XK',
    iso3: 'XKS',
    capital: 'Pristina',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 1_798_188, asOf: 2026 }),
    continent: 'Europe',
    // Albanian and Serbian are Kosovo's nationwide official languages;
    // Turkish, Bosnian and Roma have official status only at the
    // municipal/local level, not nationwide — deliberately not listed here.
    languages: ['Albanian', 'Serbian'],
    areaKm2: 10_887,
    flag: '/flags/XK.png',
    fact: 'Kosovo is a landlocked territory in the Balkans whose population is predominantly Albanian-speaking.',
  },
  kuwait: {
    name: 'Kuwait',
    officialName: 'State of Kuwait',
    iso2: 'KW',
    iso3: 'KWT',
    capital: 'Kuwait City',
    currency: Object.freeze({ name: 'Kuwaiti Dinar', code: 'KWD', symbol: 'د.ك' }),
    population: Object.freeze({ value: 5_102_773, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Arabic'],
    areaKm2: 17_818,
    flag: '/flags/KW.png',
    fact: "The Kuwaiti dinar is one of the world's highest-valued currency units by exchange rate.",
  },
  kyrgyzstan: {
    name: 'Kyrgyzstan',
    officialName: 'Kyrgyz Republic',
    iso2: 'KG',
    iso3: 'KGZ',
    capital: 'Bishkek',
    currency: Object.freeze({ name: 'Kyrgyzstani Som', code: 'KGS', symbol: 'сом' }),
    population: Object.freeze({ value: 7_400_465, asOf: 2026 }),
    continent: 'Asia',
    // Kyrgyz is the state language and Russian is an official language.
    languages: ['Kyrgyz', 'Russian'],
    areaKm2: 199_951,
    flag: '/flags/KG.png',
    fact: 'Most of Kyrgyzstan is mountainous, with the Tian Shan range covering much of the country.',
  },
  laos: {
    name: 'Laos',
    officialName: "Lao People's Democratic Republic",
    iso2: 'LA',
    iso3: 'LAO',
    capital: 'Vientiane',
    currency: Object.freeze({ name: 'Lao Kip', code: 'LAK', symbol: '₭' }),
    population: Object.freeze({ value: 7_974_017, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Lao'],
    areaKm2: 236_800,
    flag: '/flags/LA.png',
    fact: 'Laos is the only landlocked country in Southeast Asia.',
  },
  latvia: {
    name: 'Latvia',
    officialName: 'Republic of Latvia',
    iso2: 'LV',
    iso3: 'LVA',
    capital: 'Riga',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 1_835_935, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Latvian'],
    areaKm2: 64_589,
    flag: '/flags/LV.png',
    fact: 'Latvia is one of the three Baltic states and has a long coastline along the Baltic Sea.',
  },
  lebanon: {
    name: 'Lebanon',
    officialName: 'Lebanese Republic',
    iso2: 'LB',
    iso3: 'LBN',
    capital: 'Beirut',
    currency: Object.freeze({ name: 'Lebanese Pound', code: 'LBP', symbol: 'ل.ل' }),
    population: Object.freeze({ value: 5_897_467, asOf: 2026 }),
    continent: 'Asia',
    // Arabic only — French has legally permitted uses but is not treated
    // as a co-equal nationwide official language in this schema.
    languages: ['Arabic'],
    areaKm2: 10_452,
    flag: '/flags/LB.png',
    fact: 'Lebanon is home to ancient cities such as Byblos, which has been inhabited for thousands of years.',
  },
  lesotho: {
    name: 'Lesotho',
    officialName: 'Kingdom of Lesotho',
    iso2: 'LS',
    iso3: 'LSO',
    capital: 'Maseru',
    currency: Object.freeze({ name: 'Lesotho Loti', code: 'LSL', symbol: 'L' }),
    population: Object.freeze({ value: 2_389_336, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Sesotho', 'English'],
    areaKm2: 30_355,
    flag: '/flags/LS.png',
    fact: 'Lesotho is the only independent country in the world whose entire territory lies more than 1,000 metres above sea level.',
  },
  liberia: {
    name: 'Liberia',
    officialName: 'Republic of Liberia',
    iso2: 'LR',
    iso3: 'LBR',
    capital: 'Monrovia',
    currency: Object.freeze({ name: 'Liberian Dollar', code: 'LRD', symbol: '$' }),
    population: Object.freeze({ value: 5_853_949, asOf: 2026 }),
    continent: 'Africa',
    languages: ['English'],
    areaKm2: 111_369,
    flag: '/flags/LR.png',
    fact: 'Liberia was founded in the nineteenth century as a settlement for formerly enslaved and free Black people from the United States.',
  },
  libya: {
    name: 'Libya',
    officialName: 'State of Libya',
    iso2: 'LY',
    iso3: 'LBY',
    capital: 'Tripoli',
    currency: Object.freeze({ name: 'Libyan Dinar', code: 'LYD', symbol: 'ل.د' }),
    population: Object.freeze({ value: 7_539_851, asOf: 2026 }),
    continent: 'Africa',
    // Arabic only — other Libyan languages have national/cultural
    // recognition but are not co-official statewide languages.
    languages: ['Arabic'],
    areaKm2: 1_759_540,
    flag: '/flags/LY.png',
    fact: 'Most of Libya lies within the Sahara Desert, making it one of the driest countries in the world.',
  },
  lithuania: {
    name: 'Lithuania',
    officialName: 'Republic of Lithuania',
    iso2: 'LT',
    iso3: 'LTU',
    capital: 'Vilnius',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 2_797_338, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Lithuanian'],
    areaKm2: 65_300,
    flag: '/flags/LT.png',
    fact: 'Lithuanian is one of the oldest surviving Indo-European languages and preserves many ancient linguistic features.',
  },
  luxembourg: {
    name: 'Luxembourg',
    officialName: 'Grand Duchy of Luxembourg',
    iso2: 'LU',
    iso3: 'LUX',
    capital: 'Luxembourg',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 687_448, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Luxembourgish', 'French', 'German'],
    areaKm2: 2_586,
    flag: '/flags/LU.png',
    fact: "Luxembourg is the world's only remaining sovereign grand duchy.",
  },
  madagascar: {
    name: 'Madagascar',
    officialName: 'Republic of Madagascar',
    iso2: 'MG',
    iso3: 'MDG',
    capital: 'Antananarivo',
    currency: Object.freeze({ name: 'Malagasy Ariary', code: 'MGA', symbol: 'Ar' }),
    population: Object.freeze({ value: 33_522_052, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Malagasy', 'French'],
    areaKm2: 587_041,
    flag: '/flags/MG.png',
    fact: "Madagascar's long isolation from other landmasses has produced wildlife found nowhere else on Earth, including many species of lemur.",
  },
  malawi: {
    name: 'Malawi',
    officialName: 'Republic of Malawi',
    iso2: 'MW',
    iso3: 'MWI',
    capital: 'Lilongwe',
    currency: Object.freeze({ name: 'Malawian Kwacha', code: 'MWK', symbol: 'MK' }),
    population: Object.freeze({ value: 22_785_535, asOf: 2026 }),
    continent: 'Africa',
    // The Malawi government lists English as the sole official language
    // and Chichewa as the "common language" (the de facto national
    // language spoken by the large majority) — both shown here per the
    // "principal languages" policy (see module comment).
    languages: ['English', 'Chichewa'],
    areaKm2: 118_484,
    flag: '/flags/MW.png',
    fact: "Lake Malawi occupies a large part of the country's eastern side and is famous for its extraordinary diversity of cichlid fish.",
  },
  malaysia: {
    name: 'Malaysia',
    officialName: 'Malaysia',
    iso2: 'MY',
    iso3: 'MYS',
    capital: 'Kuala Lumpur',
    currency: Object.freeze({ name: 'Malaysian Ringgit', code: 'MYR', symbol: 'RM' }),
    population: Object.freeze({ value: 36_385_115, asOf: 2026 }),
    continent: 'Asia',
    // Malay only — English, Mandarin and Tamil are widely spoken but are
    // deliberately not listed as official here.
    languages: ['Malay'],
    areaKm2: 330_803,
    flag: '/flags/MY.png',
    fact: 'Malaysia is divided into two main regions separated by the South China Sea: Peninsular Malaysia and Malaysian Borneo.',
  },
  maldives: {
    name: 'Maldives',
    officialName: 'Republic of Maldives',
    iso2: 'MV',
    iso3: 'MDV',
    capital: 'Malé',
    currency: Object.freeze({ name: 'Maldivian Rufiyaa', code: 'MVR', symbol: 'Rf' }),
    population: Object.freeze({ value: 531_517, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Dhivehi'],
    areaKm2: 300,
    flag: '/flags/MV.png',
    fact: "The Maldives is the world's lowest-lying country, with an average natural ground level only a few metres above sea level.",
  },
  mali: {
    // Principal Languages policy: Mali's 2023 constitution made 13
    // national languages official and demoted French to a working
    // language (excluded here on that basis alone either way). Home-
    // language shares (2022 census-cited figures, cross-checked against an
    // independent 2009 estimate) put Bambara at 46-50% and every other
    // named language at 9.4% or below (Fula is the next-largest at
    // 8.2-9.4%) — only Bambara clears the 10% threshold or functions as a
    // nationwide lingua franca (~80% combined L1+L2 reach); the other 12
    // are confirmed, not merely assumed, to fall short.
    name: 'Mali',
    officialName: 'Republic of Mali',
    iso2: 'ML',
    iso3: 'MLI',
    capital: 'Bamako',
    currency: Object.freeze({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' }),
    population: Object.freeze({ value: 25_932_275, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Bambara'],
    areaKm2: 1_240_192,
    flag: '/flags/ML.png',
    fact: 'The historic city of Timbuktu became a major centre of trade and Islamic scholarship during the height of the Mali and Songhai empires.',
  },
  malta: {
    name: 'Malta',
    officialName: 'Republic of Malta',
    iso2: 'MT',
    iso3: 'MLT',
    capital: 'Valletta',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 549_011, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Maltese', 'English'],
    areaKm2: 316,
    flag: '/flags/MT.png',
    fact: "Malta's prehistoric megalithic temples are among the oldest free-standing stone structures in the world.",
  },
  myanmar: {
    name: 'Myanmar',
    officialName: 'Republic of the Union of Myanmar',
    iso2: 'MM',
    iso3: 'MMR',
    capital: 'Naypyidaw',
    currency: Object.freeze({ name: 'Myanmar Kyat', code: 'MMK', symbol: 'K' }),
    population: Object.freeze({ value: 55_184_819, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Burmese'],
    areaKm2: 676_578,
    flag: '/flags/MM.png',
    fact: 'Myanmar is home to the ancient city of Bagan, where thousands of Buddhist temples and pagodas were built across a vast plain.',
  },
  namibia: {
    name: 'Namibia',
    officialName: 'Republic of Namibia',
    iso2: 'NA',
    iso3: 'NAM',
    capital: 'Windhoek',
    currency: Object.freeze({ name: 'Namibian Dollar', code: 'NAD', symbol: 'N$' }),
    population: Object.freeze({ value: 3_153_246, asOf: 2026 }),
    continent: 'Africa',
    languages: ['English'],
    areaKm2: 825_615,
    flag: '/flags/NA.png',
    fact: 'Namibia is home to the Namib Desert, one of the oldest deserts in the world.',
  },
  nauru: {
    // Nauru has no officially designated capital; Yaren is the
    // administrative centre and location of Parliament — preserved as the
    // display capital rather than converted to a placeholder.
    name: 'Nauru',
    officialName: 'Republic of Nauru',
    iso2: 'NR',
    iso3: 'NRU',
    capital: 'Yaren',
    currency: Object.freeze({ name: 'Australian Dollar', code: 'AUD', symbol: '$' }),
    population: Object.freeze({ value: 12_101, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['Nauruan', 'English'],
    areaKm2: 21,
    flag: '/flags/NR.png',
    fact: 'Nauru has no officially designated capital; government offices and Parliament are located in the Yaren District.',
  },
  nepal: {
    name: 'Nepal',
    officialName: 'Federal Democratic Republic of Nepal',
    iso2: 'NP',
    iso3: 'NPL',
    capital: 'Kathmandu',
    currency: Object.freeze({ name: 'Nepalese Rupee', code: 'NPR', symbol: 'रू' }),
    population: Object.freeze({ value: 29_629_410, asOf: 2026 }),
    continent: 'Asia',
    // Nepali only — provincial official languages are not listed here.
    languages: ['Nepali'],
    areaKm2: 147_516,
    flag: '/flags/NP.png',
    fact: 'Nepal is home to Mount Everest, the highest mountain above sea level in the world.',
  },
  'new-zealand': {
    // English became statutorily official under the English Language Act
    // 2026 (in force August 2026) — listed as official here, not merely
    // de facto, per that current-law change.
    name: 'New Zealand',
    officialName: 'New Zealand',
    iso2: 'NZ',
    iso3: 'NZL',
    capital: 'Wellington',
    currency: Object.freeze({ name: 'New Zealand Dollar', code: 'NZD', symbol: '$' }),
    population: Object.freeze({ value: 5_287_479, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['English', 'Māori', 'New Zealand Sign Language'],
    areaKm2: 268_838,
    flag: '/flags/NZ.png',
    fact: 'New Zealand was the first self-governing country in the world to give women the right to vote in parliamentary elections.',
  },
  nicaragua: {
    name: 'Nicaragua',
    officialName: 'Republic of Nicaragua',
    iso2: 'NI',
    iso3: 'NIC',
    capital: 'Managua',
    currency: Object.freeze({ name: 'Nicaraguan Córdoba', code: 'NIO', symbol: 'C$' }),
    population: Object.freeze({ value: 7_097_329, asOf: 2026 }),
    continent: 'North America',
    // Spanish only — the Caribbean Coast languages are officially used
    // regionally, not nationwide, so they are deliberately not listed here.
    languages: ['Spanish'],
    areaKm2: 130_373,
    flag: '/flags/NI.png',
    fact: 'Nicaragua contains Lake Nicaragua, the largest freshwater lake in Central America.',
  },
  niger: {
    // Under the 2025 Charter of Refoundation, Hausa is the sole
    // national/official language; French and English are working
    // languages only, so neither is listed here.
    name: 'Niger',
    officialName: 'Republic of Niger',
    iso2: 'NE',
    iso3: 'NER',
    capital: 'Niamey',
    currency: Object.freeze({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' }),
    population: Object.freeze({ value: 28_814_878, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Hausa'],
    areaKm2: 1_267_000,
    flag: '/flags/NE.png',
    fact: "Much of Niger lies within the Sahara Desert, while the Niger River crosses the country's southwest.",
  },
  nigeria: {
    name: 'Nigeria',
    officialName: 'Federal Republic of Nigeria',
    iso2: 'NG',
    iso3: 'NGA',
    capital: 'Abuja',
    currency: Object.freeze({ name: 'Nigerian Naira', code: 'NGN', symbol: '₦' }),
    population: Object.freeze({ value: 242_431_832, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: English is the sole official/administrative
    // anchor. Nigeria has never held a national language census, but the
    // best available household-language survey (Statista/NOI Polls, 2022)
    // puts Hausa at 32%, Yoruba at 17% and Igbo at 13% as the main language
    // spoken at home — all three independently clear the 10% threshold, and
    // are cross-corroborated by independent ethnic-group-size estimates in
    // the same range. No stronger (census-tier) source exists for Nigeria.
    languages: ['English', 'Hausa', 'Yoruba', 'Igbo'],
    areaKm2: 923_768,
    flag: '/flags/NG.png',
    fact: "Nigeria is Africa's most populous country and is home to hundreds of ethnic groups and languages.",
  },
  'north-korea': {
    name: 'North Korea',
    officialName: "Democratic People's Republic of Korea",
    iso2: 'KP',
    iso3: 'PRK',
    capital: 'Pyongyang',
    currency: Object.freeze({ name: 'North Korean Won', code: 'KPW', symbol: '₩' }),
    population: Object.freeze({ value: 26_633_691, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Korean'],
    areaKm2: 120_538,
    flag: '/flags/KP.png',
    fact: 'North Korea occupies the northern portion of the Korean Peninsula and shares a heavily fortified border with South Korea.',
  },
  norway: {
    name: 'Norway',
    officialName: 'Kingdom of Norway',
    iso2: 'NO',
    iso3: 'NOR',
    capital: 'Oslo',
    currency: Object.freeze({ name: 'Norwegian Krone', code: 'NOK', symbol: 'kr' }),
    population: Object.freeze({ value: 5_652_989, asOf: 2026 }),
    continent: 'Europe',
    // Norwegian only for this nationwide field — not split into Bokmål and
    // Nynorsk, and Sami languages (equal/legal status under specific
    // statutory contexts, not this nationwide field) are not listed here.
    languages: ['Norwegian'],
    areaKm2: 385_207,
    flag: '/flags/NO.png',
    fact: "Norway's coastline is deeply cut by thousands of fjords carved by glaciers.",
  },
  oman: {
    name: 'Oman',
    officialName: 'Sultanate of Oman',
    iso2: 'OM',
    iso3: 'OMN',
    capital: 'Muscat',
    currency: Object.freeze({ name: 'Omani Rial', code: 'OMR', symbol: 'ر.ع.' }),
    population: Object.freeze({ value: 5_671_458, asOf: 2026 }),
    continent: 'Asia',
    // Arabic only — English is widely used but is not official.
    languages: ['Arabic'],
    areaKm2: 309_500,
    flag: '/flags/OM.png',
    fact: 'Oman contains the Musandam Peninsula, whose dramatic mountains overlook the Strait of Hormuz.',
  },
  pakistan: {
    name: 'Pakistan',
    officialName: 'Islamic Republic of Pakistan',
    iso2: 'PK',
    iso3: 'PAK',
    capital: 'Islamabad',
    currency: Object.freeze({ name: 'Pakistani Rupee', code: 'PKR', symbol: '₨' }),
    population: Object.freeze({ value: 259_299_791, asOf: 2026 }),
    continent: 'Asia',
    // Urdu is the national language and English continues to be used for
    // official purposes; provincial languages are not listed in this
    // nationwide field.
    languages: ['Urdu', 'English'],
    areaKm2: 881_913,
    flag: '/flags/PK.png',
    fact: 'Pakistan is home to K2, the second-highest mountain in the world.',
  },
  palau: {
    name: 'Palau',
    officialName: 'Republic of Palau',
    iso2: 'PW',
    iso3: 'PLW',
    capital: 'Ngerulmud',
    currency: Object.freeze({ name: 'United States Dollar', code: 'USD', symbol: '$' }),
    population: Object.freeze({ value: 17_614, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['Palauan', 'English'],
    areaKm2: 459,
    flag: '/flags/PW.png',
    fact: 'Palau is an island nation in the western Pacific famous for its marine biodiversity and limestone Rock Islands.',
  },
  palestine: {
    // Palestine issues no national currency; the currency object here is
    // the Israeli New Shekel because it is the principal currency used for
    // everyday and official transactions — not documented as a Palestinian
    // national currency. The Jordanian dinar and US dollar also circulate,
    // but the schema supports only one primary currency object, so this is
    // preserved exactly as supplied rather than expanded. The capital
    // display value "East Jerusalem" is likewise preserved as supplied,
    // with no political commentary added — not changed to Ramallah despite
    // Palestinian administrative institutions operating there.
    name: 'Palestine',
    officialName: 'State of Palestine',
    iso2: 'PS',
    iso3: 'PSE',
    capital: 'East Jerusalem',
    currency: Object.freeze({ name: 'Israeli New Shekel', code: 'ILS', symbol: '₪' }),
    population: Object.freeze({ value: 5_692_790, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Arabic'],
    areaKm2: 6_020,
    flag: '/flags/PS.png',
    fact: "Jericho in the West Bank is one of the world's oldest continuously inhabited settlements.",
  },
  panama: {
    name: 'Panama',
    officialName: 'Republic of Panama',
    iso2: 'PA',
    iso3: 'PAN',
    capital: 'Panama City',
    currency: Object.freeze({ name: 'Panamanian Balboa', code: 'PAB', symbol: 'B/.' }),
    population: Object.freeze({ value: 4_625_718, asOf: 2026 }),
    continent: 'North America',
    languages: ['Spanish'],
    areaKm2: 75_417,
    flag: '/flags/PA.png',
    fact: "The Panama Canal connects the Atlantic and Pacific Oceans and is one of the world's most important shipping routes.",
  },
  paraguay: {
    name: 'Paraguay',
    officialName: 'Republic of Paraguay',
    iso2: 'PY',
    iso3: 'PRY',
    capital: 'Asunción',
    currency: Object.freeze({ name: 'Paraguayan Guaraní', code: 'PYG', symbol: '₲' }),
    population: Object.freeze({ value: 7_095_279, asOf: 2026 }),
    continent: 'South America',
    languages: ['Spanish', 'Guaraní'],
    areaKm2: 406_752,
    flag: '/flags/PY.png',
    fact: 'Paraguay is one of the few countries in the Americas where an Indigenous language is spoken widely across the general population.',
  },
  peru: {
    name: 'Peru',
    officialName: 'Republic of Peru',
    iso2: 'PE',
    iso3: 'PER',
    capital: 'Lima',
    currency: Object.freeze({ name: 'Peruvian Sol', code: 'PEN', symbol: 'S/' }),
    population: Object.freeze({ value: 34_922_148, asOf: 2026 }),
    continent: 'South America',
    // Spanish only in this nationwide field — Quechua, Aymara and other
    // Indigenous languages are official where they predominate, but those
    // territorially official languages are not added here.
    languages: ['Spanish'],
    areaKm2: 1_285_216,
    flag: '/flags/PE.png',
    fact: 'Peru is home to Machu Picchu, the fifteenth-century Inca site high in the Andes.',
  },
  poland: {
    name: 'Poland',
    officialName: 'Republic of Poland',
    iso2: 'PL',
    iso3: 'POL',
    capital: 'Warsaw',
    currency: Object.freeze({ name: 'Polish Złoty', code: 'PLN', symbol: 'zł' }),
    population: Object.freeze({ value: 37_843_188, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Polish'],
    areaKm2: 312_696,
    flag: '/flags/PL.png',
    fact: "Poland is home to the Białowieża Forest, one of Europe's last large remnants of primeval lowland forest.",
  },
  portugal: {
    name: 'Portugal',
    officialName: 'Portuguese Republic',
    iso2: 'PT',
    iso3: 'PRT',
    capital: 'Lisbon',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 10_395_362, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Portuguese'],
    areaKm2: 92_212,
    flag: '/flags/PT.png',
    fact: 'Portugal includes the Atlantic archipelagos of the Azores and Madeira as well as its mainland territory.',
  },
  qatar: {
    name: 'Qatar',
    officialName: 'State of Qatar',
    iso2: 'QA',
    iso3: 'QAT',
    capital: 'Doha',
    currency: Object.freeze({ name: 'Qatari Riyal', code: 'QAR', symbol: 'ر.ق' }),
    population: Object.freeze({ value: 3_173_559, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Arabic'],
    areaKm2: 11_586,
    flag: '/flags/QA.png',
    fact: 'Qatar occupies a peninsula extending northward into the Persian Gulf from the Arabian Peninsula.',
  },
  romania: {
    name: 'Romania',
    officialName: 'Romania',
    iso2: 'RO',
    iso3: 'ROU',
    capital: 'Bucharest',
    currency: Object.freeze({ name: 'Romanian Leu', code: 'RON', symbol: 'lei' }),
    population: Object.freeze({ value: 18_800_605, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Romanian'],
    areaKm2: 238_397,
    flag: '/flags/RO.png',
    fact: "Romania is home to the Carpathian Mountains and the Danube Delta, one of Europe's largest and best-preserved river deltas.",
  },
  russia: {
    name: 'Russia',
    officialName: 'Russian Federation',
    iso2: 'RU',
    iso3: 'RUS',
    capital: 'Moscow',
    currency: Object.freeze({ name: 'Russian Ruble', code: 'RUB', symbol: '₽' }),
    population: Object.freeze({ value: 143_394_458, asOf: 2026 }),
    continent: 'Europe',
    // Russian only in this nationwide field — languages with state/official
    // status only within individual republics are not listed here.
    languages: ['Russian'],
    areaKm2: 17_098_246,
    flag: '/flags/RU.png',
    fact: 'Russia stretches across eleven time zones from Eastern Europe to the Pacific Ocean.',
  },
  rwanda: {
    name: 'Rwanda',
    officialName: 'Republic of Rwanda',
    iso2: 'RW',
    iso3: 'RWA',
    capital: 'Kigali',
    currency: Object.freeze({ name: 'Rwandan Franc', code: 'RWF', symbol: 'FRw' }),
    population: Object.freeze({ value: 14_889_693, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: Kinyarwanda (99.7% speak it, NISR 2022
    // census) and English (medium of instruction Primary 1 through
    // university since MINEDUC's 2019 policy) are confirmed anchors.
    // French is legally official but only 1.9% are literate in
    // Kinyarwanda+French (2022 NISR census) and government policy has
    // moved administration/education to English since 2008 — not a
    // routine current administrative function. Kiswahili is legally
    // official (2017) but national literacy is under 2% and Rwanda's own
    // Official Gazette does not publish in it — no confirmed anchor or
    // threshold basis for either.
    languages: ['Kinyarwanda', 'English'],
    areaKm2: 26_338,
    flag: '/flags/RW.png',
    fact: 'Rwanda is often called the Land of a Thousand Hills because of its mountainous and rolling landscape.',
  },
  'saint-lucia': {
    name: 'Saint Lucia',
    officialName: 'Saint Lucia',
    iso2: 'LC',
    iso3: 'LCA',
    capital: 'Castries',
    currency: Object.freeze({ name: 'East Caribbean Dollar', code: 'XCD', symbol: '$' }),
    population: Object.freeze({ value: 180_488, asOf: 2026 }),
    continent: 'North America',
    languages: ['English'],
    areaKm2: 617,
    flag: '/flags/LC.png',
    fact: 'Saint Lucia is famous for the Pitons, two volcanic peaks on its southwestern coast that form part of a UNESCO World Heritage Site.',
  },
  samoa: {
    name: 'Samoa',
    officialName: 'Independent State of Samoa',
    iso2: 'WS',
    iso3: 'WSM',
    capital: 'Apia',
    currency: Object.freeze({ name: 'Samoan Tala', code: 'WST', symbol: 'T$' }),
    population: Object.freeze({ value: 220_528, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['Samoan', 'English'],
    areaKm2: 2_842,
    flag: '/flags/WS.png',
    fact: 'Samoa moved west of the International Date Line in 2011, skipping 30 December entirely when it changed time zones.',
  },
  'san-marino': {
    // Capital and country name are both "San Marino" — same pattern as
    // Luxembourg (Batch 10), where the capital shares the country's name.
    name: 'San Marino',
    officialName: 'Republic of San Marino',
    iso2: 'SM',
    iso3: 'SMR',
    capital: 'San Marino',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 33_605, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Italian'],
    areaKm2: 61,
    flag: '/flags/SM.png',
    fact: "San Marino traditionally traces its founding to 301 CE and is one of the world's oldest surviving republics.",
  },
  senegal: {
    name: 'Senegal',
    officialName: 'Republic of Senegal',
    iso2: 'SN',
    iso3: 'SEN',
    capital: 'Dakar',
    currency: Object.freeze({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' }),
    population: Object.freeze({ value: 19_366_548, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: French is the administrative anchor.
    // ANSD (Senegal's national statistics office) census-derived home-
    // language shares: Wolof 53.5%, Pulaar 26.3%, Serer 9.6%, Jola 2.8%,
    // Mandinka 2.8%. Wolof and Pulaar both clear the 10% threshold; Serer
    // (9.6%) does not, despite also holding "national language" status —
    // legal status alone does not qualify it. Jola/Mandinka/Soninke are
    // also national languages but fall well short of 10%.
    languages: ['French', 'Wolof', 'Pulaar'],
    areaKm2: 196_722,
    flag: '/flags/SN.png',
    fact: "Senegal's Cap-Vert Peninsula contains the westernmost point of mainland Africa.",
  },
  serbia: {
    // Distinct from "kosovo" (its own separate playable record, with iso2
    // XK, capital Pristina, areaKm2 10_887) — Serbia's supplied area is
    // preserved exactly as given, with no Kosovo-area addition.
    name: 'Serbia',
    officialName: 'Republic of Serbia',
    iso2: 'RS',
    iso3: 'SRB',
    capital: 'Belgrade',
    currency: Object.freeze({ name: 'Serbian Dinar', code: 'RSD', symbol: 'дин.' }),
    population: Object.freeze({ value: 6_641_964, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Serbian'],
    areaKm2: 77_474,
    flag: '/flags/RS.png',
    fact: 'Belgrade stands at the meeting point of the Danube and Sava rivers and has been inhabited for thousands of years.',
  },
  seychelles: {
    name: 'Seychelles',
    officialName: 'Republic of Seychelles',
    iso2: 'SC',
    iso3: 'SYC',
    capital: 'Victoria',
    currency: Object.freeze({ name: 'Seychellois Rupee', code: 'SCR', symbol: '₨' }),
    population: Object.freeze({ value: 134_959, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Seychellois Creole', 'English', 'French'],
    areaKm2: 459,
    flag: '/flags/SC.png',
    fact: "Seychelles includes the Aldabra Atoll, home to one of the world's largest populations of giant tortoises.",
  },
  singapore: {
    // Principal Languages policy: English and Mandarin are each spoken at
    // home by roughly half of residents (Census of Population 2020,
    // SingStat) and English is the working administrative language.
    // Malay is constitutionally the national language (Art. 153A) but
    // functions today more symbolically (anthem, ceremonial) than as a
    // routine administrative/lingua-franca anchor, and its home-language
    // share (~9%) doesn't clear 10%; Tamil's home-language share (~2.5%,
    // SingStat 2020) doesn't either. Both remain constitutionally official
    // — see a future `languageNote` for that context, not this field.
    name: 'Singapore',
    officialName: 'Republic of Singapore',
    iso2: 'SG',
    iso3: 'SGP',
    capital: 'Singapore',
    currency: Object.freeze({ name: 'Singapore Dollar', code: 'SGD', symbol: '$' }),
    population: Object.freeze({ value: 5_905_748, asOf: 2026 }),
    continent: 'Asia',
    languages: ['English', 'Mandarin'],
    areaKm2: 735,
    flag: '/flags/SG.png',
    fact: 'Singapore is a city-state made up of its main island and dozens of smaller surrounding islands.',
  },
  slovakia: {
    name: 'Slovakia',
    officialName: 'Slovak Republic',
    iso2: 'SK',
    iso3: 'SVK',
    capital: 'Bratislava',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 5_451_342, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Slovak'],
    areaKm2: 49_035,
    flag: '/flags/SK.png',
    fact: "Bratislava lies close to both Austria and Hungary, making it one of Europe's most geographically compact capital regions.",
  },
  slovenia: {
    name: 'Slovenia',
    officialName: 'Republic of Slovenia',
    iso2: 'SI',
    iso3: 'SVN',
    capital: 'Ljubljana',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 2_114_573, asOf: 2026 }),
    continent: 'Europe',
    // Slovenian only in this nationwide field — Italian and Hungarian have
    // official status only in specified minority areas, not nationwide.
    languages: ['Slovenian'],
    areaKm2: 20_273,
    flag: '/flags/SI.png',
    fact: 'Slovenia combines Alpine mountains, Mediterranean coastline and extensive karst landscapes within a relatively small area.',
  },
  somalia: {
    name: 'Somalia',
    officialName: 'Federal Republic of Somalia',
    iso2: 'SO',
    iso3: 'SOM',
    capital: 'Mogadishu',
    currency: Object.freeze({ name: 'Somali Shilling', code: 'SOS', symbol: 'Sh.So.' }),
    population: Object.freeze({ value: 20_305_907, asOf: 2026 }),
    continent: 'Africa',
    // Somali is the constitutionally identified official language and
    // Arabic is the second state language.
    languages: ['Somali', 'Arabic'],
    areaKm2: 637_657,
    flag: '/flags/SO.png',
    fact: 'Somalia has the longest coastline of any country on mainland Africa.',
  },
  'south-korea': {
    name: 'South Korea',
    officialName: 'Republic of Korea',
    iso2: 'KR',
    iso3: 'KOR',
    capital: 'Seoul',
    currency: Object.freeze({ name: 'South Korean Won', code: 'KRW', symbol: '₩' }),
    population: Object.freeze({ value: 51_600_388, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Korean'],
    areaKm2: 100_210,
    flag: '/flags/KR.png',
    fact: 'The Korean alphabet, Hangul, was deliberately created in the fifteenth century during the reign of King Sejong.',
  },
  'south-sudan': {
    name: 'South Sudan',
    officialName: 'Republic of South Sudan',
    iso2: 'SS',
    iso3: 'SSD',
    capital: 'Juba',
    currency: Object.freeze({ name: 'South Sudanese Pound', code: 'SSP', symbol: 'SS£' }),
    population: Object.freeze({ value: 12_436_037, asOf: 2026 }),
    continent: 'Africa',
    // English only — Indigenous languages are constitutionally recognised
    // as national languages, but English is the official working language.
    languages: ['English'],
    areaKm2: 619_745,
    flag: '/flags/SS.png',
    fact: "South Sudan became independent in 2011, making it one of the world's newest internationally recognised countries.",
  },
  spain: {
    name: 'Spain',
    officialName: 'Kingdom of Spain',
    iso2: 'ES',
    iso3: 'ESP',
    capital: 'Madrid',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 47_850_793, asOf: 2026 }),
    continent: 'Europe',
    // Spanish only in this nationwide field — Catalan, Basque, Galician,
    // Valencian and other territorially co-official languages (co-official
    // in their respective autonomous communities under the Spanish
    // Constitution) are deliberately not listed here.
    languages: ['Spanish'],
    areaKm2: 505_990,
    flag: '/flags/ES.png',
    fact: 'Spain includes the Balearic Islands in the Mediterranean and the Canary Islands in the Atlantic Ocean.',
  },
  'sri-lanka': {
    name: 'Sri Lanka',
    officialName: 'Democratic Socialist Republic of Sri Lanka',
    iso2: 'LK',
    iso3: 'LKA',
    capital: 'Sri Jayawardenepura Kotte',
    currency: Object.freeze({ name: 'Sri Lankan Rupee', code: 'LKR', symbol: 'Rs' }),
    population: Object.freeze({ value: 23_348_315, asOf: 2026 }),
    continent: 'Asia',
    // Sinhala and Tamil only — English is constitutionally the link
    // language, not an official language in the same classification, so
    // it is deliberately not listed here.
    languages: ['Sinhala', 'Tamil'],
    areaKm2: 65_610,
    flag: '/flags/LK.png',
    fact: "Sri Lanka is one of the world's best-known tea-producing countries and gave its former name, Ceylon, to Ceylon tea.",
  },
  sudan: {
    name: 'Sudan',
    officialName: 'Republic of the Sudan',
    iso2: 'SD',
    iso3: 'SDN',
    capital: 'Khartoum',
    currency: Object.freeze({ name: 'Sudanese Pound', code: 'SDG', symbol: 'ج.س.' }),
    population: Object.freeze({ value: 53_282_719, asOf: 2026 }),
    continent: 'Africa',
    // Arabic and English are represented here as the nationwide official
    // working languages; regional/national languages are not added.
    languages: ['Arabic', 'English'],
    areaKm2: 1_886_068,
    flag: '/flags/SD.png',
    fact: 'Khartoum stands near the confluence of the Blue Nile and White Nile, which join to form the main Nile.',
  },
  suriname: {
    name: 'Suriname',
    officialName: 'Republic of Suriname',
    iso2: 'SR',
    iso3: 'SUR',
    capital: 'Paramaribo',
    currency: Object.freeze({ name: 'Surinamese Dollar', code: 'SRD', symbol: '$' }),
    population: Object.freeze({ value: 645_256, asOf: 2026 }),
    continent: 'South America',
    languages: ['Dutch'],
    areaKm2: 163_820,
    flag: '/flags/SR.png',
    fact: 'Suriname is the smallest sovereign country in South America by land area.',
  },
  sweden: {
    name: 'Sweden',
    officialName: 'Kingdom of Sweden',
    iso2: 'SE',
    iso3: 'SWE',
    capital: 'Stockholm',
    currency: Object.freeze({ name: 'Swedish Krona', code: 'SEK', symbol: 'kr' }),
    population: Object.freeze({ value: 10_701_047, asOf: 2026 }),
    continent: 'Europe',
    // Swedish only in this nationwide/state-language field — the principal
    // language and language of the public sector under the Language Act.
    // Finnish, Yiddish, Meänkieli, Romani Chib and Sami are protected
    // national minority languages, deliberately not listed here.
    languages: ['Swedish'],
    areaKm2: 450_295,
    flag: '/flags/SE.png',
    fact: "Sweden's right of public access, known as allemansrätten, gives people broad freedom to explore the countryside responsibly.",
  },
  syria: {
    // Currency intentionally represents the post-1-January-2026
    // redenominated Syrian pound (100 old pounds = 1 new pound) — still
    // coded SYP, not a new invented code, and not the pre-2026 denomination.
    name: 'Syria',
    officialName: 'Syrian Arab Republic',
    iso2: 'SY',
    iso3: 'SYR',
    capital: 'Damascus',
    currency: Object.freeze({ name: 'Syrian Pound', code: 'SYP', symbol: '£S' }),
    population: Object.freeze({ value: 26_472_497, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Arabic'],
    areaKm2: 185_180,
    flag: '/flags/SY.png',
    fact: "Damascus is one of the world's oldest continuously inhabited cities.",
  },
  taiwan: {
    // Principal Languages policy: Taiwan has no statutory single official
    // language (the 2019 National Languages Development Act instead gives
    // equal legal status to an open category of "national languages"), so
    // Mandarin is included via the no-official-language fallback (the de
    // facto administrative language). Hoklo/Taiwanese independently clears
    // the 10% first-language threshold on actual home-language use (29.7%,
    // Taiwan Normal University survey) — note this is the preferred Tier-1
    // metric; Hakka's *home-language* share (1.4%, same survey) does not
    // clear 10%, even though its *ethnic-heritage* share (11.2%) would —
    // heritage affiliation is a last-resort metric under this field's
    // speaker-metric hierarchy and is not used here since better data
    // exists.
    name: 'Taiwan',
    officialName: 'Republic of China (Taiwan)',
    iso2: 'TW',
    iso3: 'TWN',
    capital: 'Taipei',
    currency: Object.freeze({ name: 'New Taiwan Dollar', code: 'TWD', symbol: 'NT$' }),
    population: Object.freeze({ value: 23_011_292, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Mandarin', 'Hoklo/Taiwanese'],
    areaKm2: 36_197,
    flag: '/flags/TW.png',
    fact: 'Taiwan is an island in East Asia separated from the Asian mainland by the Taiwan Strait.',
  },
  tajikistan: {
    name: 'Tajikistan',
    officialName: 'Republic of Tajikistan',
    iso2: 'TJ',
    iso3: 'TJK',
    capital: 'Dushanbe',
    currency: Object.freeze({ name: 'Tajikistani Somoni', code: 'TJS', symbol: 'SM' }),
    population: Object.freeze({ value: 10_978_599, asOf: 2026 }),
    continent: 'Asia',
    // Tajik only — Russian has constitutional status as the language of
    // interethnic communication, not the state language, so it is
    // excluded under this schema.
    languages: ['Tajik'],
    areaKm2: 143_100,
    flag: '/flags/TJ.png',
    fact: 'Much of Tajikistan is mountainous, including large sections of the Pamir Mountains.',
  },
  thailand: {
    name: 'Thailand',
    officialName: 'Kingdom of Thailand',
    iso2: 'TH',
    iso3: 'THA',
    capital: 'Bangkok',
    currency: Object.freeze({ name: 'Thai Baht', code: 'THB', symbol: '฿' }),
    population: Object.freeze({ value: 71_559_614, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Thai'],
    areaKm2: 513_120,
    flag: '/flags/TH.png',
    fact: 'Thailand stretches from the mountains of mainland Southeast Asia to a long peninsula between the Andaman Sea and Gulf of Thailand.',
  },
  'timor-leste': {
    name: 'Timor-Leste',
    officialName: 'Democratic Republic of Timor-Leste',
    iso2: 'TL',
    iso3: 'TLS',
    capital: 'Dili',
    currency: Object.freeze({ name: 'United States Dollar', code: 'USD', symbol: '$' }),
    population: Object.freeze({ value: 1_436_923, asOf: 2026 }),
    continent: 'Asia',
    // Portuguese and Tetum only — English and Indonesian are working
    // languages, not official, so they are deliberately not listed here.
    languages: ['Portuguese', 'Tetum'],
    areaKm2: 14_874,
    flag: '/flags/TL.png',
    fact: 'Timor-Leste occupies the eastern half of the island of Timor and restored its independence in 2002.',
  },
  togo: {
    name: 'Togo',
    officialName: 'Togolese Republic',
    iso2: 'TG',
    iso3: 'TGO',
    capital: 'Lomé',
    currency: Object.freeze({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' }),
    population: Object.freeze({ value: 9_930_918, asOf: 2026 }),
    continent: 'Africa',
    languages: ['French'],
    areaKm2: 56_785,
    flag: '/flags/TG.png',
    fact: 'Togo is a narrow West African country stretching from the Gulf of Guinea north toward Burkina Faso.',
  },
  tonga: {
    name: 'Tonga',
    officialName: 'Kingdom of Tonga',
    iso2: 'TO',
    iso3: 'TON',
    capital: 'Nukuʻalofa',
    currency: Object.freeze({ name: 'Tongan Paʻanga', code: 'TOP', symbol: 'T$' }),
    population: Object.freeze({ value: 103_291, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['Tongan', 'English'],
    areaKm2: 747,
    flag: '/flags/TO.png',
    fact: 'Tonga is a Polynesian kingdom made up of more than 170 islands in the South Pacific.',
  },
  tunisia: {
    name: 'Tunisia',
    officialName: 'Republic of Tunisia',
    iso2: 'TN',
    iso3: 'TUN',
    capital: 'Tunis',
    currency: Object.freeze({ name: 'Tunisian Dinar', code: 'TND', symbol: 'DT' }),
    population: Object.freeze({ value: 12_415_138, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Arabic'],
    areaKm2: 163_610,
    flag: '/flags/TN.png',
    fact: 'Tunisia contains the northernmost point of the African mainland.',
  },
  turkey: {
    // Gameplay display name stays "Turkey"; officialName is "Republic of
    // Türkiye" — same pattern as "ivory-coast" (Republic of Côte d'Ivoire).
    name: 'Turkey',
    officialName: 'Republic of Türkiye',
    iso2: 'TR',
    iso3: 'TUR',
    capital: 'Ankara',
    currency: Object.freeze({ name: 'Turkish Lira', code: 'TRY', symbol: '₺' }),
    population: Object.freeze({ value: 87_926_082, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Turkish'],
    areaKm2: 783_562,
    flag: '/flags/TR.png',
    fact: 'Turkey spans parts of both southeastern Europe and western Asia, with the Bosporus separating its European and Asian territories.',
  },
  tuvalu: {
    name: 'Tuvalu',
    officialName: 'Tuvalu',
    iso2: 'TV',
    iso3: 'TUV',
    capital: 'Funafuti',
    currency: Object.freeze({ name: 'Australian Dollar', code: 'AUD', symbol: '$' }),
    population: Object.freeze({ value: 9_362, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['Tuvaluan', 'English'],
    areaKm2: 26,
    flag: '/flags/TV.png',
    fact: "Tuvalu is one of the world's smallest countries by both population and land area and is spread across nine Pacific islands and atolls.",
  },
  mauritania: {
    name: 'Mauritania',
    officialName: 'Islamic Republic of Mauritania',
    iso2: 'MR',
    iso3: 'MRT',
    capital: 'Nouakchott',
    currency: Object.freeze({ name: 'Mauritanian Ouguiya', code: 'MRU', symbol: 'UM' }),
    population: Object.freeze({ value: 5_484_612, asOf: 2026 }),
    continent: 'Africa',
    // Arabic only — Pulaar, Soninke and Wolof are national languages but
    // not added to this nationwide official-language field.
    languages: ['Arabic'],
    areaKm2: 1_030_700,
    flag: '/flags/MR.png',
    fact: 'Much of Mauritania lies within the Sahara Desert, while its Atlantic coast contains important fishing grounds.',
  },
  mauritius: {
    name: 'Mauritius',
    officialName: 'Republic of Mauritius',
    iso2: 'MU',
    iso3: 'MUS',
    capital: 'Port Louis',
    currency: Object.freeze({ name: 'Mauritian Rupee', code: 'MUR', symbol: '₨' }),
    population: Object.freeze({ value: 1_263_286, asOf: 2026 }),
    continent: 'Africa',
    // No nationwide statutory official language. Mauritian Creole is the
    // first/home language of nearly the whole population; English and
    // French are both widely used in government, media and business.
    // Listed in that order per the "principal languages" policy (see
    // module comment).
    languages: ['Mauritian Creole', 'English', 'French'],
    areaKm2: 2_040,
    flag: '/flags/MU.png',
    fact: 'Mauritius was once home to the dodo, a flightless bird that became extinct in the seventeenth century.',
  },
  mexico: {
    name: 'Mexico',
    officialName: 'United Mexican States',
    iso2: 'MX',
    iso3: 'MEX',
    capital: 'Mexico City',
    currency: Object.freeze({ name: 'Mexican Peso', code: 'MXN', symbol: '$' }),
    population: Object.freeze({ value: 132_997_658, asOf: 2026 }),
    continent: 'North America',
    // Mexican law recognises Spanish and Indigenous languages as national
    // languages rather than establishing Spanish as a sole statutory
    // official language, but Spanish is overwhelmingly the principal
    // language in practice — shown here per the "principal languages"
    // policy (see module comment).
    languages: ['Spanish'],
    areaKm2: 1_964_375,
    flag: '/flags/MX.png',
    fact: 'Mexico was home to major pre-Columbian civilisations including the Maya and the Mexica, commonly known as the Aztecs.',
  },
  micronesia: {
    name: 'Micronesia',
    officialName: 'Federated States of Micronesia',
    iso2: 'FM',
    iso3: 'FSM',
    capital: 'Palikir',
    currency: Object.freeze({ name: 'United States Dollar', code: 'USD', symbol: '$' }),
    population: Object.freeze({ value: 114_183, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['English'],
    areaKm2: 702,
    flag: '/flags/FM.png',
    fact: 'The Federated States of Micronesia consists of more than 600 islands spread across a vast area of the western Pacific Ocean.',
  },
  moldova: {
    name: 'Moldova',
    officialName: 'Republic of Moldova',
    iso2: 'MD',
    iso3: 'MDA',
    capital: 'Chișinău',
    currency: Object.freeze({ name: 'Moldovan Leu', code: 'MDL', symbol: 'L' }),
    population: Object.freeze({ value: 2_965_504, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Romanian'],
    areaKm2: 33_846,
    flag: '/flags/MD.png',
    fact: 'Moldova has a long wine-making tradition and contains extensive underground wine cellars carved into limestone.',
  },
  monaco: {
    // Capital and country name are both "Monaco" — same pattern as
    // Luxembourg (Batch 10) and San Marino (Batch 13).
    name: 'Monaco',
    officialName: 'Principality of Monaco',
    iso2: 'MC',
    iso3: 'MCO',
    capital: 'Monaco',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 38_463, asOf: 2026 }),
    continent: 'Europe',
    languages: ['French'],
    areaKm2: 2,
    flag: '/flags/MC.png',
    fact: "Monaco is one of the world's smallest sovereign states and lies entirely along the French Mediterranean coast.",
  },
  mongolia: {
    name: 'Mongolia',
    officialName: 'Mongolia',
    iso2: 'MN',
    iso3: 'MNG',
    capital: 'Ulaanbaatar',
    currency: Object.freeze({ name: 'Mongolian Tögrög', code: 'MNT', symbol: '₮' }),
    population: Object.freeze({ value: 3_543_978, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Mongolian'],
    areaKm2: 1_564_116,
    flag: '/flags/MN.png',
    fact: "Mongolia is the world's most sparsely populated sovereign country.",
  },
  montenegro: {
    name: 'Montenegro',
    officialName: 'Montenegro',
    iso2: 'ME',
    iso3: 'MNE',
    capital: 'Podgorica',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 627_859, asOf: 2026 }),
    continent: 'Europe',
    // Principal Languages policy: Montenegro's constitution names only
    // Montenegrin "the official language"; Serbian/Bosnian/Albanian/
    // Croatian are textually "in official use" — a distinct, lesser legal
    // tier, and none independently clears the 10% first-language
    // threshold or a nationwide administrative/lingua-franca role.
    languages: ['Montenegrin'],
    areaKm2: 13_812,
    flag: '/flags/ME.png',
    fact: 'Montenegro combines a rugged Adriatic coastline with dramatic mountain ranges and the deep Tara River Canyon.',
  },
  morocco: {
    name: 'Morocco',
    officialName: 'Kingdom of Morocco',
    iso2: 'MA',
    iso3: 'MAR',
    capital: 'Rabat',
    currency: Object.freeze({ name: 'Moroccan Dirham', code: 'MAD', symbol: 'د.م.' }),
    population: Object.freeze({ value: 38_762_441, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Arabic', 'Amazigh'],
    areaKm2: 446_550,
    flag: '/flags/MA.png',
    fact: 'Morocco lies only about 14 kilometres from Spain at the narrowest part of the Strait of Gibraltar.',
  },
  mozambique: {
    name: 'Mozambique',
    officialName: 'Republic of Mozambique',
    iso2: 'MZ',
    iso3: 'MOZ',
    capital: 'Maputo',
    currency: Object.freeze({ name: 'Mozambican Metical', code: 'MZN', symbol: 'MT' }),
    population: Object.freeze({ value: 36_469_104, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Portuguese'],
    areaKm2: 801_590,
    flag: '/flags/MZ.png',
    fact: 'Mozambique has a long Indian Ocean coastline stretching for more than 2,000 kilometres.',
  },
  uganda: {
    name: 'Uganda',
    officialName: 'Republic of Uganda',
    iso2: 'UG',
    iso3: 'UGA',
    capital: 'Kampala',
    currency: Object.freeze({ name: 'Ugandan Shilling', code: 'UGX', symbol: 'USh' }),
    population: Object.freeze({ value: 52_761_469, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: English and Swahili are both official/
    // administrative anchors (Swahili constitutionally so). Uganda's 2014
    // National Population and Housing Census recorded 5.6 million Luganda
    // first-language speakers against a total population of ~34.6
    // million (~16%), clearing the 10% threshold.
    languages: ['English', 'Swahili', 'Luganda'],
    areaKm2: 241_550,
    flag: '/flags/UG.png',
    fact: 'Uganda contains part of Lake Victoria and is one of the countries through which the Nile flows.',
  },
  ukraine: {
    name: 'Ukraine',
    officialName: 'Ukraine',
    iso2: 'UA',
    iso3: 'UKR',
    capital: 'Kyiv',
    currency: Object.freeze({ name: 'Ukrainian Hryvnia', code: 'UAH', symbol: '₴' }),
    population: Object.freeze({ value: 39_535_849, asOf: 2026 }),
    continent: 'Europe',
    // Ukrainian only — Russian and other minority languages are
    // deliberately not listed here.
    languages: ['Ukrainian'],
    areaKm2: 603_628,
    flag: '/flags/UA.png',
    fact: 'Ukraine is the largest country located entirely within Europe by internationally recognised area.',
  },
  uruguay: {
    name: 'Uruguay',
    officialName: 'Oriental Republic of Uruguay',
    iso2: 'UY',
    iso3: 'URY',
    capital: 'Montevideo',
    currency: Object.freeze({ name: 'Uruguayan Peso', code: 'UYU', symbol: '$' }),
    population: Object.freeze({ value: 3_382_537, asOf: 2026 }),
    continent: 'South America',
    languages: ['Spanish'],
    areaKm2: 176_215,
    flag: '/flags/UY.png',
    fact: 'Uruguay was the first country to win the FIFA World Cup, hosting and winning the inaugural tournament in 1930.',
  },
  uzbekistan: {
    name: 'Uzbekistan',
    officialName: 'Republic of Uzbekistan',
    iso2: 'UZ',
    iso3: 'UZB',
    capital: 'Tashkent',
    currency: Object.freeze({ name: 'Uzbekistani Som', code: 'UZS', symbol: 'soʻm' }),
    population: Object.freeze({ value: 37_724_223, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Uzbek'],
    areaKm2: 448_978,
    flag: '/flags/UZ.png',
    fact: 'Uzbekistan is one of only two doubly landlocked countries in the world, meaning every country it borders is itself landlocked.',
  },
  vanuatu: {
    name: 'Vanuatu',
    officialName: 'Republic of Vanuatu',
    iso2: 'VU',
    iso3: 'VUT',
    capital: 'Port Vila',
    currency: Object.freeze({ name: 'Vanuatu Vatu', code: 'VUV', symbol: 'VT' }),
    population: Object.freeze({ value: 342_564, asOf: 2026 }),
    continent: 'Oceania',
    // Bislama is both the national language and one of the official
    // languages, alongside English and French.
    languages: ['Bislama', 'English', 'French'],
    areaKm2: 12_189,
    flag: '/flags/VU.png',
    fact: 'Vanuatu is a volcanic Pacific archipelago located along the seismically active Pacific Ring of Fire.',
  },
  venezuela: {
    name: 'Venezuela',
    officialName: 'Bolivarian Republic of Venezuela',
    iso2: 'VE',
    iso3: 'VEN',
    capital: 'Caracas',
    currency: Object.freeze({ name: 'Venezuelan Bolívar', code: 'VES', symbol: 'Bs.' }),
    population: Object.freeze({ value: 28_633_711, asOf: 2026 }),
    continent: 'South America',
    // Spanish only in this nationwide field — Indigenous languages have
    // official status for Indigenous peoples but are not added here.
    languages: ['Spanish'],
    areaKm2: 916_445,
    flag: '/flags/VE.png',
    fact: "Venezuela is home to Angel Falls, the world's highest uninterrupted waterfall.",
  },
  vietnam: {
    name: 'Vietnam',
    officialName: 'Socialist Republic of Vietnam',
    iso2: 'VN',
    iso3: 'VNM',
    capital: 'Hanoi',
    currency: Object.freeze({ name: 'Vietnamese Đồng', code: 'VND', symbol: '₫' }),
    population: Object.freeze({ value: 102_177_431, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Vietnamese'],
    areaKm2: 331_212,
    flag: '/flags/VN.png',
    fact: 'Vietnam has a long S-shaped coastline stretching along the eastern edge of mainland Southeast Asia.',
  },
  yemen: {
    name: 'Yemen',
    officialName: 'Republic of Yemen',
    iso2: 'YE',
    iso3: 'YEM',
    capital: "Sana'a",
    currency: Object.freeze({ name: 'Yemeni Rial', code: 'YER', symbol: '﷼' }),
    population: Object.freeze({ value: 42_961_653, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Arabic'],
    areaKm2: 527_968,
    flag: '/flags/YE.png',
    fact: "Yemen's old city of Sana'a is known for its distinctive multi-storey tower houses decorated with geometric patterns.",
  },
  zambia: {
    name: 'Zambia',
    officialName: 'Republic of Zambia',
    iso2: 'ZM',
    iso3: 'ZMB',
    capital: 'Lusaka',
    currency: Object.freeze({ name: 'Zambian Kwacha', code: 'ZMW', symbol: 'ZK' }),
    population: Object.freeze({ value: 22_521_915, asOf: 2026 }),
    continent: 'Africa',
    languages: ['English'],
    areaKm2: 752_612,
    flag: '/flags/ZM.png',
    fact: 'Zambia shares Victoria Falls with Zimbabwe along the Zambezi River.',
  },
  zimbabwe: {
    // Currency is the Zimbabwe Gold (ZWG, symbol ZiG) — checked against the
    // rest of this project for a contradictory older-dataset assumption
    // (e.g. the pre-2024 Zimbabwe dollar, ZWL); none exists anywhere in
    // the codebase, so the supplied record is used as-is, not substituted.
    // Principal Languages policy: of Zimbabwe's 16 constitutionally
    // official languages, only English (administrative anchor) and
    // Shona/Ndebele (each well over the 10% first-language threshold)
    // clear the concise geography-learning bar; Zimbabwe's constitutional
    // Sign Language is retained under the sign-language rule (genuine
    // nationwide institutional function, not a spoken-language population
    // test) — see the `languages` field doc comment.
    name: 'Zimbabwe',
    officialName: 'Republic of Zimbabwe',
    iso2: 'ZW',
    iso3: 'ZWE',
    capital: 'Harare',
    currency: Object.freeze({ name: 'Zimbabwe Gold', code: 'ZWG', symbol: 'ZiG' }),
    population: Object.freeze({ value: 17_273_580, asOf: 2026 }),
    continent: 'Africa',
    languages: ['English', 'Shona', 'Ndebele', 'Sign Language'],
    areaKm2: 390_757,
    flag: '/flags/ZW.png',
    fact: 'Zimbabwe takes its name from Great Zimbabwe, the ruins of a major medieval stone-built city in southern Africa.',
  },
  england: {
    // Constituent country of the United Kingdom, not a sovereign ISO
    // 3166-1 state — iso2/iso3 are deliberately omitted rather than
    // invented (see the CountryRecord field doc comments above). Flag
    // uses the real ISO 3166-2 subdivision code GB-ENG (see flags.ts),
    // not the United Kingdom's own GB code.
    name: 'England',
    officialName: 'England',
    capital: 'London',
    currency: Object.freeze({ name: 'Pound Sterling', code: 'GBP', symbol: '£' }),
    // ONS, "Population estimates for England and Wales: mid-2025"
    // (published 30 July 2026): mid-2025 (30 June 2025) population.
    population: Object.freeze({ value: 58_834_800, asOf: 2025 }),
    continent: 'Europe',
    languages: ['English'],
    areaKm2: 130_279,
    flag: '/flags/GB-ENG.png',
    fact: 'England is the largest constituent country of the United Kingdom by both population and land area.',
  },
  scotland: {
    // Constituent country of the United Kingdom, not a sovereign ISO
    // 3166-1 state — iso2/iso3 are deliberately omitted rather than
    // invented. Flag uses the real ISO 3166-2 subdivision code GB-SCT,
    // not the United Kingdom's own GB code.
    name: 'Scotland',
    officialName: 'Scotland',
    capital: 'Edinburgh',
    currency: Object.freeze({ name: 'Pound Sterling', code: 'GBP', symbol: '£' }),
    // National Records of Scotland, "Mid-2025 population estimates"
    // (published 14 July 2026): mid-2025 (30 June 2025) population.
    population: Object.freeze({ value: 5_545_500, asOf: 2025 }),
    continent: 'Europe',
    // Principal Languages policy: the Gaelic Language (Scotland) Act 2005
    // only sought to *secure* official status for Gaelic — it did not
    // grant it (unlike Welsh's unambiguous 2011 de jure official status
    // for Wales) — and Gaelic's home-language share is a small fraction
    // of a percent. Scots has only European Charter for Regional or
    // Minority Languages recognition, a protection/recognition tier this
    // field's definition explicitly excludes. Neither clears an anchor or
    // the 10% threshold; do not add Welsh here (see "wales").
    languages: ['English'],
    areaKm2: 77_933,
    flag: '/flags/GB-SCT.png',
    fact: 'Scotland makes up the northern third of Great Britain and includes hundreds of islands.',
  },
  wales: {
    // Constituent country of the United Kingdom, not a sovereign ISO
    // 3166-1 state — iso2/iso3 are deliberately omitted rather than
    // invented. Flag uses the real ISO 3166-2 subdivision code GB-WLS,
    // not the United Kingdom's own GB code.
    name: 'Wales',
    officialName: 'Wales',
    capital: 'Cardiff',
    currency: Object.freeze({ name: 'Pound Sterling', code: 'GBP', symbol: '£' }),
    // ONS, "Population estimates for England and Wales: mid-2025"
    // (published 30 July 2026): mid-2025 (30 June 2025) population.
    population: Object.freeze({ value: 3_175_200, asOf: 2025 }),
    continent: 'Europe',
    // English and Welsh — do not add Scottish Gaelic here.
    languages: ['English', 'Welsh'],
    areaKm2: 20_779,
    flag: '/flags/GB-WLS.png',
    fact: 'Wales has two principal languages, English and Welsh, and is known for its mountainous landscape and extensive coastline.',
  },
  afghanistan: {
    // Not a playable answer (AFGHANISTAN is 11 letters, over
    // MAX_ANSWER_LENGTH) but a canonical country — Study-data Batch A, the
    // first entry to populate a non-playable country's results page.
    name: 'Afghanistan',
    officialName: 'Afghanistan',
    iso2: 'AF',
    iso3: 'AFG',
    capital: 'Kabul',
    currency: Object.freeze({ name: 'Afghan Afghani', code: 'AFN', symbol: '؋' }),
    population: Object.freeze({ value: 45_047_069, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Dari', 'Pashto'],
    areaKm2: 652_230,
    flag: '/flags/AF.png',
    fact: 'Afghanistan lies at a historic crossroads linking Central Asia, South Asia and the Middle East.',
  },
  'antigua-and-barbuda': {
    // Not a playable answer (ANTIGUAANDBARBUDA is 17 letters) but a
    // canonical country — Study-data Batch A.
    name: 'Antigua and Barbuda',
    officialName: 'Antigua and Barbuda',
    iso2: 'AG',
    iso3: 'ATG',
    capital: "Saint John's",
    currency: Object.freeze({ name: 'East Caribbean Dollar', code: 'XCD', symbol: '$' }),
    population: Object.freeze({ value: 94_626, asOf: 2026 }),
    continent: 'North America',
    languages: ['English'],
    areaKm2: 442,
    flag: '/flags/AG.png',
    fact: 'Antigua and Barbuda is an island nation made up primarily of Antigua, Barbuda and several smaller islands.',
  },
  'bosnia-and-herzegovina': {
    // Not a playable answer (BOSNIAANDHERZEGOVINA is 20 letters) but a
    // canonical country — Study-data Batch A.
    name: 'Bosnia and Herzegovina',
    officialName: 'Bosnia and Herzegovina',
    iso2: 'BA',
    iso3: 'BIH',
    capital: 'Sarajevo',
    currency: Object.freeze({ name: 'Bosnia and Herzegovina Convertible Mark', code: 'BAM', symbol: 'KM' }),
    population: Object.freeze({ value: 3_114_242, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Bosnian', 'Croatian', 'Serbian'],
    areaKm2: 51_209,
    flag: '/flags/BA.png',
    fact: 'Bosnia and Herzegovina has a short Adriatic coastline surrounding the town of Neum.',
  },
  'burkina-faso': {
    // Not a playable answer (BURKINAFASO is 11 letters) but a canonical
    // country — Study-data Batch A.
    name: 'Burkina Faso',
    officialName: 'Burkina Faso',
    iso2: 'BF',
    iso3: 'BFA',
    capital: 'Ouagadougou',
    currency: Object.freeze({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' }),
    population: Object.freeze({ value: 24_601_700, asOf: 2026 }),
    continent: 'Africa',
    // Principal Languages policy: Burkina Faso's Dec 2023/Jan 2024
    // constitutional amendment made national languages official and
    // demoted French (and English) to working-language status — French
    // is excluded here on that basis. Mooré, Dioula and Fulfulde are
    // Burkina Faso's largest indigenous/lingua-franca languages.
    languages: ['Mooré', 'Dioula', 'Fulfulde'],
    areaKm2: 274_200,
    flag: '/flags/BF.png',
    fact: "The name Burkina Faso is commonly translated as 'Land of Upright People'.",
  },
  'central-african-republic': {
    // Not a playable answer (CENTRALAFRICANREPUBLIC is 22 letters) but a
    // canonical country — Study-data Batch A.
    name: 'Central African Republic',
    officialName: 'Central African Republic',
    iso2: 'CF',
    iso3: 'CAF',
    capital: 'Bangui',
    currency: Object.freeze({ name: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA' }),
    population: Object.freeze({ value: 5_698_984, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Sango', 'French'],
    areaKm2: 622_984,
    flag: '/flags/CF.png',
    fact: 'The Central African Republic is a landlocked country located close to the geographic centre of the African continent.',
  },
  'dominican-republic': {
    // Not a playable answer (DOMINICANREPUBLIC is 17 letters) but a
    // canonical country — Study-data Batch A.
    name: 'Dominican Republic',
    officialName: 'Dominican Republic',
    iso2: 'DO',
    iso3: 'DOM',
    capital: 'Santo Domingo',
    currency: Object.freeze({ name: 'Dominican Peso', code: 'DOP', symbol: 'RD$' }),
    population: Object.freeze({ value: 11_609_500, asOf: 2026 }),
    continent: 'North America',
    languages: ['Spanish'],
    areaKm2: 48_671,
    flag: '/flags/DO.png',
    fact: 'The Dominican Republic occupies the eastern portion of Hispaniola, an island it shares with Haiti.',
  },
  'equatorial-guinea': {
    // Not a playable answer (EQUATORIALGUINEA is 16 letters) but a
    // canonical country — Study-data Batch A.
    name: 'Equatorial Guinea',
    officialName: 'Republic of Equatorial Guinea',
    iso2: 'GQ',
    iso3: 'GNQ',
    capital: 'Malabo',
    currency: Object.freeze({ name: 'Central African CFA Franc', code: 'XAF', symbol: 'FCFA' }),
    population: Object.freeze({ value: 1_984_468, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Spanish', 'French', 'Portuguese'],
    areaKm2: 28_051,
    flag: '/flags/GQ.png',
    fact: 'Equatorial Guinea is the only sovereign African country where Spanish is an official language.',
  },
  'guinea-bissau': {
    // Not a playable answer (GUINEABISSAU is 12 letters) but a canonical
    // country — Study-data Batch A.
    name: 'Guinea-Bissau',
    officialName: 'Republic of Guinea-Bissau',
    iso2: 'GW',
    iso3: 'GNB',
    capital: 'Bissau',
    currency: Object.freeze({ name: 'West African CFA Franc', code: 'XOF', symbol: 'CFA' }),
    population: Object.freeze({ value: 2_297_808, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Portuguese', 'Guinea-Bissau Creole'],
    areaKm2: 36_125,
    flag: '/flags/GW.png',
    fact: 'Guinea-Bissau includes the Bijagós Archipelago, a group of dozens of islands off its Atlantic coast.',
  },
  liechtenstein: {
    // Not a playable answer (LIECHTENSTEIN is 13 letters) but a canonical
    // country — Study-data Batch A.
    name: 'Liechtenstein',
    officialName: 'Principality of Liechtenstein',
    iso2: 'LI',
    iso3: 'LIE',
    capital: 'Vaduz',
    currency: Object.freeze({ name: 'Swiss Franc', code: 'CHF', symbol: 'CHF' }),
    population: Object.freeze({ value: 40_368, asOf: 2026 }),
    continent: 'Europe',
    languages: ['German'],
    areaKm2: 160,
    flag: '/flags/LI.png',
    fact: 'Liechtenstein is one of only two doubly landlocked countries in the world.',
  },
  'marshall-islands': {
    // Not a playable answer (MARSHALLISLANDS is 15 letters) but a
    // canonical country — Study-data Batch A.
    name: 'Marshall Islands',
    officialName: 'Republic of the Marshall Islands',
    iso2: 'MH',
    iso3: 'MHL',
    capital: 'Majuro',
    currency: Object.freeze({ name: 'United States Dollar', code: 'USD', symbol: '$' }),
    population: Object.freeze({ value: 35_075, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['Marshallese', 'English'],
    areaKm2: 181,
    flag: '/flags/MH.png',
    fact: 'The Marshall Islands consists mainly of low-lying coral atolls spread across a vast area of the Pacific Ocean.',
  },
  netherlands: {
    // Not a playable answer (NETHERLANDS is 11 letters, over
    // MAX_ANSWER_LENGTH) but a canonical country — Study-data Batch B.
    // Capital is preserved exactly as the constitutional capital,
    // Amsterdam — NOT replaced with The Hague (the seat of government and
    // parliament), per the same single-value convention already used for
    // Bolivia/Sri Lanka/Eswatini/Nauru; the nuance is documented in the
    // fact text rather than requiring a schema change.
    name: 'Netherlands',
    officialName: 'Kingdom of the Netherlands',
    iso2: 'NL',
    iso3: 'NLD',
    capital: 'Amsterdam',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 18_448_775, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Dutch'],
    areaKm2: 41_543,
    flag: '/flags/NL.png',
    fact: 'Amsterdam is the constitutional capital of the Netherlands, while the government and parliament are based in The Hague.',
  },
  'north-macedonia': {
    // Not a playable answer (NORTHMACEDONIA is 14 letters) but a canonical
    // country — Study-data Batch B.
    name: 'North Macedonia',
    officialName: 'Republic of North Macedonia',
    iso2: 'MK',
    iso3: 'MKD',
    capital: 'Skopje',
    currency: Object.freeze({ name: 'Macedonian Denar', code: 'MKD', symbol: 'ден' }),
    population: Object.freeze({ value: 1_804_063, asOf: 2026 }),
    continent: 'Europe',
    languages: ['Macedonian', 'Albanian'],
    areaKm2: 25_713,
    flag: '/flags/MK.png',
    fact: 'North Macedonia is a landlocked Balkan country and shares Lake Ohrid with neighbouring Albania.',
  },
  'papua-new-guinea': {
    // Not a playable answer (PAPUANEWGUINEA is 14 letters) but a canonical
    // country — Study-data Batch B.
    name: 'Papua New Guinea',
    officialName: 'Independent State of Papua New Guinea',
    iso2: 'PG',
    iso3: 'PNG',
    capital: 'Port Moresby',
    currency: Object.freeze({ name: 'Papua New Guinean Kina', code: 'PGK', symbol: 'K' }),
    population: Object.freeze({ value: 10_947_848, asOf: 2026 }),
    continent: 'Oceania',
    // Principal Languages policy: English (administrative anchor) and Tok
    // Pisin (genuine nationwide lingua franca) are confirmed. Hiri Motu is
    // legally one of PNG's 4 official languages but its actual nationwide
    // reach has declined sharply since independence and is now largely
    // regional (Papuan region) — excluded on current function, not legal
    // status. Papua New Guinean Sign Language (official since May 2015) is
    // retained under the sign-language rule: national-level legal
    // recognition plus confirmed pre-existing nationwide use as the
    // language of instruction in deaf schools/units.
    languages: ['English', 'Tok Pisin', 'Papua New Guinean Sign Language'],
    areaKm2: 462_840,
    flag: '/flags/PG.png',
    fact: "Papua New Guinea is one of the world's most linguistically diverse countries, with more than 800 Indigenous languages.",
  },
  philippines: {
    // Not a playable answer (PHILIPPINES is 11 letters) but a canonical
    // country — Study-data Batch B.
    name: 'Philippines',
    officialName: 'Republic of the Philippines',
    iso2: 'PH',
    iso3: 'PHL',
    capital: 'Manila',
    currency: Object.freeze({ name: 'Philippine Peso', code: 'PHP', symbol: '₱' }),
    population: Object.freeze({ value: 117_724_471, asOf: 2026 }),
    continent: 'Asia',
    // Principal Languages policy: Filipino and English are both official
    // (1987 Constitution Art. XIV) and administrative anchors. PSA (2020
    // Census of Population and Housing) home-language data: Tagalog (the
    // basis of Filipino) 39.9%, Bisaya/Binisaya 16.0% — both clear 10%;
    // Hiligaynon/Ilonggo (7.3%), Ilocano (7.1%) and Cebuano specifically
    // (6.5%, a narrower PSA category than the broader "Bisaya/Binisaya")
    // do not.
    languages: ['Filipino', 'English', 'Bisaya/Binisaya'],
    areaKm2: 300_000,
    flag: '/flags/PH.png',
    fact: 'The Philippines is an archipelago of more than 7,000 islands in Southeast Asia.',
  },
  'saint-kitts-and-nevis': {
    // Not a playable answer (SAINTKITTSANDNEVIS is 18 letters) but a
    // canonical country — Study-data Batch B.
    name: 'Saint Kitts and Nevis',
    officialName: 'Federation of Saint Christopher and Nevis',
    iso2: 'KN',
    iso3: 'KNA',
    capital: 'Basseterre',
    currency: Object.freeze({ name: 'East Caribbean Dollar', code: 'XCD', symbol: '$' }),
    population: Object.freeze({ value: 46_992, asOf: 2026 }),
    continent: 'North America',
    languages: ['English'],
    areaKm2: 261,
    flag: '/flags/KN.png',
    fact: 'Saint Kitts and Nevis is the smallest sovereign state in the Americas by both area and population.',
  },
  'saint-vincent-and-the-grenadines': {
    // Not a playable answer (SAINTVINCENTANDTHEGRENADINES is 28 letters)
    // but a canonical country — Study-data Batch B.
    name: 'Saint Vincent and the Grenadines',
    officialName: 'Saint Vincent and the Grenadines',
    iso2: 'VC',
    iso3: 'VCT',
    capital: 'Kingstown',
    currency: Object.freeze({ name: 'East Caribbean Dollar', code: 'XCD', symbol: '$' }),
    population: Object.freeze({ value: 99_245, asOf: 2026 }),
    continent: 'North America',
    languages: ['English'],
    areaKm2: 389,
    flag: '/flags/VC.png',
    fact: 'Saint Vincent and the Grenadines consists of the main island of Saint Vincent and a chain of smaller Grenadine islands.',
  },
  'sao-tome-and-principe': {
    // Not a playable answer (SAOTOMEANDPRINCIPE is 18 letters) but a
    // canonical country — Study-data Batch B. Diacritics preserved in
    // display fields (name/capital/fact); normalization stripping them for
    // gameplay (SAOTOMEANDPRINCIPE) is unaffected — see toCountrySlug()/
    // normalizeCountryName() in lib/.
    name: 'São Tomé and Príncipe',
    officialName: 'Democratic Republic of São Tomé and Príncipe',
    iso2: 'ST',
    iso3: 'STP',
    capital: 'São Tomé',
    currency: Object.freeze({ name: 'São Tomé and Príncipe Dobra', code: 'STN', symbol: 'Db' }),
    population: Object.freeze({ value: 244_994, asOf: 2026 }),
    continent: 'Africa',
    languages: ['Portuguese'],
    areaKm2: 964,
    flag: '/flags/ST.png',
    fact: 'São Tomé and Príncipe is a volcanic island nation in the Gulf of Guinea close to the Equator.',
  },
  'saudi-arabia': {
    // Not a playable answer (SAUDIARABIA is 11 letters) but a canonical
    // country — Study-data Batch B.
    name: 'Saudi Arabia',
    officialName: 'Kingdom of Saudi Arabia',
    iso2: 'SA',
    iso3: 'SAU',
    capital: 'Riyadh',
    currency: Object.freeze({ name: 'Saudi Riyal', code: 'SAR', symbol: '﷼' }),
    population: Object.freeze({ value: 35_165_787, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Arabic'],
    areaKm2: 2_149_690,
    flag: '/flags/SA.png',
    fact: 'Saudi Arabia is the largest country on the Arabian Peninsula by land area.',
  },
  'sierra-leone': {
    // Not a playable answer (SIERRALEONE is 11 letters) but a canonical
    // country — Study-data Batch B. Currency code "SLE" is coincidentally
    // identical to the iso3 code "SLE" — both are independently correct
    // (the redenominated Sierra Leonean Leone's real ISO 4217 code is
    // literally SLE, introduced 2022), not a copy-paste error.
    name: 'Sierra Leone',
    officialName: 'Republic of Sierra Leone',
    iso2: 'SL',
    iso3: 'SLE',
    capital: 'Freetown',
    currency: Object.freeze({ name: 'Sierra Leonean Leone', code: 'SLE', symbol: 'Le' }),
    population: Object.freeze({ value: 8_996_745, asOf: 2026 }),
    continent: 'Africa',
    languages: ['English', 'Krio'],
    areaKm2: 71_740,
    flag: '/flags/SL.png',
    fact: "Krio is widely used as a lingua franca across Sierra Leone despite the country's considerable linguistic diversity.",
  },
  'solomon-islands': {
    // Not a playable answer (SOLOMONISLANDS is 14 letters) but a canonical
    // country — Study-data Batch B.
    name: 'Solomon Islands',
    officialName: 'Solomon Islands',
    iso2: 'SB',
    iso3: 'SLB',
    capital: 'Honiara',
    currency: Object.freeze({ name: 'Solomon Islands Dollar', code: 'SBD', symbol: '$' }),
    population: Object.freeze({ value: 858_288, asOf: 2026 }),
    continent: 'Oceania',
    languages: ['English', 'Solomon Islands Pijin'],
    areaKm2: 28_896,
    flag: '/flags/SB.png',
    fact: 'The Solomon Islands is an archipelago of hundreds of islands in the southwestern Pacific Ocean.',
  },
  'south-africa': {
    // Not a playable answer (SOUTHAFRICA is 11 letters) but a canonical
    // country — Study-data Batch C (the final batch). South Africa
    // formally divides capital functions across three cities (Pretoria:
    // executive, Cape Town: legislative, Bloemfontein: judicial) — a
    // single capital value is preserved per the same convention already
    // used for Bolivia/Sri Lanka/Eswatini/Nauru/Netherlands, with the
    // nuance documented in the fact text rather than a schema change.
    // Principal Languages policy: of South Africa's 12 constitutionally
    // official languages, only English (administrative anchor) and
    // Zulu/Xhosa/Afrikaans (each ≥10% home-language share, 2011 census)
    // clear the concise geography-learning bar; South African Sign
    // Language is retained under the sign-language rule (genuine
    // nationwide institutional function since the 2023 Eighteenth
    // Amendment) — see the `languages` field doc comment.
    name: 'South Africa',
    officialName: 'Republic of South Africa',
    iso2: 'ZA',
    iso3: 'ZAF',
    capital: 'Pretoria',
    currency: Object.freeze({ name: 'South African Rand', code: 'ZAR', symbol: 'R' }),
    population: Object.freeze({ value: 65_453_084, asOf: 2026 }),
    continent: 'Africa',
    languages: ['English', 'isiZulu', 'isiXhosa', 'Afrikaans', 'South African Sign Language'],
    areaKm2: 1_221_037,
    flag: '/flags/ZA.png',
    fact: 'South Africa divides its national capital functions between Pretoria, Cape Town and Bloemfontein.',
  },
  switzerland: {
    // Not a playable answer (SWITZERLAND is 11 letters) but a canonical
    // country — Study-data Batch C. Switzerland has no constitutionally
    // designated capital; Bern is the federal city by convention — the
    // fact text documents this rather than requiring a schema change,
    // matching the Netherlands/South Africa capital-nuance pattern above.
    name: 'Switzerland',
    officialName: 'Swiss Confederation',
    iso2: 'CH',
    iso3: 'CHE',
    capital: 'Bern',
    currency: Object.freeze({ name: 'Swiss Franc', code: 'CHF', symbol: 'CHF' }),
    population: Object.freeze({ value: 9_007_798, asOf: 2026 }),
    continent: 'Europe',
    // Principal Languages policy: German/French/Italian are fully
    // co-equal federal administrative anchors; Romansh's 1996 official
    // status is narrower (correspondence with Romansh speakers only, not
    // general federal administration) and its ~0.5% speaker share doesn't
    // independently clear the 10% threshold.
    languages: ['German', 'French', 'Italian'],
    areaKm2: 41_285,
    flag: '/flags/CH.png',
    fact: "Bern serves as Switzerland's federal city, although the country has no constitutionally designated capital.",
  },
  'trinidad-and-tobago': {
    // Not a playable answer (TRINIDADANDTOBAGO is 17 letters) but a
    // canonical country — Study-data Batch C.
    name: 'Trinidad and Tobago',
    officialName: 'Republic of Trinidad and Tobago',
    iso2: 'TT',
    iso3: 'TTO',
    capital: 'Port of Spain',
    currency: Object.freeze({ name: 'Trinidad and Tobago Dollar', code: 'TTD', symbol: 'TT$' }),
    population: Object.freeze({ value: 1_513_268, asOf: 2026 }),
    continent: 'North America',
    languages: ['English'],
    areaKm2: 5_130,
    flag: '/flags/TT.png',
    fact: "Trinidad and Tobago consists of two main islands, with Trinidad accounting for most of the country's land area and population.",
  },
  turkmenistan: {
    // Not a playable answer (TURKMENISTAN is 12 letters) but a canonical
    // country — Study-data Batch C.
    name: 'Turkmenistan',
    officialName: 'Turkmenistan',
    iso2: 'TM',
    iso3: 'TKM',
    capital: 'Ashgabat',
    currency: Object.freeze({ name: 'Turkmenistani Manat', code: 'TMT', symbol: 'm' }),
    population: Object.freeze({ value: 7_736_632, asOf: 2026 }),
    continent: 'Asia',
    // Principal Languages policy: Turkmen is the sole confirmed anchor.
    // Russian's current status is genuinely contested — sources disagree
    // sharply on its present speaker share (estimates range 2.7%-12%,
    // with no census-tier source available), and government policy since
    // independence has actively reduced Russian's public/administrative
    // role (unlike Kazakhstan/Kyrgyzstan, which have explicit
    // constitutional provisions for Russian). Given the disagreement and
    // the documented decline, Russian is not confirmed to clear the 10%
    // threshold or function as a current administrative anchor.
    languages: ['Turkmen'],
    areaKm2: 488_100,
    flag: '/flags/TM.png',
    fact: 'Much of Turkmenistan is covered by the Karakum Desert, one of the largest deserts in Central Asia.',
  },
  'united-arab-emirates': {
    // Not a playable answer (UNITEDARABEMIRATES is 18 letters) but a
    // canonical country — Study-data Batch C.
    name: 'United Arab Emirates',
    officialName: 'United Arab Emirates',
    iso2: 'AE',
    iso3: 'ARE',
    capital: 'Abu Dhabi',
    currency: Object.freeze({ name: 'United Arab Emirates Dirham', code: 'AED', symbol: 'د.إ' }),
    population: Object.freeze({ value: 11_574_682, asOf: 2026 }),
    continent: 'Asia',
    languages: ['Arabic', 'English'],
    areaKm2: 83_600,
    flag: '/flags/AE.png',
    fact: 'The United Arab Emirates is a federation of seven emirates, including Abu Dhabi and Dubai.',
  },
  'united-kingdom': {
    // Not a playable answer (UNITEDKINGDOM is 13 letters) but a canonical
    // country — Study-data Batch C. Remains fully distinct from its own
    // constituent countries "england"/"scotland"/"wales" (separate slugs,
    // separate records, separate GB/GB-ENG/GB-SCT/GB-WLS flags). Principal
    // Languages policy: no UK-wide statute declares any language
    // officially "the official language of the United Kingdom" — Welsh's
    // 2011 de jure official status is Wales-specific, not UK-wide — so
    // this falls to the no-official-language fallback (the de facto
    // nationwide administrative language, English) rather than the
    // broader per-constituent-country list this record showed previously.
    // Population is the latest available UK-wide provisional estimate
    // (mid-2025, asOf 2025, ~69.5 million) — not forced to 2026.
    name: 'United Kingdom',
    officialName: 'United Kingdom of Great Britain and Northern Ireland',
    iso2: 'GB',
    iso3: 'GBR',
    capital: 'London',
    currency: Object.freeze({ name: 'Pound Sterling', code: 'GBP', symbol: '£' }),
    population: Object.freeze({ value: 69_487_000, asOf: 2025 }),
    continent: 'Europe',
    languages: ['English'],
    areaKm2: 243_610,
    flag: '/flags/GB.png',
    fact: 'The United Kingdom consists of England, Scotland, Wales and Northern Ireland.',
  },
  'united-states': {
    // Not a playable answer (UNITEDSTATES is 12 letters) but a canonical
    // country — Study-data Batch C. No sole de jure federal official
    // language; English and Spanish are the principal languages useful to
    // a geography learner per the current language policy (see the
    // `languages` field doc comment above).
    name: 'United States',
    officialName: 'United States of America',
    iso2: 'US',
    iso3: 'USA',
    capital: 'Washington, D.C.',
    currency: Object.freeze({ name: 'United States Dollar', code: 'USD', symbol: '$' }),
    population: Object.freeze({ value: 349_035_494, asOf: 2026 }),
    continent: 'North America',
    languages: ['English', 'Spanish'],
    areaKm2: 9_833_517,
    flag: '/flags/US.png',
    fact: 'The United States consists of 50 states and a federal district and spans territory from the Atlantic to the Pacific.',
  },
  'vatican-city': {
    // Not a playable answer (VATICANCITY is 11 letters) but a canonical
    // country — Study-data Batch C, and the LAST of the 28 non-playable
    // canonical countries: with this record, every one of the 200
    // canonical COUNTRIES entries has a COUNTRY_RECORDS entry (invariant 3
    // is now globally true — see the module comment above). areaKm2 is
    // deliberately fractional (0.44 km²) — the only non-integer area value
    // in the dataset, reflecting Vatican City's genuinely tiny real size;
    // no schema change needed, `areaKm2: number` already permits it.
    name: 'Vatican City',
    officialName: 'Vatican City State',
    iso2: 'VA',
    iso3: 'VAT',
    capital: 'Vatican City',
    currency: Object.freeze({ name: 'Euro', code: 'EUR', symbol: '€' }),
    population: Object.freeze({ value: 887, asOf: 2025 }),
    continent: 'Europe',
    languages: ['Italian', 'Latin'],
    areaKm2: 0.44,
    flag: '/flags/VA.png',
    fact: "Vatican City is the world's smallest sovereign state by land area.",
  },
  tanzania: {
    name: 'Tanzania',
    officialName: 'United Republic of Tanzania',
    iso2: 'TZ',
    iso3: 'TZA',

    capital: 'Dodoma',

    currency: Object.freeze({
      name: 'Tanzanian Shilling',
      code: 'TZS',
      symbol: 'TSh',
    }),

    population: Object.freeze({
      value: 68_600_000,
      asOf: 2026,
    }),

    continent: 'Africa',

    languages: ['Swahili', 'English'],

    areaKm2: 947_303,

    // Verified against public/flags/: no tanzania.png exists there; the
    // real asset is ISO2-code-named, matching COUNTRY_CODES.tanzania = 'TZ'
    // in flags.ts.
    flag: '/flags/TZ.png',

    fact: 'Tanzania is home to Mount Kilimanjaro, the highest mountain in Africa.',
  },
})

/**
 * slug -> CountryRecord, or null if this country has no raw record yet.
 * This is how a results page (or anything else) looks up a country's full
 * structured data — see getCountryDetails() in index.ts for the resolved,
 * placeholder-aware shape actually rendered today.
 */
export function getCountryRecord(slug: string): CountryRecord | null {
  return COUNTRY_RECORDS[slug] ?? null
}

/**
 * Rounds a raw population integer to the nearest whole billion and renders
 * it as "<N | N.d | N.dd> billion", trimming trailing zeroes (1.40 -> "1.4",
 * 1.00 -> "1"). Works in hundredths-of-a-billion integer units throughout
 * (value / 10_000_000) rather than float billions, so a case like
 * 1_005_000_000 rounds to exactly 101 hundredths (1.01), not 100 due to
 * 1.005's binary floating-point representation being very slightly under
 * 1.005 (100.49999999999999 * ... would otherwise round down to 1.00).
 */
function formatBillions(value: number): string {
  const hundredths = Math.round(value / 10_000_000)
  const whole = Math.floor(hundredths / 100)
  const frac = hundredths % 100
  if (frac === 0) return `${whole} billion`
  if (frac % 10 === 0) return `${whole}.${frac / 10} billion`
  return `${whole}.${String(frac).padStart(2, '0')} billion`
}

/**
 * Population display formatting for a geography-reference UI: exact raw
 * figures like "1,412,914,089" or "349,035,494" are precise but not
 * meaningful at a glance, so this renders a rounded, human-scaled string
 * instead. This is purely a display transform — population.value/asOf in
 * COUNTRY_RECORDS are never modified, and population.asOf is still never
 * rendered (see formatPopulationNote()).
 *
 * Rules (checked in this order):
 *  - >= 1,000,000,000: billions, up to 2 decimals, no trailing zeroes
 *    ("1.41 billion", "1.4 billion", "1 billion").
 *  - >= 1,000,000: nearest whole million ("349 million"). If rounding
 *    reaches 1000+ million (e.g. 999,999,999 -> 1000 million), it is
 *    re-expressed as billions ("1 billion") rather than shown as "1000
 *    million" — the cleaner result across the unit boundary.
 *  - >= 1,000: nearest whole thousand, comma-grouped ("245,000"). If
 *    rounding reaches 1,000,000+ (e.g. 999,500 -> 1,000,000), it is
 *    re-expressed as millions ("1 million") the same way.
 *  - < 1,000: the exact whole number, comma-grouped (e.g. Vatican City's
 *    887), never "0,000" or "0 thousand".
 */
export function formatPopulation(population: CountryPopulation): string {
  const value = population.value
  if (value >= 1_000_000_000) return formatBillions(value)
  if (value >= 1_000_000) {
    const millions = Math.round(value / 1_000_000)
    if (millions >= 1000) return formatBillions(millions * 1_000_000)
    return `${millions} million`
  }
  if (value >= 1_000) {
    const thousands = Math.round(value / 1_000) * 1_000
    if (thousands >= 1_000_000) return `${thousands / 1_000_000} million`
    return thousands.toLocaleString('en-US')
  }
  return value.toLocaleString('en-US')
}

/** "Estimate as of 2026" — the small secondary note, never the main stat. */
export function formatPopulationNote(population: CountryPopulation): string {
  return `Estimate as of ${population.asOf}`
}

/** "Tanzanian Shilling (TZS) · TSh" — name, code and symbol all present. */
export function formatCurrency(currency: CountryCurrency): string {
  return `${currency.name} (${currency.code}) · ${currency.symbol}`
}
