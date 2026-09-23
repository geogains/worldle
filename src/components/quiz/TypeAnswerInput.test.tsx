import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { AnswerDomainSpec } from '../../lib/quiz/answerValidation'
import { TypeAnswerInput } from './TypeAnswerInput'

const languageDomain: AnswerDomainSpec = {
  label: 'language',
  accepted: [{ display: 'French', keys: ['FRENCH'] }],
  domainCandidates: [
    { display: 'French', keys: ['FRENCH'] },
    { display: 'Spanish', keys: ['SPANISH'] },
    { display: 'German', keys: ['GERMAN'] },
    { display: 'English', keys: ['ENGLISH'] },
  ],
  typoEnabled: true,
}

const codeDomain: AnswerDomainSpec = {
  label: 'currency code',
  accepted: [{ display: 'CHF', keys: ['CHF'] }],
  domainCandidates: [
    { display: 'CHF', keys: ['CHF'] },
    { display: 'EUR', keys: ['EUR'] },
    { display: 'USD', keys: ['USD'] },
  ],
  typoEnabled: false,
}

// There is no Submit button — Type Answer submits on Enter only (the
// button beside the input is Skip). See TypeAnswerInput.tsx.
function typeAndSubmit(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('TypeAnswerInput — answered-state feedback', () => {
  it('correct submission shows "Correct!" with no visible check-icon glyph', () => {
    render(
      <TypeAnswerInput
        inputLabel="Language"
        phase="feedback"
        lastSubmission={{ isCorrect: true, selectedId: null }}
        correctLabel="French"
        onSubmit={vi.fn()}
        answerDomain={languageDomain}
      />,
    )
    const feedback = screen.getByText('Correct!')
    expect(feedback).toHaveClass('quiz-type-answer__feedback--correct')
    expect(feedback.querySelector('svg')).toBeNull()
  })

  it('incorrect submission reveals "Correct answer: X" with no visible cross-icon glyph', () => {
    render(
      <TypeAnswerInput
        inputLabel="Language"
        phase="feedback"
        lastSubmission={{ isCorrect: false, selectedId: null }}
        correctLabel="French"
        onSubmit={vi.fn()}
        answerDomain={languageDomain}
      />,
    )
    const feedback = screen.getByText('Correct answer: French')
    expect(feedback).toHaveClass('quiz-type-answer__feedback--incorrect')
    expect(feedback.querySelector('svg')).toBeNull()
  })

  it('before any submission, no feedback text is shown', () => {
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={vi.fn()} answerDomain={languageDomain} />)
    expect(screen.queryByText('Correct!')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Correct answer:/)).not.toBeInTheDocument()
  })
})

describe('TypeAnswerInput — input-assistance classification pipeline', () => {
  it('an exact accepted answer submits correct immediately, no helper', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'French')
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(true)
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
  })

  it('a close typo shows "Did you mean French?" and does NOT submit', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'Frnch')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/Did you mean/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'French' })).toBeInTheDocument()
  })

  it('clicking the suggestion accepts it as correct', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'Frnch')
    fireEvent.click(screen.getByRole('button', { name: 'French' }))
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('pressing Enter again with the input unchanged accepts the visible suggestion', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    const input = screen.getByLabelText('Language')
    fireEvent.change(input, { target: { value: 'Frnch' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/Did you mean/)).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('REGRESSION — accepting a suggestion that is a WRONG domain value submits INCORRECT, not auto-correct (the suggestion callback must not award correctness by itself)', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    // "Spanish" is a real domain-wide value (in languageDomain.domainCandidates)
    // but is NOT the accepted answer ("French") — a typo of it must still
    // suggest "Spanish" (domain-wide, correctness-blind matching), and
    // accepting that suggestion must submit false, not true.
    typeAndSubmit(screen.getByLabelText('Language'), 'Spanihs')
    expect(onSubmit).not.toHaveBeenCalled()
    const suggestion = screen.getByRole('button', { name: 'Spanish' })
    expect(suggestion).toBeInTheDocument()
    fireEvent.click(suggestion)
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('REGRESSION — pressing Enter again to accept a WRONG suggestion also submits INCORRECT', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    const input = screen.getByLabelText('Language')
    fireEvent.change(input, { target: { value: 'Spanihs' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Spanish' })).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('a correct-suggestion and a wrong-suggestion are visually IDENTICAL before acceptance (no red/green leak)', () => {
    const onSubmit = vi.fn()
    const { unmount } = render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'Frnch') // typo of the correct answer
    const correctSuggestionHelper = screen.getByText(/Did you mean/).closest('p')
    expect(correctSuggestionHelper).not.toHaveClass('quiz-type-answer__feedback--correct')
    expect(correctSuggestionHelper).not.toHaveClass('quiz-type-answer__feedback--incorrect')
    unmount()

    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'Spanihs') // typo of a WRONG domain value
    const wrongSuggestionHelper = screen.getByText(/Did you mean/).closest('p')
    expect(wrongSuggestionHelper).not.toHaveClass('quiz-type-answer__feedback--correct')
    expect(wrongSuggestionHelper).not.toHaveClass('quiz-type-answer__feedback--incorrect')
    expect(correctSuggestionHelper?.className).toBe(wrongSuggestionHelper?.className)
  })

  it('editing the input after a suggestion appears clears the stale suggestion', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    const input = screen.getByLabelText('Language')
    fireEvent.change(input, { target: { value: 'Frnch' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText(/Did you mean/)).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'Frnchy' } })
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
  })

  it('a real but wrong domain value ("Spanish") submits incorrect, not a suggestion', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'Spanish')
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false)
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
  })

  it('nonsense input shows the contextual invalid message and does NOT submit', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'Birmingham')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Please enter a valid language.')).toBeInTheDocument()
  })

  it('empty/whitespace-only input does not submit and shows no helper', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), '   ')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Please enter a valid/)).not.toBeInTheDocument()
  })

  it('helper states never render the strong correct/incorrect result styling', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'Frnch')
    expect(document.querySelector('.quiz-type-answer__feedback--correct')).toBeNull()
    expect(document.querySelector('.quiz-type-answer__feedback--incorrect')).toBeNull()
  })

  it('Did You Mean is disabled for a typoEnabled: false domain (currency codes) — a close-but-wrong code is just invalid or a real wrong code', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Currency code" phase="answering" lastSubmission={null} correctLabel="CHF" onSubmit={onSubmit} answerDomain={codeDomain} />)
    typeAndSubmit(screen.getByLabelText('Currency code'), 'CHG') // 1-edit from CHF, but not a real code in this test domain
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
    expect(screen.getByText('Please enter a valid currency code.')).toBeInTheDocument()
  })

  it('a real-but-wrong code still submits incorrect normally', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Currency code" phase="answering" lastSubmission={null} correctLabel="CHF" onSubmit={onSubmit} answerDomain={codeDomain} />)
    typeAndSubmit(screen.getByLabelText('Currency code'), 'EUR')
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('is case-insensitive for exact code matches', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Currency code" phase="answering" lastSubmission={null} correctLabel="CHF" onSubmit={onSubmit} answerDomain={codeDomain} />)
    typeAndSubmit(screen.getByLabelText('Currency code'), 'chf')
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(true)
  })
})

describe('TypeAnswerInput — Skip ("I don\'t know this answer")', () => {
  it('a real button named "Skip" is present while answering', () => {
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={vi.fn()} answerDomain={languageDomain} />)
    const skip = screen.getByRole('button', { name: 'Skip' })
    expect(skip.tagName).toBe('BUTTON')
    expect(skip).not.toBeDisabled()
  })

  it('clicking Skip does NOT submit — it shows a confirmation instead, with no score/progress/feedback change', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Are you sure you want to skip this question?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yes, skip' })).toBeInTheDocument()
    expect(document.querySelector('.quiz-type-answer__feedback')).toBeNull()
  })

  it('the confirmation uses the same helper paragraph styling as Did You Mean', () => {
    const onSubmit = vi.fn()
    const { unmount } = render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'Frnch')
    const didYouMeanHelper = screen.getByText(/Did you mean/).closest('p')!
    unmount()

    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    const confirmHelper = screen.getByText('Are you sure you want to skip this question?').closest('p')!
    expect(confirmHelper).toHaveClass('quiz-type-answer__helper')
    expect(didYouMeanHelper).toHaveClass('quiz-type-answer__helper')
    expect(screen.getByRole('button', { name: 'Yes, skip' })).toHaveClass('quiz-type-answer__suggestion')
  })

  it('A. empty input + Skip: confirming resolves incorrect, with no classification/validation attempted', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    expect(screen.getByLabelText('Language')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false)
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Please enter a valid/)).not.toBeInTheDocument()
  })

  it('B. partial input + Skip: confirming ignores the draft entirely (never validated as if it were a real submission)', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'Fr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false)
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Please enter a valid/)).not.toBeInTheDocument()
  })

  it('C. invalid-domain helper visible + Skip replaces it with the confirmation (never shown together); confirming resolves incorrect', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'Birmingham')
    expect(screen.getByText('Please enter a valid language.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByText('Please enter a valid language.')).not.toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to skip this question?')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('D. Did You Mean visible + Skip replaces it with the confirmation (never shown together) — the suggestion is never auto-accepted', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    typeAndSubmit(screen.getByLabelText('Language'), 'Frnch') // typo of the CORRECT answer
    expect(screen.getByText(/Did you mean/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to skip this question?')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, skip' }))
    // Must be false, not true — proves the pending suggestion was discarded, not silently accepted.
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('typing after opening the confirmation cancels it and resumes normal editing', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByText('Are you sure you want to skip this question?')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'F' } })
    expect(screen.queryByText('Are you sure you want to skip this question?')).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('physical Enter cancels the confirmation and submits the typed answer normally', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'French' } })
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByText('Are you sure you want to skip this question?')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByLabelText('Language'), { key: 'Enter' })
    expect(screen.queryByText('Are you sure you want to skip this question?')).not.toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('on-screen keyboard Enter also cancels the confirmation and submits the typed answer normally', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'French' } })
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByText('Are you sure you want to skip this question?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    expect(screen.queryByText('Are you sure you want to skip this question?')).not.toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('Enter on an empty field just cancels the confirmation (nothing to submit)', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    fireEvent.keyDown(screen.getByLabelText('Language'), { key: 'Enter' })
    expect(screen.queryByText('Are you sure you want to skip this question?')).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('F. Skip (and any confirmation) is non-actionable once the question has resolved', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="feedback" lastSubmission={{ isCorrect: false, selectedId: null }} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    const skip = screen.getByRole('button', { name: 'Skip' })
    expect(skip).toBeDisabled()
    fireEvent.click(skip)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByText('Are you sure you want to skip this question?')).not.toBeInTheDocument()
  })

  it('no double submission: confirming twice only ever submits once', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    const yesSkip = screen.getByRole('button', { name: 'Yes, skip' })
    fireEvent.click(yesSkip)
    fireEvent.click(yesSkip)
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('G. a fresh question render starts clean: empty input, no stale confirmation or helper, Skip active again', () => {
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={vi.fn()} answerDomain={languageDomain} />)
    expect(screen.getByLabelText('Language')).toHaveValue('')
    expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Please enter a valid/)).not.toBeInTheDocument()
    expect(screen.queryByText('Are you sure you want to skip this question?')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skip' })).not.toBeDisabled()
  })

  it('Skip carries the red skip styling class, and occupies the sole button beside the input — there is no Submit button', () => {
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={vi.fn()} answerDomain={languageDomain} />)
    const skip = screen.getByRole('button', { name: 'Skip' })
    expect(skip).toHaveClass('quiz-type-answer__skip')
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Skip' })).toHaveLength(1)
  })

  it('typed answers submit on Enter, not by clicking Skip', () => {
    const onSubmit = vi.fn()
    render(<TypeAnswerInput inputLabel="Language" phase="answering" lastSubmission={null} correctLabel="French" onSubmit={onSubmit} answerDomain={languageDomain} />)
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'French' } })
    fireEvent.keyDown(screen.getByLabelText('Language'), { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(true)
  })
})
