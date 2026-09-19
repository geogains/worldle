import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { branding } from '../../config/branding'
import { useOverlays } from '../../hooks/useOverlays'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import { usePrefs } from '../../hooks/usePrefs'
import { useScrollLock } from '../../hooks/useScrollLock'
import { CloseIcon } from '../ui/icons'
import { ThemeToggle } from './ThemeToggle'

export interface NavigationDrawerItem {
  label: string
  path: string
  active: boolean
  icon?: ReactNode
}

export interface NavigationDrawerProps {
  /** DOM id, referenced by the trigger button's aria-controls. */
  id: string
  open: boolean
  onClose: () => void
  items: NavigationDrawerItem[]
  onNavigate: (path: string) => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Left-side sliding navigation drawer: full-viewport on phones, a partial
 * width panel + backdrop from the existing `sm` (640px) breakpoint up —
 * matching every other responsive split already used in this header, rather
 * than inventing a new one. Deliberately structured in three parts (header /
 * scrollable nav content / footer) so future sections (settings, info, …)
 * have an obvious place to go without restructuring this component again.
 *
 * Architecturally this mirrors ui/Modal.tsx (portal, focus trap, Escape,
 * focus restoration, keep-mounted-during-exit-animation) rather than
 * extending Modal itself, since a drawer's slide animation, sizing and
 * backdrop behaviour are different enough to want their own small
 * self-contained implementation.
 */
export function NavigationDrawer({ id, open, onClose, items, onNavigate }: NavigationDrawerProps) {
  const { resolvedTheme } = usePrefs()
  const reducedMotion = usePrefersReducedMotion()
  const { register } = useOverlays()

  // Keep the drawer mounted for the exit animation after `open` turns false,
  // same pattern as Modal.tsx.
  const [prevOpen, setPrevOpen] = useState(open)
  const [closing, setClosing] = useState(false)
  if (open !== prevOpen) {
    setPrevOpen(open)
    setClosing(!open)
  }
  const mounted = open || closing
  useScrollLock(mounted)

  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return
    return register()
  }, [open, register])

  useEffect(() => {
    if (!closing) return
    // Matches the CSS animation duration below so the drawer never unmounts
    // (and stops trapping focus) before it has actually finished sliding
    // out, in either the normal or reduced-motion timing.
    const id = setTimeout(() => setClosing(false), reducedMotion ? 40 : 320)
    return () => clearTimeout(id)
  }, [closing, reducedMotion])

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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panelRef.current) return
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    )
    if (focusable.length === 0) {
      e.preventDefault()
      return
    }
    const first = focusable[0] as HTMLElement
    const last = focusable[focusable.length - 1] as HTMLElement
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!mounted) return null

  return createPortal(
    <>
      <div
        className={`nav-drawer-backdrop ${closing ? 'nav-drawer-backdrop--out' : 'nav-drawer-backdrop--in'}`}
        onMouseDown={onClose}
      />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={`${branding.name} navigation`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`nav-drawer ${closing ? 'nav-drawer--out' : 'nav-drawer--in'}`}
      >
        <div className="nav-drawer__header">
          <span className="nav-drawer__logo">
            <img
              src={resolvedTheme === 'dark' ? '/Worldle-white1.png' : '/Worldle-logo.png'}
              alt={branding.name}
              className="nav-drawer__logo-img"
            />
          </span>
          <button
            type="button"
            className="icon-btn inline-flex"
            onClick={onClose}
            aria-label="Close menu"
            data-autofocus
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="nav-drawer__content" aria-label="Game modes">
          {items.map((item) => (
            <button
              key={item.path}
              type="button"
              className="nav-drawer__item"
              aria-current={item.active ? 'page' : undefined}
              onClick={() => onNavigate(item.path)}
            >
              {item.icon && <span className="nav-drawer__item-icon">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="nav-drawer__footer">
          <span className="nav-drawer__footer-label">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </>,
    document.body,
  )
}
