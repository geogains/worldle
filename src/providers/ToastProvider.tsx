import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastItem, type ToastValue } from '../hooks/useToast'

const EXIT_MS = 200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const map = timers.current
    return () => {
      for (const t of map.values()) clearTimeout(t)
      map.clear()
    }
  }, [])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
  }, [])

  const dismissToast = useCallback(
    (id: number) => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
      const t = timers.current.get(id)
      if (t) clearTimeout(t)
      timers.current.set(id, setTimeout(() => remove(id), EXIT_MS))
    },
    [remove],
  )

  const showToast = useCallback(
    (message: string, options?: { duration?: number }) => {
      const id = nextId.current++
      const duration = options?.duration ?? 1600
      setToasts((prev) => [{ id, message, duration, leaving: false }, ...prev].slice(0, 3))
      if (Number.isFinite(duration)) {
        timers.current.set(id, setTimeout(() => dismissToast(id), duration))
      }
      return id
    },
    [dismissToast],
  )

  const clearToasts = useCallback(() => {
    setToasts([])
    for (const t of timers.current.values()) clearTimeout(t)
    timers.current.clear()
  }, [])

  const value = useMemo<ToastValue>(
    () => ({ toasts, showToast, dismissToast, clearToasts }),
    [toasts, showToast, dismissToast, clearToasts],
  )
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
