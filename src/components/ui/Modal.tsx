import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useOverlays } from '../../hooks/useOverlays'
import { CloseIcon } from './icons'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Visually hide the title (still announced). */
  hideTitle?: boolean
  /** Tailwind max-width utility for the panel. */
  maxWidth?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog: portal, backdrop, Escape to close, focus trap, focus
 * restoration, and enter/exit animations.
 */
export function Modal({ open, onClose, title, children, hideTitle, maxWidth = 'max-w-[440px]' }: ModalProps) {
  // Keep the panel mounted for the exit animation after `open` turns false.
  const [prevOpen, setPrevOpen] = useState(open)
  const [closing, setClosing] = useState(false)
  if (open !== prevOpen) {
    setPrevOpen(open)
    setClosing(!open)
  }
  const mounted = open || closing
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<Element | null>(null)
  const titleId = useId()
  const { register } = useOverlays()

  useEffect(() => {
    if (!open) return
    return register()
  }, [open, register])

  useEffect(() => {
    if (!closing) return
    const id = setTimeout(() => setClosing(false), 160)
    return () => clearTimeout(id)
  }, [closing])

  useEffect(() => {
    if (!mounted || closing) return
    previouslyFocused.current = document.activeElement
    const panel = panelRef.current
    const focusFirst = () => {
      const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel
      target?.focus({ preventScroll: true })
    }
    const raf = requestAnimationFrame(focusFirst)
    return () => {
      cancelAnimationFrame(raf)
      const prev = previouslyFocused.current
      if (prev instanceof HTMLElement && document.contains(prev)) prev.focus({ preventScroll: true })
    }
  }, [mounted, closing])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0] as HTMLElement
      const last = items[items.length - 1] as HTMLElement
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  if (!mounted) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center bg-[var(--c-backdrop)] p-0 sm:items-center sm:p-4 ${
        closing ? 'anim-fade-out' : 'anim-fade-in'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`relative w-full ${maxWidth} max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-surface px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_8px_40px_rgba(0,0,0,0.18)] sm:rounded-2xl sm:px-7 sm:py-7 ${
          closing ? 'anim-modal-out' : 'anim-modal-in'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className={
              hideTitle
                ? 'sr-only'
                : 'text-[0.8rem] font-bold tracking-[0.12em] text-ink uppercase'
            }
          >
            {title}
          </h2>
          <button
            type="button"
            className="icon-btn inline-flex -mt-2 -mr-2 ml-auto"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
