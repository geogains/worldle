import { createContext, useContext } from 'react'

export interface ToastItem {
  id: number
  message: string
  /** ms; Infinity keeps it until dismissed. */
  duration: number
  leaving: boolean
}

export interface ToastValue {
  toasts: ToastItem[]
  showToast: (message: string, options?: { duration?: number }) => number
  dismissToast: (id: number) => void
  clearToasts: () => void
}

export const ToastContext = createContext<ToastValue | null>(null)

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
