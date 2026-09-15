import { useRouter } from '../hooks/useRouter'
import { PATHS } from '../lib/router/routes'

export function NotFoundScreen({
  title = 'Page not found',
  message = "That page doesn't exist.",
}: {
  title?: string
  message?: string
}) {
  const { navigate } = useRouter()
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[1.5rem] font-extrabold">{title}</h1>
      <p className="mt-2 text-[0.95rem] text-muted">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn--primary" onClick={() => navigate(PATHS.daily)}>
          Today's puzzle
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => navigate(PATHS.archive)}>
          Archive
        </button>
      </div>
    </div>
  )
}
