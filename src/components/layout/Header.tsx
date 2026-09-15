import { useEffect, useRef, useState } from 'react'
import { branding } from '../../config/branding'
import { useOverlays } from '../../hooks/useOverlays'
import { usePrefs } from '../../hooks/usePrefs'
import { useRouter } from '../../hooks/useRouter'
import { PATHS } from '../../lib/router/routes'
import {
  CalendarIcon,
  CloseIcon,
  GlobeIcon,
  HelpIcon,
  MenuIcon,
  MoonIcon,
  ShuffleIcon,
  StatsIcon,
  SunIcon,
} from '../ui/icons'

export interface HeaderProps {
  onOpenHelp: () => void
  onOpenStats: () => void
}

interface NavItem {
  label: string
  path: string
  active: boolean
  icon: React.ReactNode
}

export function Header({ onOpenHelp, onOpenStats }: HeaderProps) {
  const { route, navigate } = useRouter()
  const { resolvedTheme, toggleTheme } = usePrefs()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const { register } = useOverlays()

  // Pause physical-keyboard game input while the menu is open.
  useEffect(() => {
    if (!menuOpen) return
    return register()
  }, [menuOpen, register])

  const items: NavItem[] = [
    { label: 'Daily', path: PATHS.daily, active: route.name === 'daily', icon: <GlobeIcon size={20} /> },
    {
      label: 'Practice',
      path: PATHS.practice,
      active: route.name === 'practice',
      icon: <ShuffleIcon size={20} />,
    },
    {
      label: 'Archive',
      path: PATHS.archive,
      active: route.name === 'archive' || route.name === 'archive-game',
      icon: <CalendarIcon size={20} />,
    },
  ]

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const go = (path: string) => {
    setMenuOpen(false)
    navigate(path)
  }

  const themeLabel = resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <header className="relative z-30 border-b border-divider">
      <div className="mx-auto flex h-[52px] max-w-[1000px] items-center px-2 sm:px-4">
        {/* Left: menu (mobile) / nav (desktop) */}
        <div className="flex flex-1 items-center gap-1">
          <button
            ref={menuButtonRef}
            type="button"
            className="icon-btn inline-flex sm:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="app-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Game modes">
            {items.map((item) => (
              <button
                key={item.path}
                type="button"
                className="nav-link"
                aria-current={item.active ? 'page' : undefined}
                onClick={() => go(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Center: title */}
        <button
          type="button"
          className="shrink-0 rounded px-2 text-[1.35rem] font-extrabold tracking-[-0.02em] text-ink sm:text-[1.5rem]"
          onClick={() => go(PATHS.daily)}
          aria-label={`${branding.name} home`}
        >
          {branding.name}
        </button>

        {/* Right: help / stats / theme */}
        <div className="flex flex-1 items-center justify-end gap-0.5">
          <button type="button" className="icon-btn inline-flex" onClick={onOpenHelp} aria-label="How to play" title="How to play">
            <HelpIcon />
          </button>
          <button type="button" className="icon-btn inline-flex" onClick={onOpenStats} aria-label="Statistics" title="Statistics">
            <StatsIcon />
          </button>
          <button
            type="button"
            className="icon-btn hidden sm:inline-flex"
            onClick={toggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="app-menu"
          ref={menuRef}
          role="menu"
          aria-label="Menu"
          className="anim-menu-in absolute top-[56px] left-2 w-[220px] rounded-xl border border-line bg-surface p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.16)] sm:hidden"
        >
          {items.map((item) => (
            <button
              key={item.path}
              type="button"
              role="menuitem"
              className="menu-item"
              aria-current={item.active ? 'page' : undefined}
              onClick={() => go(item.path)}
            >
              <span className="text-muted">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t border-divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              toggleTheme()
              setMenuOpen(false)
            }}
          >
            <span className="text-muted">{resolvedTheme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}</span>
            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      )}
    </header>
  )
}
