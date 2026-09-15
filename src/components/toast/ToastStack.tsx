import { useToast } from '../../hooks/useToast'

export function ToastStack() {
  const { toasts } = useToast()
  return (
    <div
      className="pointer-events-none fixed top-[64px] left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-md bg-toast-bg px-4 py-3 text-[0.9rem] font-bold whitespace-nowrap text-toast-text shadow-md ${
            t.leaving ? 'anim-toast-out' : 'anim-toast-in'
          }`}
          role="status"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
