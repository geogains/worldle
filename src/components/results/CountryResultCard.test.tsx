import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ANSWER_POOL, COUNTRIES, findCountryById, isEligibleAnswer } from '../../data/countries'
import { buildCountryDetails, COUNTRY_FACTS, getCountryDetails, PLACEHOLDER, type CountryFactsRecord } from '../../data/countryDetails'
import { CountryResultCard } from './CountryResultCard'

// QA fixtures only — representative lengths for layout, not verified data.
const REALISTIC: CountryFactsRecord = {
  capital: 'Dodoma',
  population: '68.6 million',
  continent: 'Africa',
  currency: 'Tanzanian shilling',
  languages: ['Swahili', 'English'],
  funFact: 'Layout fixture: a representative two-to-three line sentence of roughly one hundred and thirty characters used only to check wrapping.',
}
const STRESS: CountryFactsRecord = {
  capital: 'Sri Jayawardenepura Kotte (administrative)',
  currency: 'Bosnia and Herzegovina convertible mark',
  languages: ['Bosnian', 'Croatian', 'Serbian', 'Hungarian'],
  funFact: 'Stress fixture. '.repeat(12),
}

describe('CountryResultCard with populated records (fixtures)', () => {
  const tanzania = findCountryById('tanzania')!

  it('renders verified values without placeholder styling', () => {
    const { container } = render(
      <CountryResultCard details={buildCountryDetails(tanzania, REALISTIC)} context={null} primaryAction={<button>Go</button>} />,
    )
    const facts = within(container.querySelector('.country-result__facts') as HTMLElement)
    expect(facts.getByText('Dodoma')).not.toHaveClass('country-result__fact-value--placeholder')
    expect(facts.getByText('Swahili, English')).toBeInTheDocument()
    expect(screen.queryByText(PLACEHOLDER.value)).not.toBeInTheDocument()
    expect(screen.getByText(REALISTIC.funFact!)).not.toHaveClass('country-result__fact-value--placeholder')
  })

  it('mixes long values with placeholders field by field', () => {
    const { container } = render(
      <CountryResultCard details={buildCountryDetails(tanzania, STRESS)} context={null} primaryAction={<button>Go</button>} />,
    )
    const facts = within(container.querySelector('.country-result__facts') as HTMLElement)
    expect(facts.getByText(STRESS.capital!)).toBeInTheDocument()
    expect(facts.getByText('Bosnian, Croatian, Serbian, Hungarian')).toBeInTheDocument()
    // population + continent were not supplied
    expect(facts.getAllByText(PLACEHOLDER.value)).toHaveLength(2)
    // Languages is always the last fact so CSS can span it across both columns.
    const labels = Array.from((container.querySelector('.country-result__facts') as HTMLElement).querySelectorAll('dt'))
    expect(labels[labels.length - 1]).toHaveTextContent('Languages')
  })
})

describe('Batch 1 country records, resolved end-to-end through getCountryDetails()', () => {
  it('Argentina: population renders in rounded display form, no year/estimate anywhere', () => {
    const details = getCountryDetails('argentina')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('46 million')).toBeInTheDocument()
    expect(screen.queryByText(/estimate as of/i)).not.toBeInTheDocument()
    expect(screen.queryByText('2026')).not.toBeInTheDocument()
  })

  it('Angola: currency renders name, code and symbol', () => {
    const details = getCountryDetails('angola')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Angolan Kwanza (AOA) · Kz')).toBeInTheDocument()
  })

  it('Afghanistan and Antigua and Barbuda: not answer-eligible, but now fully populated (Study-data Batch A) with zero "Coming soon" placeholders — reversing the old "excluded because non-playable" behaviour', () => {
    for (const slug of ['afghanistan', 'antigua-and-barbuda']) {
      const details = getCountryDetails(slug)!
      expect(Object.values(details.verified).every((v) => v === true), slug).toBe(true)
      const { unmount } = render(
        <CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />,
      )
      expect(screen.queryAllByText(PLACEHOLDER.value).length, slug).toBe(0)
      unmount()
    }
  })

  it('Algeria: official languages render as a comma-separated list', () => {
    const details = getCountryDetails('algeria')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Arabic, Tamazight')).toBeInTheDocument()
  })

  it('Australia: has no de jure official language but renders English as its principal language (post language-policy revision), not "No official language"', () => {
    const details = getCountryDetails('australia')!
    expect(details.languages).toEqual(['English'])
    expect(details.verified.languages).toBe(true)
    const { container } = render(
      <CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />,
    )
    const languagesValue = container.querySelector('.country-result__fact:last-child .country-result__fact-value')
    expect(languagesValue).toHaveTextContent('English')
    expect(screen.queryByText('No official language')).not.toBeInTheDocument()
    // Verified data, so it must not carry the muted "placeholder" styling.
    expect(languagesValue).not.toHaveClass('country-result__fact-value--placeholder')
  })

  it('all eight playable Batch 1 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'albania', 'algeria', 'andorra', 'angola',
      'argentina', 'armenia', 'australia', 'austria',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
    }
  })
})

describe('Batch 2 country records, resolved end-to-end through getCountryDetails()', () => {
  it('Bangladesh: population renders in rounded display form, no year/estimate anywhere', () => {
    const details = getCountryDetails('bangladesh')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('178 million')).toBeInTheDocument()
    expect(screen.queryByText(/estimate as of/i)).not.toBeInTheDocument()
    expect(screen.queryByText('2026')).not.toBeInTheDocument()
  })

  it('Azerbaijan and Bahrain: currency renders name, code and Unicode symbol correctly', () => {
    const azerbaijan = getCountryDetails('azerbaijan')!
    render(<CountryResultCard details={azerbaijan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Azerbaijani Manat (AZN) · ₼')).toBeInTheDocument()

    const bahrain = getCountryDetails('bahrain')!
    render(<CountryResultCard details={bahrain} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Bahraini Dinar (BHD) · د.ب')).toBeInTheDocument()
  })

  it('Belgium: a multi-language official list renders as a comma-separated string', () => {
    const details = getCountryDetails('belgium')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Dutch, French, German')).toBeInTheDocument()
  })

  it('all ten Batch 2 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados',
      'belarus', 'belgium', 'belize', 'benin', 'bhutan',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

})

describe('Batch 3 country records, resolved end-to-end through getCountryDetails()', () => {
  it('Brazil: population renders in rounded display form, no year/estimate anywhere', () => {
    const details = getCountryDetails('brazil')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('214 million')).toBeInTheDocument()
    expect(screen.queryByText(/estimate as of/i)).not.toBeInTheDocument()
    expect(screen.queryByText('2026')).not.toBeInTheDocument()
  })

  it('Bulgaria and Cambodia: currency renders name, code and Unicode symbol correctly', () => {
    const bulgaria = getCountryDetails('bulgaria')!
    render(<CountryResultCard details={bulgaria} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()

    const cambodia = getCountryDetails('cambodia')!
    render(<CountryResultCard details={cambodia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Cambodian Riel (KHR) · ៛')).toBeInTheDocument()
  })

  it("Bolivia: all 37 official languages survive the raw-data → derived-data → rendered-UI flow intact", () => {
    const details = getCountryDetails('bolivia')!
    expect(details.languages).toHaveLength(37)
    const { container } = render(
      <CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />,
    )
    const languagesValue = container.querySelector('.country-result__fact:last-child .country-result__fact-value')
    // Every language present in the rendered text, comma-separated, nothing dropped.
    expect(languagesValue?.textContent).toBe(details.languages.join(', '))
    expect(languagesValue?.textContent).toContain('Spanish')
    expect(languagesValue?.textContent).toContain("Guarasu'we")
    expect(languagesValue?.textContent).toContain('Zamuco')
    expect(languagesValue?.textContent?.split(', ')).toHaveLength(37)
    expect(languagesValue).not.toHaveClass('country-result__fact-value--placeholder')
  })

  it('Cameroon and Canada: multi-language official lists render as comma-separated strings', () => {
    const cameroon = getCountryDetails('cameroon')!
    render(<CountryResultCard details={cameroon} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('English, French')).toBeInTheDocument()
  })

  it('all ten Batch 3 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'bolivia', 'botswana', 'brazil', 'brunei', 'bulgaria',
      'burundi', 'cabo-verde', 'cambodia', 'cameroon', 'canada',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

})

describe('Batch 4 country records, resolved end-to-end through getCountryDetails()', () => {
  it('China: population renders in rounded display form, no year/estimate anywhere', () => {
    const details = getCountryDetails('china')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('1.41 billion')).toBeInTheDocument()
    expect(screen.queryByText(/estimate as of/i)).not.toBeInTheDocument()
    expect(screen.queryByText('2026')).not.toBeInTheDocument()
  })

  it('China and Costa Rica: currency renders name, code and Unicode symbol correctly', () => {
    const china = getCountryDetails('china')!
    render(<CountryResultCard details={china} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Renminbi (CNY) · ¥')).toBeInTheDocument()

    const costaRica = getCountryDetails('costa-rica')!
    render(<CountryResultCard details={costaRica} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Costa Rican Colón (CRC) · ₡')).toBeInTheDocument()
  })

  it('Comoros: all three official languages survive the raw-data → derived-data → rendered-UI flow', () => {
    const details = getCountryDetails('comoros')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Comorian (Shikomor), French, Arabic')).toBeInTheDocument()
  })

  it('China: language renders as the full "Standard Chinese (Putonghua)" label', () => {
    const details = getCountryDetails('china')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Standard Chinese (Putonghua)')).toBeInTheDocument()
  })

  it('Congo: resolves to the Republic of the Congo card, distinct from DR Congo', () => {
    const details = getCountryDetails('congo')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Congo' })).toBeInTheDocument()
    expect(screen.getByText('Brazzaville')).toBeInTheDocument()
    // DR Congo (Batch 5) is its own record with its own capital — see the
    // dedicated "DR Congo: resolves to its own card..." test below.
    expect(getCountryDetails('dr-congo')!.capital).not.toBe('Brazzaville')
  })

  it('all ten Batch 4 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'chad', 'chile', 'china', 'colombia', 'comoros',
      'congo', 'costa-rica', 'croatia', 'cuba', 'cyprus',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

})

describe('Batch 5 country records, resolved end-to-end through getCountryDetails()', () => {
  it('Egypt: population renders in rounded display form, no year/estimate anywhere', () => {
    const details = getCountryDetails('egypt')!
    render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('120 million')).toBeInTheDocument()
    expect(screen.queryByText(/estimate as of/i)).not.toBeInTheDocument()
    expect(screen.queryByText('2026')).not.toBeInTheDocument()
  })

  it('Czechia and Egypt: currency renders name, code and Unicode symbol correctly (Kč, E£)', () => {
    const czechia = getCountryDetails('czechia')!
    render(<CountryResultCard details={czechia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Czech Koruna (CZK) · Kč')).toBeInTheDocument()

    const egypt = getCountryDetails('egypt')!
    render(<CountryResultCard details={egypt} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Egyptian Pound (EGP) · E£')).toBeInTheDocument()

    const estonia = getCountryDetails('estonia')!
    render(<CountryResultCard details={estonia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()
  })

  it('Eritrea: has no de jure official language but renders its three working languages (post language-policy revision), not "No official language"', () => {
    const details = getCountryDetails('eritrea')!
    expect(details.languages).toEqual(['Tigrinya', 'Arabic', 'English'])
    expect(details.verified.languages).toBe(true)
    const { container } = render(
      <CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />,
    )
    const languagesValue = container.querySelector('.country-result__fact:last-child .country-result__fact-value')
    expect(languagesValue).toHaveTextContent('Tigrinya, Arabic, English')
    expect(screen.queryByText('No official language')).not.toBeInTheDocument()
    expect(languagesValue).not.toHaveClass('country-result__fact-value--placeholder')
  })

  it('DR Congo: resolves to its own card, distinct from Congo — no field collision', () => {
    const drCongo = getCountryDetails('dr-congo')!
    render(<CountryResultCard details={drCongo} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'DR Congo' })).toBeInTheDocument()
    expect(screen.getByText('Kinshasa')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of DR Congo' })).toHaveAttribute('src', '/flags/CD.png')

    const congo = getCountryDetails('congo')!
    expect(congo.capital).toBe('Brazzaville')
    expect(congo.flagUrl).toBe('/flags/CG.png')
  })

  it('all ten Batch 5 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'czechia', 'denmark', 'djibouti', 'dominica', 'dr-congo',
      'ecuador', 'egypt', 'el-salvador', 'eritrea', 'estonia',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('no country outside the supplied Batch 5 was accidentally populated (neighbouring alphabetical entries)', () => {
    // Eswatini/Ethiopia/Fiji were placeholder-only as of Batch 5 but are now
    // populated by Batch 6 (see below) — Batch 5's own boundary check instead
    // uses a country that stays on the placeholder path after both batches.
    // The full dataset (all 169 ANSWER_POOL countries) is now complete —
    // "mauritania" (the former last gap, used here in several earlier
    // batches as the permanent placeholder anchor) is populated too; see
    // the dedicated Mauritania-completion tests further down. No real
    // gameplay country remains on the placeholder path, so this check now
    // confirms a non-gameplay id still correctly resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 6 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 6 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'eswatini', 'ethiopia', 'fiji', 'finland', 'france',
      'gabon', 'gambia', 'georgia', 'germany', 'ghana',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Georgia, Germany and Ghana: currency renders name, code and Unicode symbol correctly (₾, €, ₵)', () => {
    const georgia = getCountryDetails('georgia')!
    render(<CountryResultCard details={georgia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Georgian Lari (GEL) · ₾')).toBeInTheDocument()

    const germany = getCountryDetails('germany')!
    render(<CountryResultCard details={germany} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()

    const ghana = getCountryDetails('ghana')!
    render(<CountryResultCard details={ghana} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Ghanaian Cedi (GHS) · ₵')).toBeInTheDocument()
  })

  it('Eswatini and Finland: both official languages render, in order', () => {
    const eswatini = getCountryDetails('eswatini')!
    expect(eswatini.languages).toEqual(['siSwati', 'English'])
    render(<CountryResultCard details={eswatini} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('siSwati, English')).toBeInTheDocument()

    const finland = getCountryDetails('finland')!
    expect(finland.languages).toEqual(['Finnish', 'Swedish'])
    render(<CountryResultCard details={finland} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Finnish, Swedish')).toBeInTheDocument()
  })

  it('Georgia renders only Georgian, not Abkhazian (territorial co-official status, not nationwide)', () => {
    const georgia = getCountryDetails('georgia')!
    expect(georgia.languages).toEqual(['Georgian'])
    render(<CountryResultCard details={georgia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Georgian')).toBeInTheDocument()
    expect(screen.queryByText(/Abkhazian/)).not.toBeInTheDocument()
  })

  it('no country outside the supplied Batch 6 was accidentally populated (neighbouring alphabetical entries)', () => {
    // Greece/Grenada/Guatemala were placeholder-only as of Batch 6 but are
    // now populated by Batch 7 (see below) — Batch 6's own boundary check
    // instead uses a country that stays on the placeholder path after both.
    // The full dataset (all 169 ANSWER_POOL countries) is now complete —
    // "mauritania" (the former last gap, used here in several earlier
    // batches as the permanent placeholder anchor) is populated too; see
    // the dedicated Mauritania-completion tests further down. No real
    // gameplay country remains on the placeholder path, so this check now
    // confirms a non-gameplay id still correctly resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 7 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 7 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'greece', 'grenada', 'guatemala', 'guinea', 'guyana',
      'haiti', 'honduras', 'hungary', 'iceland', 'india',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Greece, Guatemala, Hungary and India: currency renders name, code and Unicode symbol correctly (€, Q, Ft, ₹)', () => {
    const greece = getCountryDetails('greece')!
    render(<CountryResultCard details={greece} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()

    const guatemala = getCountryDetails('guatemala')!
    render(<CountryResultCard details={guatemala} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Guatemalan Quetzal (GTQ) · Q')).toBeInTheDocument()

    const hungary = getCountryDetails('hungary')!
    render(<CountryResultCard details={hungary} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Hungarian Forint (HUF) · Ft')).toBeInTheDocument()

    const india = getCountryDetails('india')!
    render(<CountryResultCard details={india} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Indian Rupee (INR) · ₹')).toBeInTheDocument()
  })

  it('Guatemala renders Spanish only', () => {
    const guatemala = getCountryDetails('guatemala')!
    expect(guatemala.languages).toEqual(['Spanish'])
    render(<CountryResultCard details={guatemala} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Spanish')).toBeInTheDocument()
  })

  it('Guyana renders English only', () => {
    const guyana = getCountryDetails('guyana')!
    expect(guyana.languages).toEqual(['English'])
    render(<CountryResultCard details={guyana} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('Haiti renders exactly two official languages, in order: Haitian Creole, French', () => {
    const haiti = getCountryDetails('haiti')!
    expect(haiti.languages).toEqual(['Haitian Creole', 'French'])
    render(<CountryResultCard details={haiti} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Haitian Creole, French')).toBeInTheDocument()
  })

  it('India renders exactly Hindi and English, not the full scheduled-language list', () => {
    const india = getCountryDetails('india')!
    expect(india.languages).toEqual(['Hindi', 'English'])
    render(<CountryResultCard details={india} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Hindi, English')).toBeInTheDocument()
    expect(screen.queryByText(/national language/i)).not.toBeInTheDocument()
  })

  it('no country outside the supplied Batch 7 was accidentally populated (neighbouring alphabetical entries)', () => {
    // Indonesia/Iran/Iraq were placeholder-only as of Batch 7 but are now
    // populated by Batch 8 (see below) — Batch 7's own boundary check
    // instead uses a country that stays on the placeholder path after both.
    // The full dataset (all 169 ANSWER_POOL countries) is now complete —
    // "mauritania" (the former last gap, used here in several earlier
    // batches as the permanent placeholder anchor) is populated too; see
    // the dedicated Mauritania-completion tests further down. No real
    // gameplay country remains on the placeholder path, so this check now
    // confirms a non-gameplay id still correctly resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 8 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 8 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'indonesia', 'iran', 'iraq', 'ireland', 'israel',
      'italy', 'ivory-coast', 'jamaica', 'japan', 'jordan',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Indonesia, Iran, Iraq, Israel, Japan and Jordan: currency renders name, code and Unicode symbol correctly (Rp, ﷼, ع.د, ₪, ¥, د.ا)', () => {
    const indonesia = getCountryDetails('indonesia')!
    render(<CountryResultCard details={indonesia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Indonesian Rupiah (IDR) · Rp')).toBeInTheDocument()

    const iran = getCountryDetails('iran')!
    render(<CountryResultCard details={iran} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Iranian Rial (IRR) · ﷼')).toBeInTheDocument()

    const iraq = getCountryDetails('iraq')!
    render(<CountryResultCard details={iraq} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Iraqi Dinar (IQD) · ع.د')).toBeInTheDocument()

    const israel = getCountryDetails('israel')!
    render(<CountryResultCard details={israel} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Israeli New Shekel (ILS) · ₪')).toBeInTheDocument()

    const japan = getCountryDetails('japan')!
    render(<CountryResultCard details={japan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Japanese Yen (JPY) · ¥')).toBeInTheDocument()

    const jordan = getCountryDetails('jordan')!
    render(<CountryResultCard details={jordan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Jordanian Dinar (JOD) · د.ا')).toBeInTheDocument()
  })

  it('Iraq renders exactly two languages, in order: Arabic, Kurdish', () => {
    const iraq = getCountryDetails('iraq')!
    expect(iraq.languages).toEqual(['Arabic', 'Kurdish'])
    render(<CountryResultCard details={iraq} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Arabic, Kurdish')).toBeInTheDocument()
  })

  it('Ireland renders exactly two languages, in order: Irish, English', () => {
    const ireland = getCountryDetails('ireland')!
    expect(ireland.languages).toEqual(['Irish', 'English'])
    render(<CountryResultCard details={ireland} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Irish, English')).toBeInTheDocument()
  })

  it('Israel renders Hebrew only, capital renders as the supplied Jerusalem with no extra geopolitical text', () => {
    const israel = getCountryDetails('israel')!
    expect(israel.languages).toEqual(['Hebrew'])
    render(<CountryResultCard details={israel} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Hebrew')).toBeInTheDocument()
    expect(screen.getByText('Jerusalem', { exact: true })).toBeInTheDocument()
  })

  it('Ivory Coast: heading and flag use the gameplay display name, not the official name', () => {
    const ivoryCoast = getCountryDetails('ivory-coast')!
    expect(ivoryCoast.name).toBe('Ivory Coast')
    render(<CountryResultCard details={ivoryCoast} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    // "Côte d'Ivoire" legitimately appears in the fun-fact sentence itself
    // (supplied verbatim); only the heading/flag-alt must use the gameplay
    // display name, not the officialName field (which the UI never renders).
    expect(screen.getByRole('heading', { level: 1, name: 'Ivory Coast' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of Ivory Coast' })).toHaveAttribute('src', '/flags/CI.png')
    expect(screen.getByText('Yamoussoukro')).toBeInTheDocument()
    expect(screen.getByText('French')).toBeInTheDocument()
  })

  it('Jamaica renders English only', () => {
    const jamaica = getCountryDetails('jamaica')!
    expect(jamaica.languages).toEqual(['English'])
    render(<CountryResultCard details={jamaica} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('Japan renders Japanese', () => {
    const japan = getCountryDetails('japan')!
    expect(japan.languages).toEqual(['Japanese'])
    render(<CountryResultCard details={japan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Japanese')).toBeInTheDocument()
  })

  it('Jordan renders Arabic only', () => {
    const jordan = getCountryDetails('jordan')!
    expect(jordan.languages).toEqual(['Arabic'])
    render(<CountryResultCard details={jordan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Arabic')).toBeInTheDocument()
  })

  it('no country outside the supplied Batch 8 was accidentally populated (neighbouring alphabetical entries)', () => {
    // Kazakhstan/Kenya/Kiribati were placeholder-only as of Batch 8 but are
    // now populated by Batch 9 (see below) — Batch 8's own boundary check
    // instead uses a country that stays on the placeholder path after both.
    // The full dataset (all 169 ANSWER_POOL countries) is now complete —
    // "mauritania" (the former last gap, used here in several earlier
    // batches as the permanent placeholder anchor) is populated too; see
    // the dedicated Mauritania-completion tests further down. No real
    // gameplay country remains on the placeholder path, so this check now
    // confirms a non-gameplay id still correctly resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 9 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 9 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'kazakhstan', 'kenya', 'kiribati', 'kosovo', 'kuwait',
      'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Kazakhstan, Kosovo, Kuwait, Kyrgyzstan, Laos and Lebanon: currency renders name, code and Unicode symbol correctly (₸, €, د.ك, сом, ₭, ل.ل)', () => {
    const kazakhstan = getCountryDetails('kazakhstan')!
    render(<CountryResultCard details={kazakhstan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Kazakhstani Tenge (KZT) · ₸')).toBeInTheDocument()

    const kosovo = getCountryDetails('kosovo')!
    render(<CountryResultCard details={kosovo} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()

    const kuwait = getCountryDetails('kuwait')!
    render(<CountryResultCard details={kuwait} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Kuwaiti Dinar (KWD) · د.ك')).toBeInTheDocument()

    const kyrgyzstan = getCountryDetails('kyrgyzstan')!
    render(<CountryResultCard details={kyrgyzstan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Kyrgyzstani Som (KGS) · сом')).toBeInTheDocument()

    const laos = getCountryDetails('laos')!
    render(<CountryResultCard details={laos} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Lao Kip (LAK) · ₭')).toBeInTheDocument()

    const lebanon = getCountryDetails('lebanon')!
    render(<CountryResultCard details={lebanon} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Lebanese Pound (LBP) · ل.ل')).toBeInTheDocument()
  })

  it('Kazakhstan renders exactly Kazakh, Russian', () => {
    const kazakhstan = getCountryDetails('kazakhstan')!
    expect(kazakhstan.languages).toEqual(['Kazakh', 'Russian'])
    render(<CountryResultCard details={kazakhstan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Kazakh, Russian')).toBeInTheDocument()
  })

  it('Kenya renders exactly Kiswahili, English', () => {
    const kenya = getCountryDetails('kenya')!
    expect(kenya.languages).toEqual(['Kiswahili', 'English'])
    render(<CountryResultCard details={kenya} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Kiswahili, English')).toBeInTheDocument()
  })

  it('Kiribati renders exactly Gilbertese, English', () => {
    const kiribati = getCountryDetails('kiribati')!
    expect(kiribati.languages).toEqual(['Gilbertese', 'English'])
    render(<CountryResultCard details={kiribati} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Gilbertese, English')).toBeInTheDocument()
  })

  it('Kosovo: uses XK flag, renders Pristina and EUR, and renders exactly Albanian, Serbian', () => {
    const kosovo = getCountryDetails('kosovo')!
    expect(kosovo.languages).toEqual(['Albanian', 'Serbian'])
    render(<CountryResultCard details={kosovo} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('img', { name: 'Flag of Kosovo' })).toHaveAttribute('src', '/flags/XK.png')
    expect(screen.getByText('Pristina')).toBeInTheDocument()
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()
    expect(screen.getByText('Albanian, Serbian')).toBeInTheDocument()
    expect(screen.queryByText(/Turkish|Bosnian|Roma/)).not.toBeInTheDocument()
  })

  it('Kyrgyzstan renders exactly Kyrgyz, Russian', () => {
    const kyrgyzstan = getCountryDetails('kyrgyzstan')!
    expect(kyrgyzstan.languages).toEqual(['Kyrgyz', 'Russian'])
    render(<CountryResultCard details={kyrgyzstan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Kyrgyz, Russian')).toBeInTheDocument()
  })

  it('Latvia renders Latvian only', () => {
    const latvia = getCountryDetails('latvia')!
    expect(latvia.languages).toEqual(['Latvian'])
    render(<CountryResultCard details={latvia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Latvian')).toBeInTheDocument()
  })

  it('Lebanon renders Arabic only', () => {
    const lebanon = getCountryDetails('lebanon')!
    expect(lebanon.languages).toEqual(['Arabic'])
    render(<CountryResultCard details={lebanon} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Arabic')).toBeInTheDocument()
  })

  it('Lesotho renders exactly Sesotho, English', () => {
    const lesotho = getCountryDetails('lesotho')!
    expect(lesotho.languages).toEqual(['Sesotho', 'English'])
    render(<CountryResultCard details={lesotho} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Sesotho, English')).toBeInTheDocument()
  })

  it('no country outside the supplied Batch 9 was accidentally populated (neighbouring alphabetical entries)', () => {
    // Liberia/Libya/Lithuania were placeholder-only as of Batch 9 but are
    // now populated by Batch 10 (see below) — Batch 9's own boundary check
    // instead uses a country that stays on the placeholder path after both.
    // The full dataset (all 169 ANSWER_POOL countries) is now complete —
    // "mauritania" (the former last gap, used here in several earlier
    // batches as the permanent placeholder anchor) is populated too; see
    // the dedicated Mauritania-completion tests further down. No real
    // gameplay country remains on the placeholder path, so this check now
    // confirms a non-gameplay id still correctly resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 10 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 10 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'liberia', 'libya', 'lithuania', 'luxembourg', 'madagascar',
      'malawi', 'malaysia', 'maldives', 'mali', 'malta',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Libya, Lithuania/Luxembourg/Malta, Madagascar, Malawi, Malaysia, Maldives and Mali: currency renders correctly (ل.د, €, Ar, MK, RM, Rf, CFA)', () => {
    const libya = getCountryDetails('libya')!
    render(<CountryResultCard details={libya} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Libyan Dinar (LYD) · ل.د')).toBeInTheDocument()

    const madagascar = getCountryDetails('madagascar')!
    render(<CountryResultCard details={madagascar} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Malagasy Ariary (MGA) · Ar')).toBeInTheDocument()

    const malawi = getCountryDetails('malawi')!
    render(<CountryResultCard details={malawi} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Malawian Kwacha (MWK) · MK')).toBeInTheDocument()

    const malaysia = getCountryDetails('malaysia')!
    render(<CountryResultCard details={malaysia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Malaysian Ringgit (MYR) · RM')).toBeInTheDocument()

    const maldives = getCountryDetails('maldives')!
    render(<CountryResultCard details={maldives} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Maldivian Rufiyaa (MVR) · Rf')).toBeInTheDocument()

    const mali = getCountryDetails('mali')!
    render(<CountryResultCard details={mali} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('West African CFA Franc (XOF) · CFA')).toBeInTheDocument()
  })

  it('Luxembourg renders exactly three languages, in order: Luxembourgish, French, German', () => {
    const luxembourg = getCountryDetails('luxembourg')!
    expect(luxembourg.languages).toEqual(['Luxembourgish', 'French', 'German'])
    render(<CountryResultCard details={luxembourg} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Luxembourgish, French, German')).toBeInTheDocument()
  })

  it('Madagascar renders exactly two languages, in order: Malagasy, French', () => {
    const madagascar = getCountryDetails('madagascar')!
    expect(madagascar.languages).toEqual(['Malagasy', 'French'])
    render(<CountryResultCard details={madagascar} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Malagasy, French')).toBeInTheDocument()
  })

  it('Malawi renders English and Chichewa (post language-policy revision: Chichewa is the de facto national/"common" language)', () => {
    const malawi = getCountryDetails('malawi')!
    expect(malawi.languages).toEqual(['English', 'Chichewa'])
    render(<CountryResultCard details={malawi} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('English, Chichewa')).toBeInTheDocument()
  })

  it('Malaysia renders Malay only', () => {
    const malaysia = getCountryDetails('malaysia')!
    expect(malaysia.languages).toEqual(['Malay'])
    render(<CountryResultCard details={malaysia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Malay')).toBeInTheDocument()
  })

  it('Maldives renders Dhivehi only', () => {
    const maldives = getCountryDetails('maldives')!
    expect(maldives.languages).toEqual(['Dhivehi'])
    render(<CountryResultCard details={maldives} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Dhivehi')).toBeInTheDocument()
  })

  it("Mali's full 13-language array survives raw -> derived -> getCountryDetails() -> DOM with no truncation, and never renders French", () => {
    const mali = getCountryDetails('mali')!
    const expected = [
      'Bambara', 'Bobo', 'Bozo', 'Dogon', 'Fula', 'Hassaniya Arabic', 'Kassonke',
      'Maninka', 'Minyanka', 'Senufo', 'Songhay', 'Soninke', 'Tamasheq',
    ]
    expect(mali.languages).toEqual(expected)
    expect(mali.languages).toHaveLength(13)
    render(<CountryResultCard details={mali} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText(expected.join(', '))).toBeInTheDocument()
    expect(screen.queryByText(/\bFrench\b/)).not.toBeInTheDocument()
  })

  it('Malta renders exactly two languages, in order: Maltese, English', () => {
    const malta = getCountryDetails('malta')!
    expect(malta.languages).toEqual(['Maltese', 'English'])
    render(<CountryResultCard details={malta} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Maltese, English')).toBeInTheDocument()
  })

  it('no country outside the supplied Batch 10 was accidentally populated', () => {
    // Myanmar/Namibia/Nauru were placeholder-only as of Batch 10 but are
    // now populated by Batch 11 (see below) — Batch 10's own boundary check
    // instead uses a country that stays on the placeholder path after both.
    // The full dataset (all 169 ANSWER_POOL countries) is now complete —
    // "mauritania" (the former last gap, used here in several earlier
    // batches as the permanent placeholder anchor) is populated too; see
    // the dedicated Mauritania-completion tests further down. No real
    // gameplay country remains on the placeholder path, so this check now
    // confirms a non-gameplay id still correctly resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 11 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 11 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'myanmar', 'namibia', 'nauru', 'nepal', 'new-zealand',
      'nicaragua', 'niger', 'nigeria', 'north-korea', 'norway',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Namibia, Nepal, Nicaragua, Niger, Nigeria, North Korea and Norway: currency renders correctly (N$, रू, C$, CFA, ₦, ₩, kr)', () => {
    const namibia = getCountryDetails('namibia')!
    render(<CountryResultCard details={namibia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Namibian Dollar (NAD) · N$')).toBeInTheDocument()

    const nepal = getCountryDetails('nepal')!
    render(<CountryResultCard details={nepal} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Nepalese Rupee (NPR) · रू')).toBeInTheDocument()

    const nicaragua = getCountryDetails('nicaragua')!
    render(<CountryResultCard details={nicaragua} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Nicaraguan Córdoba (NIO) · C$')).toBeInTheDocument()

    const niger = getCountryDetails('niger')!
    render(<CountryResultCard details={niger} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('West African CFA Franc (XOF) · CFA')).toBeInTheDocument()

    const nigeria = getCountryDetails('nigeria')!
    render(<CountryResultCard details={nigeria} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Nigerian Naira (NGN) · ₦')).toBeInTheDocument()

    const northKorea = getCountryDetails('north-korea')!
    render(<CountryResultCard details={northKorea} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('North Korean Won (KPW) · ₩')).toBeInTheDocument()

    const norway = getCountryDetails('norway')!
    render(<CountryResultCard details={norway} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Norwegian Krone (NOK) · kr')).toBeInTheDocument()
  })

  it('Nauru renders Yaren as its capital (not a placeholder) and exactly Nauruan, English', () => {
    const nauru = getCountryDetails('nauru')!
    expect(nauru.verified.capital).toBe(true)
    expect(nauru.capital).toBe('Yaren')
    expect(nauru.languages).toEqual(['Nauruan', 'English'])
    render(<CountryResultCard details={nauru} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Yaren')).toBeInTheDocument()
    expect(screen.getByText('Nauruan, English')).toBeInTheDocument()
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
  })

  it('New Zealand renders exactly English, Māori, New Zealand Sign Language, and English is present per the August-2026 legal change', () => {
    const newZealand = getCountryDetails('new-zealand')!
    expect(newZealand.languages).toEqual(['English', 'Māori', 'New Zealand Sign Language'])
    render(<CountryResultCard details={newZealand} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('English, Māori, New Zealand Sign Language')).toBeInTheDocument()
    // Regression guard: English must remain listed now that it is
    // statutorily official (English Language Act 2026), not just de facto.
    expect(newZealand.languages).toContain('English')
  })

  it('Nicaragua renders Spanish only', () => {
    const nicaragua = getCountryDetails('nicaragua')!
    expect(nicaragua.languages).toEqual(['Spanish'])
    render(<CountryResultCard details={nicaragua} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Spanish')).toBeInTheDocument()
  })

  it('Niger renders Hausa only and never renders French or English as official (2025 Charter of Refoundation)', () => {
    const niger = getCountryDetails('niger')!
    expect(niger.languages).toEqual(['Hausa'])
    render(<CountryResultCard details={niger} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Hausa')).toBeInTheDocument()
    expect(screen.queryByText(/French|English/)).not.toBeInTheDocument()
  })

  it('Nigeria renders English only', () => {
    const nigeria = getCountryDetails('nigeria')!
    expect(nigeria.languages).toEqual(['English'])
    render(<CountryResultCard details={nigeria} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('North Korea renders Korean only', () => {
    const northKorea = getCountryDetails('north-korea')!
    expect(northKorea.languages).toEqual(['Korean'])
    render(<CountryResultCard details={northKorea} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Korean')).toBeInTheDocument()
  })

  it('Norway renders Norwegian only', () => {
    const norway = getCountryDetails('norway')!
    expect(norway.languages).toEqual(['Norwegian'])
    render(<CountryResultCard details={norway} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Norwegian')).toBeInTheDocument()
  })

  it('no country outside the supplied Batch 11 was accidentally populated (neighbouring alphabetical entries)', () => {
    // Oman/Pakistan/Palau were placeholder-only as of Batch 11 but are now
    // populated by Batch 12 (see below) — Batch 11's own boundary check
    // instead uses a country that stays on the placeholder path after both.
    // The full dataset (all 169 ANSWER_POOL countries) is now complete —
    // "mauritania" (the former last gap, used here in several earlier
    // batches as the permanent placeholder anchor) is populated too; see
    // the dedicated Mauritania-completion tests further down. No real
    // gameplay country remains on the placeholder path, so this check now
    // confirms a non-gameplay id still correctly resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 12 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 12 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'oman', 'pakistan', 'palau', 'palestine', 'panama',
      'paraguay', 'peru', 'poland', 'portugal', 'qatar',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Oman, Pakistan, Palestine, Panama, Paraguay, Peru, Poland, Portugal and Qatar: currency renders correctly (ر.ع., ₨, ₪, B/., ₲, S/, zł, €, ر.ق)', () => {
    const oman = getCountryDetails('oman')!
    render(<CountryResultCard details={oman} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Omani Rial (OMR) · ر.ع.')).toBeInTheDocument()

    const pakistan = getCountryDetails('pakistan')!
    render(<CountryResultCard details={pakistan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Pakistani Rupee (PKR) · ₨')).toBeInTheDocument()

    const palestine = getCountryDetails('palestine')!
    render(<CountryResultCard details={palestine} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Israeli New Shekel (ILS) · ₪')).toBeInTheDocument()

    const panama = getCountryDetails('panama')!
    render(<CountryResultCard details={panama} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Panamanian Balboa (PAB) · B/.')).toBeInTheDocument()

    const paraguay = getCountryDetails('paraguay')!
    render(<CountryResultCard details={paraguay} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Paraguayan Guaraní (PYG) · ₲')).toBeInTheDocument()

    const peru = getCountryDetails('peru')!
    render(<CountryResultCard details={peru} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Peruvian Sol (PEN) · S/')).toBeInTheDocument()

    const poland = getCountryDetails('poland')!
    render(<CountryResultCard details={poland} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Polish Złoty (PLN) · zł')).toBeInTheDocument()

    const portugal = getCountryDetails('portugal')!
    render(<CountryResultCard details={portugal} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()

    const qatar = getCountryDetails('qatar')!
    render(<CountryResultCard details={qatar} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Qatari Riyal (QAR) · ر.ق')).toBeInTheDocument()
  })

  it('Oman, Panama, Peru, Poland, Portugal and Qatar each render a single official language', () => {
    for (const [slug, lang] of [
      ['oman', 'Arabic'], ['panama', 'Spanish'], ['peru', 'Spanish'],
      ['poland', 'Polish'], ['portugal', 'Portuguese'], ['qatar', 'Arabic'],
    ] as const) {
      const details = getCountryDetails(slug)!
      expect(details.languages, slug).toEqual([lang])
      render(<CountryResultCard details={details} context={null} primaryAction={<button>Go</button>} />)
    }
    expect(screen.getAllByText('Arabic').length).toBeGreaterThanOrEqual(2)
  })

  it('Pakistan renders exactly Urdu, English', () => {
    const pakistan = getCountryDetails('pakistan')!
    expect(pakistan.languages).toEqual(['Urdu', 'English'])
    render(<CountryResultCard details={pakistan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Urdu, English')).toBeInTheDocument()
  })

  it('Palau renders exactly Palauan, English and capital Ngerulmud', () => {
    const palau = getCountryDetails('palau')!
    expect(palau.languages).toEqual(['Palauan', 'English'])
    render(<CountryResultCard details={palau} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Palauan, English')).toBeInTheDocument()
    expect(screen.getByText('Ngerulmud')).toBeInTheDocument()
  })

  it('Palestine: PS/PSE, /flags/PS.png, East Jerusalem, Arabic only, ILS/₪, and never claims ILS is a Palestinian national currency', () => {
    const palestine = getCountryDetails('palestine')!
    expect(palestine.countryCode).toBe('PS')
    expect(palestine.languages).toEqual(['Arabic'])
    render(<CountryResultCard details={palestine} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('img', { name: 'Flag of Palestine' })).toHaveAttribute('src', '/flags/PS.png')
    expect(screen.getByText('East Jerusalem')).toBeInTheDocument()
    expect(screen.getByText('Arabic', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Israeli New Shekel (ILS) · ₪')).toBeInTheDocument()
    expect(screen.queryByText(/Palestinian (New )?Shekel/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Palestinian (New )?[Ss]hekel/i)).not.toBeInTheDocument()
  })

  it('Paraguay renders exactly Spanish, Guaraní', () => {
    const paraguay = getCountryDetails('paraguay')!
    expect(paraguay.languages).toEqual(['Spanish', 'Guaraní'])
    render(<CountryResultCard details={paraguay} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Spanish, Guaraní')).toBeInTheDocument()
  })

  it('Peru renders Spanish only and never renders Quechua or Aymara', () => {
    const peru = getCountryDetails('peru')!
    expect(peru.languages).toEqual(['Spanish'])
    render(<CountryResultCard details={peru} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Spanish', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText(/Quechua|Aymara/)).not.toBeInTheDocument()
  })

  it('no country outside the supplied Batch 12 was accidentally populated (neighbouring alphabetical entries)', () => {
    // Romania/Russia/Rwanda were placeholder-only as of Batch 12 but are
    // now populated by Batch 13 (see below) — Batch 12's own boundary check
    // instead uses a country that stays on the placeholder path after both.
    // The full dataset (all 169 ANSWER_POOL countries) is now complete —
    // "mauritania" (the former last gap, used here in several earlier
    // batches as the permanent placeholder anchor) is populated too; see
    // the dedicated Mauritania-completion tests further down. No real
    // gameplay country remains on the placeholder path, so this check now
    // confirms a non-gameplay id still correctly resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 13 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 13 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'romania', 'russia', 'rwanda', 'saint-lucia', 'samoa',
      'san-marino', 'senegal', 'serbia', 'seychelles', 'singapore',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Romania, Russia, Rwanda, Samoa, San Marino, Senegal, Serbia and Seychelles: currency renders correctly (lei, ₽, FRw, T$, €, CFA, дин., ₨)', () => {
    const romania = getCountryDetails('romania')!
    render(<CountryResultCard details={romania} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Romanian Leu (RON) · lei')).toBeInTheDocument()

    const russia = getCountryDetails('russia')!
    render(<CountryResultCard details={russia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Russian Ruble (RUB) · ₽')).toBeInTheDocument()

    const rwanda = getCountryDetails('rwanda')!
    render(<CountryResultCard details={rwanda} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Rwandan Franc (RWF) · FRw')).toBeInTheDocument()

    const samoa = getCountryDetails('samoa')!
    render(<CountryResultCard details={samoa} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Samoan Tala (WST) · T$')).toBeInTheDocument()

    const sanMarino = getCountryDetails('san-marino')!
    render(<CountryResultCard details={sanMarino} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()

    const senegal = getCountryDetails('senegal')!
    render(<CountryResultCard details={senegal} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('West African CFA Franc (XOF) · CFA')).toBeInTheDocument()

    const serbia = getCountryDetails('serbia')!
    render(<CountryResultCard details={serbia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Serbian Dinar (RSD) · дин.')).toBeInTheDocument()

    const seychelles = getCountryDetails('seychelles')!
    render(<CountryResultCard details={seychelles} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Seychellois Rupee (SCR) · ₨')).toBeInTheDocument()
  })

  it('Rwanda renders exactly Kinyarwanda, English, French and never Kiswahili/Swahili', () => {
    const rwanda = getCountryDetails('rwanda')!
    expect(rwanda.languages).toEqual(['Kinyarwanda', 'English', 'French'])
    render(<CountryResultCard details={rwanda} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Kinyarwanda, English, French')).toBeInTheDocument()
    expect(screen.queryByText(/Kiswahili|Swahili/)).not.toBeInTheDocument()
  })

  it('Samoa renders exactly Samoan, English', () => {
    const samoa = getCountryDetails('samoa')!
    expect(samoa.languages).toEqual(['Samoan', 'English'])
    render(<CountryResultCard details={samoa} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Samoan, English')).toBeInTheDocument()
  })

  it('San Marino: capital resolves as "San Marino" despite matching the country/heading name', () => {
    const sanMarino = getCountryDetails('san-marino')!
    expect(sanMarino.capital).toBe('San Marino')
    render(<CountryResultCard details={sanMarino} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'San Marino' })).toBeInTheDocument()
    // Scoped to the facts list, not the whole page, since the heading and
    // the capital fact value are both literally "San Marino".
    const capitalValue = screen.getByLabelText('San Marino facts').querySelector('.country-result__fact:first-child .country-result__fact-value')
    expect(capitalValue).toHaveTextContent('San Marino')
  })

  it('Serbia renders Belgrade and Serbian only, and remains completely distinct from Kosovo', () => {
    const serbia = getCountryDetails('serbia')!
    const kosovo = getCountryDetails('kosovo')!
    expect(serbia.languages).toEqual(['Serbian'])
    render(<CountryResultCard details={serbia} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Serbia' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of Serbia' })).toHaveAttribute('src', '/flags/RS.png')
    expect(screen.getByText('Belgrade')).toBeInTheDocument()
    expect(serbia.flagUrl).not.toBe(kosovo.flagUrl)
    expect(serbia.capital).not.toBe(kosovo.capital)
  })

  it('Seychelles renders exactly Seychellois Creole, English, French', () => {
    const seychelles = getCountryDetails('seychelles')!
    expect(seychelles.languages).toEqual(['Seychellois Creole', 'English', 'French'])
    render(<CountryResultCard details={seychelles} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Seychellois Creole, English, French')).toBeInTheDocument()
  })

  it('Singapore renders exactly Malay, Mandarin, Tamil, English', () => {
    const singapore = getCountryDetails('singapore')!
    expect(singapore.languages).toEqual(['Malay', 'Mandarin', 'Tamil', 'English'])
    render(<CountryResultCard details={singapore} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Malay, Mandarin, Tamil, English')).toBeInTheDocument()
  })

  it('no country outside the supplied Batch 13 was accidentally populated (neighbouring alphabetical entries)', () => {
    // Slovakia/Slovenia/Somalia were placeholder-only as of Batch 13 but
    // are now populated by Batch 14; "mauritania" (used here previously)
    // is now populated too — the full dataset is complete, so this check
    // now confirms a non-gameplay id still resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 14 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 14 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'slovakia', 'slovenia', 'somalia', 'south-korea', 'south-sudan',
      'spain', 'sri-lanka', 'sudan', 'suriname', 'sweden',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Somalia, South Korea, South Sudan, Sri Lanka, Sudan and Sweden: currency renders correctly (Sh.So., ₩, SS£, Rs, ج.س., kr)', () => {
    const somalia = getCountryDetails('somalia')!
    render(<CountryResultCard details={somalia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Somali Shilling (SOS) · Sh.So.')).toBeInTheDocument()

    const southKorea = getCountryDetails('south-korea')!
    render(<CountryResultCard details={southKorea} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('South Korean Won (KRW) · ₩')).toBeInTheDocument()

    const southSudan = getCountryDetails('south-sudan')!
    render(<CountryResultCard details={southSudan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('South Sudanese Pound (SSP) · SS£')).toBeInTheDocument()

    const sriLanka = getCountryDetails('sri-lanka')!
    render(<CountryResultCard details={sriLanka} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Sri Lankan Rupee (LKR) · Rs')).toBeInTheDocument()

    const sudan = getCountryDetails('sudan')!
    render(<CountryResultCard details={sudan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Sudanese Pound (SDG) · ج.س.')).toBeInTheDocument()

    const sweden = getCountryDetails('sweden')!
    render(<CountryResultCard details={sweden} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Swedish Krona (SEK) · kr')).toBeInTheDocument()
  })

  it('Slovenia renders Slovenian only and never Italian or Hungarian', () => {
    const slovenia = getCountryDetails('slovenia')!
    expect(slovenia.languages).toEqual(['Slovenian'])
    render(<CountryResultCard details={slovenia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Slovenian')).toBeInTheDocument()
    expect(screen.queryByText(/Italian|Hungarian/)).not.toBeInTheDocument()
  })

  it('Somalia renders exactly Somali, Arabic', () => {
    const somalia = getCountryDetails('somalia')!
    expect(somalia.languages).toEqual(['Somali', 'Arabic'])
    render(<CountryResultCard details={somalia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Somali, Arabic')).toBeInTheDocument()
  })

  it('South Sudan renders English only', () => {
    const southSudan = getCountryDetails('south-sudan')!
    expect(southSudan.languages).toEqual(['English'])
    render(<CountryResultCard details={southSudan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('Spain renders Spanish only and never Catalan, Basque, Galician or Valencian', () => {
    const spain = getCountryDetails('spain')!
    expect(spain.languages).toEqual(['Spanish'])
    render(<CountryResultCard details={spain} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Spanish')).toBeInTheDocument()
    expect(screen.queryByText(/Catalan|Basque|Galician|Valencian/)).not.toBeInTheDocument()
  })

  it('Sri Lanka renders exactly Sinhala, Tamil and never English', () => {
    const sriLanka = getCountryDetails('sri-lanka')!
    expect(sriLanka.languages).toEqual(['Sinhala', 'Tamil'])
    render(<CountryResultCard details={sriLanka} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Sinhala, Tamil')).toBeInTheDocument()
    expect(screen.queryByText(/\bEnglish\b/)).not.toBeInTheDocument()
  })

  it('Sudan renders exactly Arabic, English', () => {
    const sudan = getCountryDetails('sudan')!
    expect(sudan.languages).toEqual(['Arabic', 'English'])
    render(<CountryResultCard details={sudan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Arabic, English')).toBeInTheDocument()
  })

  it('Suriname renders Dutch only', () => {
    const suriname = getCountryDetails('suriname')!
    expect(suriname.languages).toEqual(['Dutch'])
    render(<CountryResultCard details={suriname} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Dutch')).toBeInTheDocument()
  })

  it('Sweden renders Swedish only and never Finnish, Yiddish, Meänkieli, Romani Chib or Sami', () => {
    const sweden = getCountryDetails('sweden')!
    expect(sweden.languages).toEqual(['Swedish'])
    render(<CountryResultCard details={sweden} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Swedish')).toBeInTheDocument()
    expect(screen.queryByText(/Finnish|Yiddish|Meänkieli|Romani Chib|Sami/)).not.toBeInTheDocument()
  })

  it('no country outside the supplied Batch 14 was accidentally populated (neighbouring alphabetical entries)', () => {
    // Syria/Taiwan/Tajikistan were placeholder-only as of Batch 14 but are
    // now populated by Batch 15 (see below) — Batch 14's own boundary
    // check previously used "mauritania"; the full dataset is now complete
    // (mauritania included), so this confirms a non-gameplay id still
    // resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 15 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 15 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'syria', 'taiwan', 'tajikistan', 'thailand', 'timor-leste',
      'togo', 'tonga', 'tunisia', 'turkey', 'tuvalu',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Syria, Taiwan, Tajikistan, Thailand, Togo, Tonga, Tunisia and Turkey: currency renders correctly (£S, NT$, SM, ฿, CFA, T$, DT, ₺)', () => {
    const syria = getCountryDetails('syria')!
    render(<CountryResultCard details={syria} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Syrian Pound (SYP) · £S')).toBeInTheDocument()

    const taiwan = getCountryDetails('taiwan')!
    render(<CountryResultCard details={taiwan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('New Taiwan Dollar (TWD) · NT$')).toBeInTheDocument()

    const tajikistan = getCountryDetails('tajikistan')!
    render(<CountryResultCard details={tajikistan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Tajikistani Somoni (TJS) · SM')).toBeInTheDocument()

    const thailand = getCountryDetails('thailand')!
    render(<CountryResultCard details={thailand} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Thai Baht (THB) · ฿')).toBeInTheDocument()

    const togo = getCountryDetails('togo')!
    render(<CountryResultCard details={togo} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('West African CFA Franc (XOF) · CFA')).toBeInTheDocument()

    const tonga = getCountryDetails('tonga')!
    render(<CountryResultCard details={tonga} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Tongan Paʻanga (TOP) · T$')).toBeInTheDocument()

    const tunisia = getCountryDetails('tunisia')!
    render(<CountryResultCard details={tunisia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Tunisian Dinar (TND) · DT')).toBeInTheDocument()

    const turkey = getCountryDetails('turkey')!
    render(<CountryResultCard details={turkey} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Turkish Lira (TRY) · ₺')).toBeInTheDocument()
  })

  it('Syria renders Syrian Pound / SYP — the post-2026-redenominated record, not an invented currency or the pre-2026 denomination', () => {
    const syria = getCountryDetails('syria')!
    render(<CountryResultCard details={syria} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Syrian Pound (SYP) · £S')).toBeInTheDocument()
    expect(screen.queryByText(/\b2026\b/)).not.toBeInTheDocument()
  })

  it('Taiwan renders Mandarin as its principal language (post language-policy revision), not "No official language"', () => {
    const taiwan = getCountryDetails('taiwan')!
    expect(taiwan.languages).toEqual(['Mandarin'])
    expect(taiwan.verified.languages).toBe(true)
    const { container } = render(
      <CountryResultCard details={taiwan} context={null} primaryAction={<button>Go</button>} />,
    )
    const languagesValue = container.querySelector('.country-result__fact:last-child .country-result__fact-value')
    expect(languagesValue).toHaveTextContent('Mandarin')
    expect(languagesValue).not.toHaveClass('country-result__fact-value--placeholder')
    expect(screen.queryByText('No official language')).not.toBeInTheDocument()
  })

  it('Tajikistan renders Tajik only and never Russian', () => {
    const tajikistan = getCountryDetails('tajikistan')!
    expect(tajikistan.languages).toEqual(['Tajik'])
    render(<CountryResultCard details={tajikistan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Tajik')).toBeInTheDocument()
    expect(screen.queryByText(/Russian/)).not.toBeInTheDocument()
  })

  it('Thailand renders Thai only', () => {
    const thailand = getCountryDetails('thailand')!
    expect(thailand.languages).toEqual(['Thai'])
    render(<CountryResultCard details={thailand} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Thai')).toBeInTheDocument()
  })

  it('Timor-Leste renders exactly Portuguese, Tetum and never English or Indonesian', () => {
    const timorLeste = getCountryDetails('timor-leste')!
    expect(timorLeste.languages).toEqual(['Portuguese', 'Tetum'])
    render(<CountryResultCard details={timorLeste} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Portuguese, Tetum')).toBeInTheDocument()
    expect(screen.queryByText(/English|Indonesian/)).not.toBeInTheDocument()
  })

  it('Togo renders French only', () => {
    const togo = getCountryDetails('togo')!
    expect(togo.languages).toEqual(['French'])
    render(<CountryResultCard details={togo} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('French')).toBeInTheDocument()
  })

  it('Tonga renders exactly Tongan, English and the Unicode ʻokina renders correctly in Nukuʻalofa and Tongan Paʻanga', () => {
    const tonga = getCountryDetails('tonga')!
    expect(tonga.languages).toEqual(['Tongan', 'English'])
    render(<CountryResultCard details={tonga} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByText('Tongan, English')).toBeInTheDocument()
    expect(screen.getByText('Nukuʻalofa')).toBeInTheDocument()
    expect(screen.getByText('Tongan Paʻanga (TOP) · T$')).toBeInTheDocument()
  })

  it('Tunisia renders Arabic only', () => {
    const tunisia = getCountryDetails('tunisia')!
    expect(tunisia.languages).toEqual(['Arabic'])
    render(<CountryResultCard details={tunisia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Arabic')).toBeInTheDocument()
  })

  it('Turkey: heading stays "Turkey" (not renamed to Türkiye) and renders Ankara/Turkish/₺', () => {
    const turkey = getCountryDetails('turkey')!
    expect(turkey.name).toBe('Turkey')
    render(<CountryResultCard details={turkey} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Turkey' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of Turkey' })).toHaveAttribute('src', '/flags/TR.png')
    expect(screen.getByText('Ankara')).toBeInTheDocument()
    expect(screen.getByText('Turkish')).toBeInTheDocument()
    expect(screen.getByText('Turkish Lira (TRY) · ₺')).toBeInTheDocument()
  })

  it('Tuvalu renders exactly Tuvaluan, English with Funafuti and AUD currency', () => {
    const tuvalu = getCountryDetails('tuvalu')!
    expect(tuvalu.languages).toEqual(['Tuvaluan', 'English'])
    render(<CountryResultCard details={tuvalu} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Tuvaluan, English')).toBeInTheDocument()
    expect(screen.getByText('Funafuti')).toBeInTheDocument()
  })

  it('no country outside the supplied Batch 15 was accidentally populated (neighbouring alphabetical entries)', () => {
    // Uganda/Ukraine/Uruguay were placeholder-only as of Batch 15 but are
    // now populated by Batch 17 (see below) — Batch 15's own boundary
    // check previously used "mauritania"; the full dataset is now complete
    // (mauritania included), so this confirms a non-gameplay id still
    // resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 16 country records, resolved end-to-end through getCountryDetails()', () => {
  it('all nine populated Batch 16 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'mauritius', 'mexico', 'micronesia', 'moldova', 'monaco',
      'mongolia', 'montenegro', 'morocco', 'mozambique',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('"mauritania" was placeholder-only as of Batch 16 (no public/flags/MR.png existed then) but is now fully populated — see the dedicated Mauritania-completion tests further down', () => {
    const d = getCountryDetails('mauritania')!
    expect(d.countryCode).toBe('MR')
    expect(d.flagUrl).toBe('/flags/MR.png')
    expect(Object.values(d.verified).every((v) => v === true)).toBe(true)
  })

  it('Mauritius, Monaco, Mongolia and Morocco: currency renders correctly (₨, €, ₮, د.م.)', () => {
    const mauritius = getCountryDetails('mauritius')!
    render(<CountryResultCard details={mauritius} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Mauritian Rupee (MUR) · ₨')).toBeInTheDocument()

    const monaco = getCountryDetails('monaco')!
    render(<CountryResultCard details={monaco} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()

    const mongolia = getCountryDetails('mongolia')!
    render(<CountryResultCard details={mongolia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Mongolian Tögrög (MNT) · ₮')).toBeInTheDocument()

    const morocco = getCountryDetails('morocco')!
    render(<CountryResultCard details={morocco} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Moroccan Dirham (MAD) · د.م.')).toBeInTheDocument()
  })

  it('Mauritius renders Mauritian Creole, English, French (post language-policy revision), not "No official language"', () => {
    const mauritius = getCountryDetails('mauritius')!
    expect(mauritius.languages).toEqual(['Mauritian Creole', 'English', 'French'])
    expect(mauritius.verified.languages).toBe(true)
    const { container } = render(
      <CountryResultCard details={mauritius} context={null} primaryAction={<button>Go</button>} />,
    )
    const languagesValue = container.querySelector('.country-result__fact:last-child .country-result__fact-value')
    expect(languagesValue).toHaveTextContent('Mauritian Creole, English, French')
    expect(languagesValue).not.toHaveClass('country-result__fact-value--placeholder')
    expect(screen.queryByText('No official language')).not.toBeInTheDocument()
  })

  it('Mexico renders Spanish (post language-policy revision), not "No official language"', () => {
    const mexico = getCountryDetails('mexico')!
    expect(mexico.languages).toEqual(['Spanish'])
    expect(mexico.verified.languages).toBe(true)
    const { container } = render(
      <CountryResultCard details={mexico} context={null} primaryAction={<button>Go</button>} />,
    )
    const languagesValue = container.querySelector('.country-result__fact:last-child .country-result__fact-value')
    expect(languagesValue).toHaveTextContent('Spanish')
    expect(screen.queryByText('No official language')).not.toBeInTheDocument()
  })

  it('Moldova renders the Unicode capital Chișinău without corruption', () => {
    const moldova = getCountryDetails('moldova')!
    expect(moldova.capital).toBe('Chișinău')
    render(<CountryResultCard details={moldova} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Chișinău')).toBeInTheDocument()
  })

  it('Monaco: capital resolves as "Monaco" despite matching the country/heading name', () => {
    const monaco = getCountryDetails('monaco')!
    expect(monaco.capital).toBe('Monaco')
    render(<CountryResultCard details={monaco} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Monaco' })).toBeInTheDocument()
    const capitalValue = screen.getByLabelText('Monaco facts').querySelector('.country-result__fact:first-child .country-result__fact-value')
    expect(capitalValue).toHaveTextContent('Monaco')
  })

  it('Montenegro: exact five-language array survives raw -> derived -> DOM with no truncation', () => {
    const montenegro = getCountryDetails('montenegro')!
    const expected = ['Montenegrin', 'Serbian', 'Bosnian', 'Albanian', 'Croatian']
    expect(montenegro.languages).toEqual(expected)
    render(<CountryResultCard details={montenegro} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText(expected.join(', '))).toBeInTheDocument()
  })

  it('Morocco renders exactly Arabic, Amazigh', () => {
    const morocco = getCountryDetails('morocco')!
    expect(morocco.languages).toEqual(['Arabic', 'Amazigh'])
    render(<CountryResultCard details={morocco} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Arabic, Amazigh')).toBeInTheDocument()
  })

  it('no country outside the supplied, populated Batch 16 subset was accidentally populated (neighbouring alphabetical entries)', () => {
    // Uganda/Ukraine/Uruguay were placeholder-only as of Batch 16 but are
    // now populated by Batch 17 (see below) — Batch 16's own boundary
    // check previously used "mauritania"; the full dataset is now complete
    // (mauritania included), so this confirms a non-gameplay id still
    // resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Batch 17 country records (the final normal batch), resolved end-to-end through getCountryDetails()', () => {
  it('all ten Batch 17 countries resolve through getCountryDetails() with a real flag and no placeholders', () => {
    for (const slug of [
      'uganda', 'ukraine', 'uruguay', 'uzbekistan', 'vanuatu',
      'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe',
    ]) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Uganda, Ukraine, Uzbekistan, Vanuatu, Venezuela, Vietnam, Yemen, Zambia and Zimbabwe: currency renders correctly (USh, ₴, soʻm, VT, Bs., ₫, ﷼, ZK, ZiG)', () => {
    const uganda = getCountryDetails('uganda')!
    render(<CountryResultCard details={uganda} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Ugandan Shilling (UGX) · USh')).toBeInTheDocument()

    const ukraine = getCountryDetails('ukraine')!
    render(<CountryResultCard details={ukraine} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Ukrainian Hryvnia (UAH) · ₴')).toBeInTheDocument()

    const uzbekistan = getCountryDetails('uzbekistan')!
    render(<CountryResultCard details={uzbekistan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Uzbekistani Som (UZS) · soʻm')).toBeInTheDocument()

    const vanuatu = getCountryDetails('vanuatu')!
    render(<CountryResultCard details={vanuatu} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Vanuatu Vatu (VUV) · VT')).toBeInTheDocument()

    const venezuela = getCountryDetails('venezuela')!
    render(<CountryResultCard details={venezuela} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Venezuelan Bolívar (VES) · Bs.')).toBeInTheDocument()

    const vietnam = getCountryDetails('vietnam')!
    render(<CountryResultCard details={vietnam} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Vietnamese Đồng (VND) · ₫')).toBeInTheDocument()

    const yemen = getCountryDetails('yemen')!
    render(<CountryResultCard details={yemen} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Yemeni Rial (YER) · ﷼')).toBeInTheDocument()

    const zambia = getCountryDetails('zambia')!
    render(<CountryResultCard details={zambia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Zambian Kwacha (ZMW) · ZK')).toBeInTheDocument()

    const zimbabwe = getCountryDetails('zimbabwe')!
    render(<CountryResultCard details={zimbabwe} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Zimbabwe Gold (ZWG) · ZiG')).toBeInTheDocument()
  })

  it('Uganda renders exactly English, Swahili', () => {
    const uganda = getCountryDetails('uganda')!
    expect(uganda.languages).toEqual(['English', 'Swahili'])
    render(<CountryResultCard details={uganda} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('English, Swahili')).toBeInTheDocument()
  })

  it('Ukraine renders Ukrainian only and never Russian', () => {
    const ukraine = getCountryDetails('ukraine')!
    expect(ukraine.languages).toEqual(['Ukrainian'])
    render(<CountryResultCard details={ukraine} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Ukrainian')).toBeInTheDocument()
    expect(screen.queryByText(/Russian/)).not.toBeInTheDocument()
  })

  it('Uzbekistan renders Uzbek only, preserving the Unicode modifier apostrophe in soʻm', () => {
    const uzbekistan = getCountryDetails('uzbekistan')!
    expect(uzbekistan.languages).toEqual(['Uzbek'])
    render(<CountryResultCard details={uzbekistan} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Uzbek')).toBeInTheDocument()
    expect(screen.getByText('Uzbekistani Som (UZS) · soʻm')).toBeInTheDocument()
  })

  it('Vanuatu renders exactly Bislama, English, French', () => {
    const vanuatu = getCountryDetails('vanuatu')!
    expect(vanuatu.languages).toEqual(['Bislama', 'English', 'French'])
    render(<CountryResultCard details={vanuatu} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Bislama, English, French')).toBeInTheDocument()
  })

  it('Venezuela renders Spanish only', () => {
    const venezuela = getCountryDetails('venezuela')!
    expect(venezuela.languages).toEqual(['Spanish'])
    render(<CountryResultCard details={venezuela} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Spanish')).toBeInTheDocument()
  })

  it('Vietnam renders Vietnamese only, preserving Unicode in Vietnamese Đồng / ₫', () => {
    const vietnam = getCountryDetails('vietnam')!
    expect(vietnam.languages).toEqual(['Vietnamese'])
    render(<CountryResultCard details={vietnam} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Vietnamese')).toBeInTheDocument()
    expect(screen.getByText('Vietnamese Đồng (VND) · ₫')).toBeInTheDocument()
  })

  it('Yemen renders Arabic only', () => {
    const yemen = getCountryDetails('yemen')!
    expect(yemen.languages).toEqual(['Arabic'])
    render(<CountryResultCard details={yemen} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Arabic')).toBeInTheDocument()
  })

  it('Zambia renders English only', () => {
    const zambia = getCountryDetails('zambia')!
    expect(zambia.languages).toEqual(['English'])
    render(<CountryResultCard details={zambia} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('Zimbabwe: all 16 official languages survive COUNTRY_RECORDS -> COUNTRY_FACTS -> getCountryDetails() -> rendered DOM with no truncation or reordering', () => {
    const zimbabwe = getCountryDetails('zimbabwe')!
    const expected = [
      'Chewa', 'Chibarwe', 'English', 'Kalanga', 'Koisan', 'Nambya', 'Ndau', 'Ndebele',
      'Shangani', 'Shona', 'Sign Language', 'Sotho', 'Tonga', 'Tswana', 'Venda', 'Xhosa',
    ]
    expect(zimbabwe.languages).toEqual(expected)
    expect(zimbabwe.languages).toHaveLength(16)
    render(<CountryResultCard details={zimbabwe} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText(expected.join(', '))).toBeInTheDocument()
  })

  it('Zimbabwe currency renders as Zimbabwe Gold / ZWG / ZiG', () => {
    const zimbabwe = getCountryDetails('zimbabwe')!
    render(<CountryResultCard details={zimbabwe} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Zimbabwe Gold (ZWG) · ZiG')).toBeInTheDocument()
  })

  it('no country outside the supplied Batch 17 was accidentally populated', () => {
    // With Batch 17 complete, "mauritania" was still the sole remaining
    // placeholder-only country at that point — it is now completed in its
    // own follow-up (see the dedicated Mauritania-completion describe
    // block below), so the full dataset is complete and this confirms a
    // non-gameplay id still resolves to nothing.
    expect(getCountryDetails('not-a-real-country')).toBeNull()
  })
})

describe('Mauritania completion (the final playable country, follow-up to Batch 16)', () => {
  it('resolves through getCountryDetails() with a real flag and zero placeholders', () => {
    const d = getCountryDetails('mauritania')
    expect(d).not.toBeNull()
    expect(d!.countryCode).toBe('MR')
    expect(d!.flagUrl).toBe('/flags/MR.png')
    expect(Object.values(d!.verified).every((v) => v === true)).toBe(true)
    expect(d!.population).not.toContain('Estimate')
    expect(d!.population).not.toContain('2026')
  })

  it('renders Nouakchott, MRU/UM currency, Arabic only, and the exact formatted population', () => {
    const mauritania = getCountryDetails('mauritania')!
    expect(mauritania.languages).toEqual(['Arabic'])
    render(<CountryResultCard details={mauritania} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Mauritania' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of Mauritania' })).toHaveAttribute('src', '/flags/MR.png')
    expect(screen.getByText('Nouakchott')).toBeInTheDocument()
    expect(screen.getByText('Mauritanian Ouguiya (MRU) · UM')).toBeInTheDocument()
    expect(screen.getByText('Arabic', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('5 million', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText(/estimate as of|\b2026\b/i)).not.toBeInTheDocument()
  })

  it('never renders Pulaar, Soninke or Wolof as official languages', () => {
    const mauritania = getCountryDetails('mauritania')!
    render(<CountryResultCard details={mauritania} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.queryByText(/Pulaar|Soninke|Wolof/)).not.toBeInTheDocument()
  })

  it('the dataset is now 100% complete — every ANSWER_POOL country resolves with zero placeholders, mauritania included', () => {
    for (const c of ANSWER_POOL) {
      const d = getCountryDetails(c.id)
      expect(d, c.id).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), c.id).toBe(true)
    }
  })
})

describe('Language usability cleanup (semantic-audit follow-up): "languages" now means principal languages, not statutory-official-only', () => {
  const LANGUAGE_POLICY_CASES = [
    ['australia', ['English']],
    ['mexico', ['Spanish']],
    ['taiwan', ['Mandarin']],
    ['eritrea', ['Tigrinya', 'Arabic', 'English']],
    ['mauritius', ['Mauritian Creole', 'English', 'French']],
    ['botswana', ['English', 'Setswana']],
    ['malawi', ['English', 'Chichewa']],
    ['cabo-verde', ['Cabo Verdean Creole', 'Portuguese']],
  ] as const

  it('all 8 revised records carry exactly their expected languages array, in order', () => {
    for (const [slug, expected] of LANGUAGE_POLICY_CASES) {
      const d = getCountryDetails(slug)!
      expect(d.languages, slug).toEqual(expected)
    }
  })

  it('all 8 revised records render their exact joined language string in the DOM', () => {
    for (const [slug, expected] of LANGUAGE_POLICY_CASES) {
      const d = getCountryDetails(slug)!
      const { unmount } = render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} />)
      expect(screen.getByText(expected.join(', ')), slug).toBeInTheDocument()
      unmount()
    }
  })

  it('the fact label is exactly "Languages", never "Official languages"', () => {
    const d = getCountryDetails('france')!
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} />)
    expect(screen.getByText('Languages', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText(/Official languages/i)).not.toBeInTheDocument()
  })

  it('"No official language" never appears anywhere in the result card, for any country', () => {
    for (const c of ANSWER_POOL) {
      const d = getCountryDetails(c.id)!
      const { unmount } = render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} />)
      expect(screen.queryByText('No official language'), c.id).not.toBeInTheDocument()
      unmount()
    }
  })

  it('no populated country has an empty languages array anymore', () => {
    for (const c of ANSWER_POOL) {
      const d = getCountryDetails(c.id)!
      expect(d.languages.length, c.id).toBeGreaterThan(0)
    }
  })
})

describe('England, Scotland and Wales (this task): constituent-country completion, resolved end-to-end through getCountryDetails()', () => {
  it('all three resolve through getCountryDetails() with a real, distinct flag and no placeholders', () => {
    for (const slug of ['england', 'scotland', 'wales']) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2025')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('England renders London, GBP · £, English only, and its own GB-ENG flag — never the United Kingdom flag', () => {
    const england = getCountryDetails('england')!
    expect(england.flagUrl).toBe('/flags/GB-ENG.png')
    expect(england.languages).toEqual(['English'])
    render(<CountryResultCard details={england} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'England' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of England' })).toHaveAttribute('src', '/flags/GB-ENG.png')
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.getByText('Pound Sterling (GBP) · £')).toBeInTheDocument()
    expect(screen.getByText('English', { exact: true })).toBeInTheDocument()
  })

  it('Scotland renders Edinburgh, GBP · £, English/Scots/Scottish Gaelic, and its own GB-SCT flag', () => {
    const scotland = getCountryDetails('scotland')!
    expect(scotland.flagUrl).toBe('/flags/GB-SCT.png')
    expect(scotland.languages).toEqual(['English', 'Scots', 'Scottish Gaelic'])
    render(<CountryResultCard details={scotland} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Scotland' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of Scotland' })).toHaveAttribute('src', '/flags/GB-SCT.png')
    expect(screen.getByText('Edinburgh')).toBeInTheDocument()
    expect(screen.getByText('Pound Sterling (GBP) · £')).toBeInTheDocument()
    expect(screen.getByText('English, Scots, Scottish Gaelic')).toBeInTheDocument()
    expect(screen.queryByText(/\bWelsh\b/)).not.toBeInTheDocument()
  })

  it('Wales renders Cardiff, GBP · £, English/Welsh, and its own GB-WLS flag', () => {
    const wales = getCountryDetails('wales')!
    expect(wales.flagUrl).toBe('/flags/GB-WLS.png')
    expect(wales.languages).toEqual(['English', 'Welsh'])
    render(<CountryResultCard details={wales} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Wales' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of Wales' })).toHaveAttribute('src', '/flags/GB-WLS.png')
    expect(screen.getByText('Cardiff')).toBeInTheDocument()
    expect(screen.getByText('Pound Sterling (GBP) · £')).toBeInTheDocument()
    expect(screen.getByText('English, Welsh')).toBeInTheDocument()
    expect(screen.queryByText(/Scottish Gaelic/)).not.toBeInTheDocument()
  })

  it('England, Scotland and Wales each render a flag distinct from one another and from the United Kingdom', () => {
    const urls = ['england', 'scotland', 'wales', 'united-kingdom'].map((slug) => getCountryDetails(slug)!.flagUrl)
    expect(new Set(urls).size).toBe(urls.length)
    expect(urls).toEqual(['/flags/GB-ENG.png', '/flags/GB-SCT.png', '/flags/GB-WLS.png', '/flags/GB.png'])
  })

  it('Ireland is unaffected: still resolves to its own unchanged record, distinct from England/Scotland/Wales', () => {
    const ireland = getCountryDetails('ireland')!
    expect(ireland.name).toBe('Ireland')
    expect(ireland.languages).toEqual(['Irish', 'English'])
    expect(ireland.capital).toBe('Dublin')
    render(<CountryResultCard details={ireland} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Ireland' })).toBeInTheDocument()
  })

  it('United Kingdom has its own distinct flag from its constituent countries (later populated as its own full record by Study-data Batch C, not a placeholder)', () => {
    const uk = getCountryDetails('united-kingdom')!
    expect(uk.flagUrl).toBe('/flags/GB.png')
  })
})

describe('Study-data Batch A (this task): non-playable canonical countries get full reference pages, no ANSWER_POOL membership required', () => {
  const BATCH_A_SLUGS = [
    'afghanistan', 'antigua-and-barbuda', 'bosnia-and-herzegovina', 'burkina-faso',
    'central-african-republic', 'dominican-republic', 'equatorial-guinea',
    'guinea-bissau', 'liechtenstein', 'marshall-islands',
  ] as const

  it('all ten resolve through getCountryDetails() with a real flag and zero placeholders, despite being non-playable', () => {
    for (const slug of BATCH_A_SLUGS) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Afghanistan renders Kabul, AFN · ؋, Dari/Pashto', () => {
    const d = getCountryDetails('afghanistan')!
    expect(d.languages).toEqual(['Dari', 'Pashto'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Afghanistan' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of Afghanistan' })).toHaveAttribute('src', '/flags/AF.png')
    expect(screen.getByText('Kabul')).toBeInTheDocument()
    expect(screen.getByText('Afghan Afghani (AFN) · ؋')).toBeInTheDocument()
    expect(screen.getByText('Dari, Pashto')).toBeInTheDocument()
  })

  it('Antigua and Barbuda renders Saint John\'s, XCD, English only', () => {
    const d = getCountryDetails('antigua-and-barbuda')!
    expect(d.languages).toEqual(['English'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Antigua and Barbuda' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of Antigua and Barbuda' })).toHaveAttribute('src', '/flags/AG.png')
    expect(screen.getByText("Saint John's")).toBeInTheDocument()
    expect(screen.getByText('East Caribbean Dollar (XCD) · $')).toBeInTheDocument()
  })

  it('Bosnia and Herzegovina renders Sarajevo, BAM · KM, Bosnian/Croatian/Serbian', () => {
    const d = getCountryDetails('bosnia-and-herzegovina')!
    expect(d.languages).toEqual(['Bosnian', 'Croatian', 'Serbian'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Bosnia and Herzegovina' })).toBeInTheDocument()
    expect(screen.getByText('Sarajevo')).toBeInTheDocument()
    expect(screen.getByText('Bosnia and Herzegovina Convertible Mark (BAM) · KM')).toBeInTheDocument()
    expect(screen.getByText('Bosnian, Croatian, Serbian')).toBeInTheDocument()
  })

  it('Burkina Faso renders Ouagadougou, XOF · CFA, Mooré/Dioula/Fulfulde/French, preserving Unicode é', () => {
    const d = getCountryDetails('burkina-faso')!
    expect(d.languages).toEqual(['Mooré', 'Dioula', 'Fulfulde', 'French'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Burkina Faso' })).toBeInTheDocument()
    expect(screen.getByText('Ouagadougou')).toBeInTheDocument()
    expect(screen.getByText('West African CFA Franc (XOF) · CFA')).toBeInTheDocument()
    expect(screen.getByText('Mooré, Dioula, Fulfulde, French')).toBeInTheDocument()
  })

  it('Central African Republic renders Bangui, XAF · FCFA, Sango/French', () => {
    const d = getCountryDetails('central-african-republic')!
    expect(d.languages).toEqual(['Sango', 'French'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Central African Republic' })).toBeInTheDocument()
    expect(screen.getByText('Bangui')).toBeInTheDocument()
    expect(screen.getByText('Central African CFA Franc (XAF) · FCFA')).toBeInTheDocument()
    expect(screen.getByText('Sango, French')).toBeInTheDocument()
  })

  it('Dominican Republic renders Santo Domingo, DOP · RD$, Spanish only', () => {
    const d = getCountryDetails('dominican-republic')!
    expect(d.languages).toEqual(['Spanish'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Dominican Republic' })).toBeInTheDocument()
    expect(screen.getByText('Santo Domingo')).toBeInTheDocument()
    expect(screen.getByText('Dominican Peso (DOP) · RD$')).toBeInTheDocument()
  })

  it('Equatorial Guinea renders Malabo, XAF · FCFA, Spanish/French/Portuguese', () => {
    const d = getCountryDetails('equatorial-guinea')!
    expect(d.languages).toEqual(['Spanish', 'French', 'Portuguese'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Equatorial Guinea' })).toBeInTheDocument()
    expect(screen.getByText('Malabo')).toBeInTheDocument()
    expect(screen.getByText('Central African CFA Franc (XAF) · FCFA')).toBeInTheDocument()
    expect(screen.getByText('Spanish, French, Portuguese')).toBeInTheDocument()
  })

  it('Guinea-Bissau renders Bissau, XOF · CFA, Portuguese/Guinea-Bissau Creole', () => {
    const d = getCountryDetails('guinea-bissau')!
    expect(d.languages).toEqual(['Portuguese', 'Guinea-Bissau Creole'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Guinea-Bissau' })).toBeInTheDocument()
    expect(screen.getByText('Bissau')).toBeInTheDocument()
    expect(screen.getByText('West African CFA Franc (XOF) · CFA')).toBeInTheDocument()
    expect(screen.getByText('Portuguese, Guinea-Bissau Creole')).toBeInTheDocument()
  })

  it('Liechtenstein renders Vaduz, CHF, German only', () => {
    const d = getCountryDetails('liechtenstein')!
    expect(d.languages).toEqual(['German'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Liechtenstein' })).toBeInTheDocument()
    expect(screen.getByText('Vaduz')).toBeInTheDocument()
    expect(screen.getByText('Swiss Franc (CHF) · CHF')).toBeInTheDocument()
  })

  it('Marshall Islands renders Majuro, USD, Marshallese/English', () => {
    const d = getCountryDetails('marshall-islands')!
    expect(d.languages).toEqual(['Marshallese', 'English'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Marshall Islands' })).toBeInTheDocument()
    expect(screen.getByText('Majuro')).toBeInTheDocument()
    expect(screen.getByText('United States Dollar (USD) · $')).toBeInTheDocument()
    expect(screen.getByText('Marshallese, English')).toBeInTheDocument()
  })

  it('none of the ten Study-data Batch A countries is answer-eligible or in ANSWER_POOL, proving reference-data population did not alter gameplay eligibility', () => {
    for (const slug of BATCH_A_SLUGS) {
      const country = findCountryById(slug)!
      expect(isEligibleAnswer(country), slug).toBe(false)
      expect(ANSWER_POOL.some((c) => c.id === slug), slug).toBe(false)
    }
  })

  it('no country outside Study-data Batch A was accidentally affected — Netherlands (Batch B) and South Africa/Switzerland/United Kingdom/United States/Vatican City (Batch C) were later populated for real, not by this batch', () => {
    // Netherlands was in this "still missing" set as of Batch A, but is now
    // populated for real by Study-data Batch B, and the remaining five
    // spot-checked here were in turn populated for real by Study-data
    // Batch C (see the dedicated Batch C describe block further down) —
    // none of that was caused by this Batch A change.
    for (const slug of BATCH_A_SLUGS) {
      expect(getCountryDetails(slug)!.verified.capital, slug).toBe(true)
    }
  })
})

describe('Study-data Batch B (this task): 10 more non-playable canonical countries get full reference pages', () => {
  const BATCH_B_SLUGS = [
    'netherlands', 'north-macedonia', 'papua-new-guinea', 'philippines',
    'saint-kitts-and-nevis', 'saint-vincent-and-the-grenadines',
    'sao-tome-and-principe', 'saudi-arabia', 'sierra-leone', 'solomon-islands',
  ] as const

  it('all ten resolve through getCountryDetails() with a real flag and zero placeholders, despite being non-playable', () => {
    for (const slug of BATCH_B_SLUGS) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('Netherlands renders Amsterdam (not The Hague), EUR · €, Dutch only, and the fact distinguishes the seat of government', () => {
    const d = getCountryDetails('netherlands')!
    expect(d.languages).toEqual(['Dutch'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Netherlands' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of Netherlands' })).toHaveAttribute('src', '/flags/NL.png')
    expect(screen.getByText('Amsterdam')).toBeInTheDocument()
    expect(screen.queryByText('The Hague')).not.toBeInTheDocument()
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()
    expect(screen.getByText(/The Hague/)).toBeInTheDocument() // present in the fun-fact text, not as the capital
  })

  it('North Macedonia renders Skopje, Macedonian Denar · ден, Macedonian/Albanian', () => {
    const d = getCountryDetails('north-macedonia')!
    expect(d.languages).toEqual(['Macedonian', 'Albanian'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'North Macedonia' })).toBeInTheDocument()
    expect(screen.getByText('Skopje')).toBeInTheDocument()
    expect(screen.getByText('Macedonian Denar (MKD) · ден')).toBeInTheDocument()
    expect(screen.getByText('Macedonian, Albanian')).toBeInTheDocument()
  })

  it('Papua New Guinea renders Port Moresby, PGK · K, English/Tok Pisin/Hiri Motu, and its fact mentions 800+ languages', () => {
    const d = getCountryDetails('papua-new-guinea')!
    expect(d.languages).toEqual(['English', 'Tok Pisin', 'Hiri Motu'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Papua New Guinea' })).toBeInTheDocument()
    expect(screen.getByText('Port Moresby')).toBeInTheDocument()
    expect(screen.getByText('Papua New Guinean Kina (PGK) · K')).toBeInTheDocument()
    expect(screen.getByText('English, Tok Pisin, Hiri Motu')).toBeInTheDocument()
    expect(screen.getByText(/800/)).toBeInTheDocument()
  })

  it('Philippines renders Manila, PHP · ₱, Filipino/English', () => {
    const d = getCountryDetails('philippines')!
    expect(d.languages).toEqual(['Filipino', 'English'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Philippines' })).toBeInTheDocument()
    expect(screen.getByText('Manila')).toBeInTheDocument()
    expect(screen.getByText('Philippine Peso (PHP) · ₱')).toBeInTheDocument()
    expect(screen.getByText('Filipino, English')).toBeInTheDocument()
  })

  it('Saint Kitts and Nevis renders Basseterre, XCD, English only', () => {
    const d = getCountryDetails('saint-kitts-and-nevis')!
    expect(d.languages).toEqual(['English'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Saint Kitts and Nevis' })).toBeInTheDocument()
    expect(screen.getByText('Basseterre')).toBeInTheDocument()
    expect(screen.getByText('East Caribbean Dollar (XCD) · $')).toBeInTheDocument()
  })

  it('Saint Vincent and the Grenadines renders Kingstown, XCD, English only', () => {
    const d = getCountryDetails('saint-vincent-and-the-grenadines')!
    expect(d.languages).toEqual(['English'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Saint Vincent and the Grenadines' })).toBeInTheDocument()
    expect(screen.getByText('Kingstown')).toBeInTheDocument()
    expect(screen.getByText('East Caribbean Dollar (XCD) · $')).toBeInTheDocument()
  })

  it('São Tomé and Príncipe renders São Tomé, STN · Db, Portuguese only, with Unicode intact end to end', () => {
    const d = getCountryDetails('sao-tome-and-principe')!
    expect(d.name).toBe('São Tomé and Príncipe')
    expect(d.languages).toEqual(['Portuguese'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'São Tomé and Príncipe' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Flag of São Tomé and Príncipe' })).toHaveAttribute('src', '/flags/ST.png')
    expect(screen.getByText('São Tomé', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('São Tomé and Príncipe Dobra (STN) · Db')).toBeInTheDocument()
  })

  it('Saudi Arabia renders Riyadh, SAR · ﷼, Arabic only', () => {
    const d = getCountryDetails('saudi-arabia')!
    expect(d.languages).toEqual(['Arabic'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Saudi Arabia' })).toBeInTheDocument()
    expect(screen.getByText('Riyadh')).toBeInTheDocument()
    expect(screen.getByText('Saudi Riyal (SAR) · ﷼')).toBeInTheDocument()
  })

  it('Sierra Leone renders Freetown, SLE · Le, English/Krio', () => {
    const d = getCountryDetails('sierra-leone')!
    expect(d.languages).toEqual(['English', 'Krio'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Sierra Leone' })).toBeInTheDocument()
    expect(screen.getByText('Freetown')).toBeInTheDocument()
    expect(screen.getByText('Sierra Leonean Leone (SLE) · Le')).toBeInTheDocument()
    expect(screen.getByText('English, Krio')).toBeInTheDocument()
  })

  it('Solomon Islands renders Honiara, SBD, English/Solomon Islands Pijin', () => {
    const d = getCountryDetails('solomon-islands')!
    expect(d.languages).toEqual(['English', 'Solomon Islands Pijin'])
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Solomon Islands' })).toBeInTheDocument()
    expect(screen.getByText('Honiara')).toBeInTheDocument()
    expect(screen.getByText('Solomon Islands Dollar (SBD) · $')).toBeInTheDocument()
    expect(screen.getByText('English, Solomon Islands Pijin')).toBeInTheDocument()
  })

  it('none of the ten Study-data Batch B countries is answer-eligible or in ANSWER_POOL, proving reference-data population did not alter gameplay eligibility', () => {
    for (const slug of BATCH_B_SLUGS) {
      const country = findCountryById(slug)!
      expect(isEligibleAnswer(country), slug).toBe(false)
      expect(ANSWER_POOL.some((c) => c.id === slug), slug).toBe(false)
    }
  })

  it('no country outside Study-data Batch B was accidentally affected — the remaining 8 canonical entries were later populated for real by Study-data Batch C, not by this batch', () => {
    // As of Batch B these 8 were still missing; Study-data Batch C (see the
    // dedicated describe block below) populated all of them for real.
    for (const slug of BATCH_B_SLUGS) {
      expect(getCountryDetails(slug)!.verified.capital, slug).toBe(true)
    }
  })
})

describe('Study-data Batch C (this task): the final 8 non-playable canonical countries get full reference pages — every canonical country now has one', () => {
  const BATCH_C_SLUGS = [
    'south-africa', 'switzerland', 'trinidad-and-tobago', 'turkmenistan',
    'united-arab-emirates', 'united-kingdom', 'united-states', 'vatican-city',
  ] as const

  it('all eight resolve through getCountryDetails() with a real flag and zero placeholders, despite being non-playable', () => {
    for (const slug of BATCH_C_SLUGS) {
      const d = getCountryDetails(slug)
      expect(d, slug).not.toBeNull()
      expect(d!.flagUrl, slug).not.toBeNull()
      expect(Object.values(d!.verified).every((v) => v === true), slug).toBe(true)
      expect(d!.population).not.toContain('Estimate')
      expect(d!.population).not.toContain('2026')
    }
  })

  it('South Africa renders Pretoria, ZAR · R, and all 12 languages joined, with no "Coming soon" placeholder', () => {
    const d = getCountryDetails('south-africa')!
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'South Africa' })).toBeInTheDocument()
    expect(screen.getByText('Pretoria')).toBeInTheDocument()
    expect(screen.getByText('South African Rand (ZAR) · R')).toBeInTheDocument()
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
  })

  it('Switzerland renders Bern, Swiss Franc · CHF, German/French/Italian/Romansh', () => {
    const d = getCountryDetails('switzerland')!
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Switzerland' })).toBeInTheDocument()
    expect(screen.getByText('Bern')).toBeInTheDocument()
    expect(screen.getByText('Swiss Franc (CHF) · CHF')).toBeInTheDocument()
    expect(screen.getByText('German, French, Italian, Romansh')).toBeInTheDocument()
  })

  it('United Kingdom renders London, GBP · £, and its own union-wide languages list, distinct from England/Scotland/Wales', () => {
    const d = getCountryDetails('united-kingdom')!
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'United Kingdom' })).toBeInTheDocument()
    expect(screen.getByText('London')).toBeInTheDocument()
    expect(screen.getByText('Pound Sterling (GBP) · £')).toBeInTheDocument()
    expect(screen.getByText('English, Welsh, Scottish Gaelic, Irish, Scots')).toBeInTheDocument()
    expect(d.flagUrl).toBe('/flags/GB.png')
  })

  it('United States renders Washington, D.C., USD · $, English/Spanish', () => {
    const d = getCountryDetails('united-states')!
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'United States' })).toBeInTheDocument()
    expect(screen.getByText('Washington, D.C.')).toBeInTheDocument()
    expect(screen.getByText('United States Dollar (USD) · $')).toBeInTheDocument()
    expect(screen.getByText('English, Spanish')).toBeInTheDocument()
  })

  it('Vatican City renders Vatican City, EUR · €, Italian/Latin', () => {
    const d = getCountryDetails('vatican-city')!
    render(<CountryResultCard details={d} context={null} primaryAction={<button>Go</button>} headingLevel="h1" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Vatican City' })).toBeInTheDocument()
    expect(screen.getByText('Euro (EUR) · €')).toBeInTheDocument()
    expect(screen.getByText('Italian, Latin')).toBeInTheDocument()
  })

  it('none of the eight Study-data Batch C countries is answer-eligible or in ANSWER_POOL, proving reference-data population did not alter gameplay eligibility', () => {
    for (const slug of BATCH_C_SLUGS) {
      const country = findCountryById(slug)!
      expect(isEligibleAnswer(country), slug).toBe(false)
      expect(ANSWER_POOL.some((c) => c.id === slug), slug).toBe(false)
    }
  })

  it('invariant complete: every canonical COUNTRIES entry now has a COUNTRY_FACTS entry — no country is left on the placeholder path', () => {
    const stillMissing = COUNTRIES.filter((c) => !(c.id in COUNTRY_FACTS))
    expect(stillMissing).toEqual([])
  })
})
