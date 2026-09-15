import { branding } from '../../config/branding'

export function RolloverBanner({ puzzleNumber, onPlay }: { puzzleNumber: number; onPlay: () => void }) {
  return (
    <div
      className="anim-fade-in absolute top-2 left-1/2 z-20 flex w-[calc(100%-1.5rem)] max-w-[440px] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 shadow-[0_6px_24px_rgba(0,0,0,0.12)]"
      role="status"
    >
      <span className="text-[0.9rem] font-semibold">
        {branding.name} #{puzzleNumber} is ready
      </span>
      <button type="button" className="btn btn--primary min-h-[36px] px-4 py-1.5 text-[0.85rem]" onClick={onPlay}>
        Play
      </button>
    </div>
  )
}
