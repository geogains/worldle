import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { OverlayProvider } from '../../providers/OverlayProvider'
import { HelpModal } from './HelpModal'

function renderHelp() {
  return render(
    <OverlayProvider>
      <HelpModal open onClose={vi.fn()} excludeAnswer={null} />
    </OverlayProvider>,
  )
}

describe('HelpModal', () => {
  it('no longer renders the bottom Daily/Practice/Archive explanatory section', () => {
    renderHelp()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByText(/available every day/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/unlimited games/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/replay past puzzles/i)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/archive/i)).not.toBeInTheDocument()
  })

  it('the Examples section, with all three example words, remains present', () => {
    renderHelp()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Examples' })).toBeInTheDocument()
    expect(within(dialog).getByRole('grid', { name: /example: costarica/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('grid', { name: /example: singapore/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('grid', { name: /example: argentina/i })).toBeInTheDocument()
    // The letter is a <strong>, so match the full sentence via textContent
    // rather than getByText (which can't span the split strong/text nodes).
    expect(dialog).toHaveTextContent('O is in the country and in the correct spot.')
    expect(dialog).toHaveTextContent('A is in the country but in the wrong spot.')
    expect(dialog).toHaveTextContent('G is not in the country in any spot.')
  })

  it('the examples list is now the last content in the modal (no trailing section after it)', () => {
    renderHelp()
    const dialog = screen.getByRole('dialog')
    // Last child of the dialog is the examples list itself, not a leftover
    // paragraph/divider from the removed bottom section.
    const last = dialog.lastElementChild as HTMLElement
    expect(last).toHaveTextContent('G is not in the country in any spot.')
    expect(last.tagName).not.toBe('P')
  })
})
