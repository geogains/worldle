import { useLayoutEffect, useRef, useState } from 'react'
import { branding } from '../../config/branding'
import { usePrefs } from '../../hooks/usePrefs'
import { useRouter } from '../../hooks/useRouter'
import { PATHS } from '../../lib/router/routes'
import { NavigationDrawer } from './NavigationDrawer'
import { ThemeToggle } from './ThemeToggle'
import { MenuIcon } from '../ui/icons'

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

const DRAWER_ID = 'navigation-drawer'

export function Header({ onOpenHelp, onOpenStats }: HeaderProps) {
  const { route, navigate } = useRouter()
  const { resolvedTheme } = usePrefs()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const navLinkRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [underline, setUnderline] = useState<{ x: number; w: number } | null>(null)

  // Decorative drawer-only icons — only ever rendered inside
  // NavigationDrawer (see its `{item.icon && ...}`); the desktop <nav>
  // below never reads `item.icon` at all, so swapping these to the new
  // illustrated PNGs cannot affect the desktop nav. alt="" because the
  // drawer item button's own visible label ("Daily" etc.) is already its
  // accessible name — see NavigationDrawer.tsx's <button>. All five source
  // files are a uniform 512x512 transparent canvas but crop their artwork
  // to different amounts of that canvas, so a shared fixed display size
  // (.nav-drawer__item-icon-img, see index.css) is what actually makes
  // them feel consistently sized next to each other, not just their shared
  // source resolution.
  const items: NavItem[] = [
    {
      label: 'Daily',
      path: PATHS.daily,
      active: route.name === 'daily',
      icon: <img src="/icons/daily.png" alt="" className="nav-drawer__item-icon-img" />,
    },
    {
      label: 'Practice',
      path: PATHS.practice,
      active: route.name === 'practice',
      icon: <img src="/icons/practice.png" alt="" className="nav-drawer__item-icon-img" />,
    },
    {
      label: 'Archive',
      path: PATHS.archive,
      active: route.name === 'archive' || route.name === 'archive-game',
      icon: <img src="/icons/archive.png" alt="" className="nav-drawer__item-icon-img" />,
    },
    {
      label: 'Study',
      path: PATHS.study,
      active: route.name === 'study',
      icon: <img src="/icons/study.png" alt="" className="nav-drawer__item-icon-img" />,
    },
    {
      label: 'Quiz',
      path: PATHS.quiz,
      active: route.name === 'quiz' || route.name === 'quiz-play',
      icon: <img src="/icons/quiz.png" alt="" className="nav-drawer__item-icon-img" />,
    },
  ]
  const activeNavPath = items.find((item) => item.active)?.path ?? null

  // Shared underline indicator: measure the active link's position/width and
  // slide a single element there, instead of each link owning its own
  // underline. useLayoutEffect (not useEffect) measures and commits before
  // the browser paints, so the very first render already shows the underline
  // in the right place — it never animates in from zero width on mount, only
  // when activeNavPath actually changes afterwards. Also re-measures on
  // resize and once webfonts finish loading, since a fallback-font width at
  // first paint would otherwise leave the underline very slightly misaligned
  // until the next route change.
  useLayoutEffect(() => {
    const measure = () => {
      const el = activeNavPath ? navLinkRefs.current[activeNavPath] : null
      setUnderline(el ? { x: el.offsetLeft, w: el.offsetWidth } : null)
    }
    measure()
    window.addEventListener('resize', measure)
    document.fonts?.ready?.then(measure).catch(() => {})
    return () => window.removeEventListener('resize', measure)
  }, [activeNavPath])

  const go = (path: string) => {
    setDrawerOpen(false)
    navigate(path)
  }

  return (
    <header className="relative z-30 bg-[var(--c-surface-glass-strong)] shadow-[0_2px_12px_rgba(13,49,90,0.1)] backdrop-blur-md">
      {/* Row height grew from the original 56px (60px mobile / 68px desktop)
          purely to give the logo's own crop window (30px mobile / 42px
          desktop — see .header-logo) more vertical breathing room; every
          child is still centered by this same flex row, so the increase
          benefits all of them equally rather than needing any per-element
          nudge. */}
      <div className="mx-auto flex h-[60px] max-w-[1000px] items-center px-2 sm:h-[68px] sm:px-4">
        {/* Left: menu trigger (mobile/tablet) / nav (wide desktop). The
            trigger opens the NavigationDrawer, which owns its own focus
            trap, Escape handling and focus restoration — it isn't reachable
            by Tab while the drawer is open, so its own icon never needs to
            swap to a second close affordance.

            The switch from trigger to full nav is `lg` (1024px), not the
            smaller `sm` this row's own height/padding still use — measured
            directly against this row's actual content, not assumed: this
            header centers the logo via two equal `flex-1` side containers
            (see the row below), so the logo only stays truly centered once
            BOTH sides' real content (five nav links vs. two icon buttons +
            the theme toggle) fits within its own half-share of the
            available width. Below ~930px the nav's fixed ~329px content
            starts exceeding its shrinking half-share and pushes the logo
            visibly off-centre; below ~740px it overflows the header
            outright. `lg` clears that crossover with comfortable margin
            using an existing Tailwind breakpoint rather than a new one. */}
        <div className="flex flex-1 items-center gap-1">
          <button
            type="button"
            className="icon-btn inline-flex lg:hidden"
            // Static label: the trigger only ever opens the drawer (its own
            // close button handles closing, and this button isn't reachable
            // by Tab while the drawer is open anyway), so it never needs to
            // say "Close menu" — that label belongs to the drawer's own X,
            // and having both share it would give two controls the same
            // accessible name at once. aria-expanded still communicates state.
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls={DRAWER_ID}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <MenuIcon />
          </button>
          <nav ref={navRef} className="relative hidden items-center gap-1 lg:flex" aria-label="Game modes">
            {items.map((item) => (
              <button
                key={item.path}
                ref={(el) => {
                  navLinkRefs.current[item.path] = el
                }}
                type="button"
                className="nav-link"
                aria-current={item.active ? 'page' : undefined}
                onClick={() => go(item.path)}
              >
                {item.label}
              </button>
            ))}
            {underline && (
              <span
                className="nav-underline"
                aria-hidden="true"
                style={{ width: underline.w, transform: `translateX(${underline.x}px)` }}
              />
            )}
          </nav>
        </div>

        {/* Center: wordmark. The button's aria-label carries the accessible
            name, so the image's alt (also the product name) is redundant to
            assistive tech rather than duplicated — see Header CSS for the
            crop that removes the logo PNGs' transparent framing. Dark mode
            swaps to the purpose-made white asset (same intrinsic dimensions
            and framing as the light one) rather than filtering/recolouring
            a single asset, driven by the existing resolvedTheme from
            usePrefs — no separate theme state. */}
        <button
          type="button"
          // inline-flex + items-center: without its own flex context the
          // button centered .header-logo using ordinary line-height-driven
          // inline layout, which left a small (~3.5px) top-biased offset
          // instead of true vertical centering — most noticeable once the
          // logo's own clipping window grew taller. A real flex container
          // centers it exactly, matching the icon buttons beside it.
          className="inline-flex shrink-0 items-center rounded px-2"
          onClick={() => go(PATHS.daily)}
          aria-label={`${branding.name} home`}
        >
          <span className="header-logo">
            <img
              src={resolvedTheme === 'dark' ? '/Worldle-white1.png' : '/Worldle-logo.png'}
              alt={branding.name}
              className="header-logo__img"
            />
          </span>
        </button>

        {/* Right: help / stats / theme */}
        <div className="flex flex-1 items-center justify-end gap-0.5">
          <button type="button" className="icon-btn inline-flex" onClick={onOpenHelp} aria-label="How to play" title="How to play">
            <span aria-hidden="true" className="text-[1.25rem] leading-none">
              ℹ️
            </span>
          </button>
          <button type="button" className="icon-btn inline-flex" onClick={onOpenStats} aria-label="Statistics" title="Statistics">
            <span aria-hidden="true" className="text-[1.25rem] leading-none">
              📊
            </span>
          </button>
          <ThemeToggle className="hidden lg:inline-flex" />
        </div>
      </div>

      <NavigationDrawer
        id={DRAWER_ID}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={items}
        onNavigate={go}
      />
    </header>
  )
}
