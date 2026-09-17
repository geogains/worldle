/**
 * Country slug -> flag code, which names the flag asset in
 * public/flags/<CODE>.png. Almost every value is an ISO 3166-1 alpha-2
 * country code, but a handful of non-sovereign entities use a real ISO
 * 3166-2 subdivision code instead (see "england"/"scotland"/"wales" below) —
 * see auditFlags() in audit.ts for the exact format this module accepts for
 * both cases. The flags directory holds more entries than the gameplay
 * dataset (territories, subdivisions, historical entries etc.); only slugs
 * listed here get a flag, and nothing in public/flags ever becomes a
 * playable country by itself — the gameplay dataset in data/countries.ts
 * stays authoritative.
 *
 * Every key must be an existing country id; a test enforces that so a typo
 * can never point at a non-country. Ambiguous cases follow the dataset's own
 * naming decisions (see the comment above RAW_COUNTRY_NAMES in
 * data/countries.ts), mapped to whichever ISO entity that name refers to:
 *  - "congo" (Republic of the Congo) -> CG; "dr-congo" (Democratic Republic
 *    of the Congo) -> CD. These are deliberately different flags.
 *  - "south-korea" -> KR, "north-korea" -> KP.
 *  - "micronesia" (Federated States of Micronesia) -> FM.
 *  - "taiwan" -> TW, "palestine" -> PS, "vatican-city" -> VA — used exactly
 *    as the dataset names them, with no political qualifier added.
 *  - "kosovo" -> XK. XK is NOT an official ISO 3166-1 code — ISO has never
 *    assigned Kosovo one, since it lacks universal recognition — it is the
 *    "user-assigned" code (ISO 3166-1 reserves the X* range for exactly
 *    this) that has become the de facto standard used by the EU, SWIFT,
 *    and effectively every flag-icon set, including the asset already
 *    present at public/flags/XK.png. Still a well-formed two-letter code
 *    by this module's own format check; flagged here so it's never mistaken
 *    for an official assignment.
 *  - "england" -> GB-ENG, "scotland" -> GB-SCT, "wales" -> GB-WLS. These are
 *    NOT invented codes — they are the real, officially assigned ISO 3166-2
 *    subdivision codes for the United Kingdom's constituent countries.
 *    (GB-NIR, Northern Ireland's equivalent subdivision code, is not used
 *    anywhere in this project — Northern Ireland is not a canonical country
 *    here and none is planned; see the note in data/countries.ts.)
 *    England/Scotland/Wales are constituent countries, not sovereign
 *    ISO 3166-1 states, so no plain two-letter code exists for them, and
 *    they deliberately do NOT share the United Kingdom's own "GB" code —
 *    "united-kingdom" keeps that mapping exclusively, so its flag stays
 *    distinct from all three. `flagUrlForCode` needed no change: it just
 *    uppercases and appends ".png", so "GB-ENG" already resolves correctly
 *    to the existing /flags/GB-ENG.png asset.
 *
 * COVERAGE (data-population phase, flags only): all 200 gameplay countries
 * are mapped. "mauritania" -> MR was a gap (no public/flags/MR.png existed)
 * until that asset was added and completed it. See flags.test.ts for the
 * audit that enforces mapping integrity: every mapping key is a real
 * country id and every mapped code has an on-disk asset.
 */
export const COUNTRY_CODES: Readonly<Record<string, string>> = Object.freeze({
  afghanistan: 'AF',
  albania: 'AL',
  algeria: 'DZ',
  andorra: 'AD',
  angola: 'AO',
  'antigua-and-barbuda': 'AG',
  argentina: 'AR',
  armenia: 'AM',
  australia: 'AU',
  austria: 'AT',
  azerbaijan: 'AZ',
  bahamas: 'BS',
  bahrain: 'BH',
  bangladesh: 'BD',
  barbados: 'BB',
  belarus: 'BY',
  belgium: 'BE',
  belize: 'BZ',
  benin: 'BJ',
  bhutan: 'BT',
  bolivia: 'BO',
  'bosnia-and-herzegovina': 'BA',
  botswana: 'BW',
  brazil: 'BR',
  brunei: 'BN',
  bulgaria: 'BG',
  'burkina-faso': 'BF',
  burundi: 'BI',
  'cabo-verde': 'CV',
  cambodia: 'KH',
  cameroon: 'CM',
  canada: 'CA',
  'central-african-republic': 'CF',
  chad: 'TD',
  chile: 'CL',
  china: 'CN',
  colombia: 'CO',
  comoros: 'KM',
  congo: 'CG',
  'costa-rica': 'CR',
  croatia: 'HR',
  cuba: 'CU',
  cyprus: 'CY',
  czechia: 'CZ',
  denmark: 'DK',
  djibouti: 'DJ',
  dominica: 'DM',
  'dominican-republic': 'DO',
  'dr-congo': 'CD',
  ecuador: 'EC',
  egypt: 'EG',
  'el-salvador': 'SV',
  england: 'GB-ENG',
  'equatorial-guinea': 'GQ',
  eritrea: 'ER',
  estonia: 'EE',
  eswatini: 'SZ',
  ethiopia: 'ET',
  fiji: 'FJ',
  finland: 'FI',
  france: 'FR',
  gabon: 'GA',
  gambia: 'GM',
  georgia: 'GE',
  germany: 'DE',
  ghana: 'GH',
  greece: 'GR',
  grenada: 'GD',
  guatemala: 'GT',
  guinea: 'GN',
  'guinea-bissau': 'GW',
  guyana: 'GY',
  haiti: 'HT',
  honduras: 'HN',
  hungary: 'HU',
  iceland: 'IS',
  india: 'IN',
  indonesia: 'ID',
  iran: 'IR',
  iraq: 'IQ',
  ireland: 'IE',
  israel: 'IL',
  italy: 'IT',
  'ivory-coast': 'CI',
  jamaica: 'JM',
  japan: 'JP',
  jordan: 'JO',
  kazakhstan: 'KZ',
  kenya: 'KE',
  kiribati: 'KI',
  kosovo: 'XK',
  kuwait: 'KW',
  kyrgyzstan: 'KG',
  laos: 'LA',
  latvia: 'LV',
  lebanon: 'LB',
  lesotho: 'LS',
  liberia: 'LR',
  libya: 'LY',
  liechtenstein: 'LI',
  lithuania: 'LT',
  luxembourg: 'LU',
  madagascar: 'MG',
  malawi: 'MW',
  malaysia: 'MY',
  maldives: 'MV',
  mali: 'ML',
  malta: 'MT',
  'marshall-islands': 'MH',
  mauritania: 'MR',
  mauritius: 'MU',
  mexico: 'MX',
  micronesia: 'FM',
  moldova: 'MD',
  monaco: 'MC',
  mongolia: 'MN',
  montenegro: 'ME',
  morocco: 'MA',
  mozambique: 'MZ',
  myanmar: 'MM',
  namibia: 'NA',
  nauru: 'NR',
  nepal: 'NP',
  netherlands: 'NL',
  'new-zealand': 'NZ',
  nicaragua: 'NI',
  niger: 'NE',
  nigeria: 'NG',
  'north-korea': 'KP',
  'north-macedonia': 'MK',
  norway: 'NO',
  oman: 'OM',
  pakistan: 'PK',
  palau: 'PW',
  palestine: 'PS',
  panama: 'PA',
  'papua-new-guinea': 'PG',
  paraguay: 'PY',
  peru: 'PE',
  philippines: 'PH',
  poland: 'PL',
  portugal: 'PT',
  qatar: 'QA',
  romania: 'RO',
  russia: 'RU',
  rwanda: 'RW',
  'saint-kitts-and-nevis': 'KN',
  'saint-lucia': 'LC',
  'saint-vincent-and-the-grenadines': 'VC',
  samoa: 'WS',
  'san-marino': 'SM',
  'sao-tome-and-principe': 'ST',
  'saudi-arabia': 'SA',
  scotland: 'GB-SCT',
  senegal: 'SN',
  serbia: 'RS',
  seychelles: 'SC',
  'sierra-leone': 'SL',
  singapore: 'SG',
  slovakia: 'SK',
  slovenia: 'SI',
  'solomon-islands': 'SB',
  somalia: 'SO',
  'south-africa': 'ZA',
  'south-korea': 'KR',
  'south-sudan': 'SS',
  spain: 'ES',
  'sri-lanka': 'LK',
  sudan: 'SD',
  suriname: 'SR',
  sweden: 'SE',
  switzerland: 'CH',
  syria: 'SY',
  taiwan: 'TW',
  tajikistan: 'TJ',
  tanzania: 'TZ',
  thailand: 'TH',
  'timor-leste': 'TL',
  togo: 'TG',
  tonga: 'TO',
  'trinidad-and-tobago': 'TT',
  tunisia: 'TN',
  turkey: 'TR',
  turkmenistan: 'TM',
  tuvalu: 'TV',
  uganda: 'UG',
  ukraine: 'UA',
  'united-arab-emirates': 'AE',
  'united-kingdom': 'GB',
  'united-states': 'US',
  uruguay: 'UY',
  uzbekistan: 'UZ',
  vanuatu: 'VU',
  'vatican-city': 'VA',
  venezuela: 'VE',
  vietnam: 'VN',
  wales: 'GB-WLS',
  yemen: 'YE',
  zambia: 'ZM',
  zimbabwe: 'ZW',
})

/**
 * Asset convention (all files in public/flags share it): 512x512 PNG with a
 * 3:2 flag centred vertically, rows 88-424 opaque, transparent above/below.
 * The card's flag frame uses these to trim the transparent band without
 * cropping any flag content.
 */
export const FLAG_ASSET = Object.freeze({
  canvasSize: 512,
  contentHeight: 336,
  /** Fraction of the canvas that is transparent padding on each of the top/bottom. */
  verticalPadding: 88 / 512,
})

export function flagUrlForCode(code: string): string {
  return `/flags/${code.toUpperCase()}.png`
}

export function countryCodeForSlug(slug: string): string | null {
  return COUNTRY_CODES[slug] ?? null
}
