import { useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import { usePrefs } from '../../hooks/usePrefs'
import { MoonIcon, SunIcon } from '../ui/icons'

export interface ThemeToggleProps {
  /** Visibility/layout utilities from the caller, e.g. "hidden sm:inline-flex". */
  className?: string
}

/**
 * Compact animated light/dark switch. Purely a presentation layer over the
 * app's existing theme system (usePrefs/PrefsProvider): it only reads
 * `resolvedTheme` and calls `toggleTheme`, so persistence, system-theme
 * resolution and cross-tab behaviour are entirely unchanged — this replaces
 * just the visible icon button, not any theme logic.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = usePrefs()
  const reducedMotion = usePrefersReducedMotion()
  const isDark = resolvedTheme === 'dark'
  const [rippling, setRippling] = useState(false)
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  const handleClick = () => {
    toggleTheme()
    if (!reducedMotion) setRippling(true)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      data-theme-state={isDark ? 'dark' : 'light'}
      className={`theme-toggle ${className ?? ''}`}
      onClick={handleClick}
    >
      <span className="theme-toggle__track">
        <span
          className="theme-toggle__thumb"
          style={{ transform: isDark ? 'translateX(28px)' : 'translateX(0)' }}
        >
          {rippling && (
            <span
              className="theme-toggle__glow"
              aria-hidden="true"
              onAnimationEnd={() => setRippling(false)}
            />
          )}
          {isDark ? <MoonIcon size={14} /> : <SunIcon size={14} />}
        </span>
      </span>
    </button>
  )
}
