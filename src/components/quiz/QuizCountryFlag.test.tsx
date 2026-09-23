import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { findCountryById } from '../../data/countries'
import { countryCodeForSlug, flagUrlForCode } from '../../data/countryDetails/flags'
import { QuizCountryFlag } from './QuizCountryFlag'

describe('QuizCountryFlag', () => {
  it('renders the correct flag asset for a country with a known code, using the shared quiz-play__country-flag treatment', () => {
    const country = findCountryById('greece')!
    render(<QuizCountryFlag country={country} />)
    const img = screen.getByRole('img', { name: `Flag of ${country.name}` }) as HTMLImageElement
    expect(img).toHaveClass('quiz-play__country-flag')
    const code = countryCodeForSlug(country.id)!
    expect(img.src).toContain(flagUrlForCode(code))
  })

  it('falls back to a hidden placeholder (no broken image) for a country with no resolvable flag code', () => {
    const country = findCountryById('greece')!
    // Same country, but simulate "no code" by constructing an id that can't resolve.
    const unresolvable = { ...country, id: 'not-a-real-country-id' }
    render(<QuizCountryFlag country={unresolvable} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    const placeholder = document.querySelector('.quiz-play__country-flag-placeholder')
    expect(placeholder).toBeInTheDocument()
    expect(placeholder).toHaveAttribute('aria-hidden', 'true')
  })
})
