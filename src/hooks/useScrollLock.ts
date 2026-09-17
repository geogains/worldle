import { useEffect } from 'react'

/**
 * Locks page scroll while `active` is true, restoring whatever inline
 * overflow value was previously set (usually none) when it turns false or
 * the component unmounts. Locks both the root element and body since,
 * depending on box-sizing/quirks, either can end up as the element the
 * browser actually scrolls.
 *
 * Daily Worldle's app shell already keeps `body` non-scrolling at all times
 * (see index.css), so in practice this mainly guards the root element and
 * future layout changes — but it's the standard, robust technique and keeps
 * the intent explicit at the call site (e.g. the navigation drawer).
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const root = document.documentElement
    const body = document.body
    const prevRoot = root.style.overflow
    const prevBody = body.style.overflow
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      root.style.overflow = prevRoot
      body.style.overflow = prevBody
    }
  }, [active])
}
