import { describe, expect, it } from 'vitest'
import { COUNTRIES, findCountryById } from '../../data/countries'
import { countriesUsingCurrencyCode, currencyOf, eligibleCurrencyCountries, isUniqueCurrency } from './currencies'

describe('currencyOf', () => {
  it('returns the canonical { name, code, symbol } for a country', () => {
    const japan = findCountryById('japan')!
    expect(currencyOf(japan)).toEqual({ name: 'Japanese Yen', code: 'JPY', symbol: '¥' })
  })

  it('every one of the 200 canonical countries has usable currency data (per the Sept 2026 audits)', () => {
    const missing = COUNTRIES.filter((c) => currencyOf(c) === null)
    expect(missing, missing.map((c) => c.id).join(', ')).toHaveLength(0)
  })
})

describe('eligibleCurrencyCountries', () => {
  it('familiar/explorer/world-expert pools all resolve to a non-empty set with usable currency data', () => {
    for (const pool of ['familiar', 'explorer', 'world-expert'] as const) {
      const countries = eligibleCurrencyCountries(pool)
      expect(countries.length).toBeGreaterThan(0)
      expect(countries.every((c) => currencyOf(c) !== null)).toBe(true)
    }
  })
})

describe('countriesUsingCurrencyCode (reverse index)', () => {
  it('a unique currency (JPY) maps to exactly one country', () => {
    const owners = countriesUsingCurrencyCode('JPY')
    expect(owners.map((c) => c.id)).toEqual(['japan'])
  })

  it('is case-insensitive', () => {
    expect(countriesUsingCurrencyCode('jpy').map((c) => c.id)).toEqual(['japan'])
  })

  it('EUR maps to exactly the 27 documented Eurozone/euro-using countries', () => {
    const owners = countriesUsingCurrencyCode('EUR').map((c) => c.id).sort()
    expect(owners).toHaveLength(27)
    expect(owners).toEqual(
      [
        'andorra', 'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'estonia', 'finland', 'france',
        'germany', 'greece', 'ireland', 'italy', 'kosovo', 'latvia', 'lithuania', 'luxembourg', 'malta',
        'monaco', 'montenegro', 'netherlands', 'portugal', 'san-marino', 'slovakia', 'slovenia', 'spain',
        'vatican-city',
      ].sort(),
    )
  })

  it.each([
    ['XOF', 8],
    ['USD', 7],
    ['XAF', 6],
    ['XCD', 6],
    ['AUD', 4],
    ['GBP', 4],
    ['CHF', 2],
    ['ILS', 2],
  ])('%s maps to exactly %d countries', (code, count) => {
    expect(countriesUsingCurrencyCode(code)).toHaveLength(count)
  })

  it('an unknown code maps to zero countries', () => {
    expect(countriesUsingCurrencyCode('XXX')).toEqual([])
  })
})

describe('isUniqueCurrency', () => {
  it('true for a currency unique to one country', () => {
    expect(isUniqueCurrency('JPY', 'japan')).toBe(true)
  })

  it('false for a shared currency, even for one of its real member countries', () => {
    expect(isUniqueCurrency('EUR', 'france')).toBe(false)
    expect(isUniqueCurrency('XOF', 'senegal')).toBe(false)
  })

  it('false if the code does not belong to the given country at all', () => {
    expect(isUniqueCurrency('JPY', 'south-korea')).toBe(false)
  })

  it('134 of 200 countries have a currency unique to them in-dataset (per the Sept 2026 audit)', () => {
    const uniqueCount = COUNTRIES.filter((c) => {
      const currency = currencyOf(c)
      return currency !== null && isUniqueCurrency(currency.code, c.id)
    }).length
    expect(uniqueCount).toBe(134)
  })
})
