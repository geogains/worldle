import { useEffect } from 'react'

/**
 * Sets document.title while mounted and restores the previous title on
 * unmount (routes without their own title fall back to the branded default
 * from index.html).
 */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (title === null || typeof document === 'undefined') return
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
