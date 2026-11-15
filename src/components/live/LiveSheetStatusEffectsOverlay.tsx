import { useEffect } from 'react'

type Props = {
  morphusActive: boolean
  onClose: () => void
}

/** Status Effects stub — overlay body “Coming Soon” (full #7 deferred). */
export function LiveSheetStatusEffectsOverlay({
  morphusActive,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-center bg-black/40 p-2 backdrop-blur-[1px] sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Status Effects"
        className={`flex max-h-[min(70vh,420px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 shadow-2xl ${
          morphusActive
            ? 'border-violet-400 bg-slate-950 text-violet-50'
            : 'border-blue-500 bg-white text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-start justify-between gap-3 border-b-2 px-4 py-3 ${
            morphusActive ? 'border-violet-700' : 'border-blue-200'
          }`}
        >
          <h2 className="text-sm font-black uppercase tracking-wide">
            Status Effects
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={
              morphusActive
                ? 'rounded-md border-2 border-violet-400 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-violet-100'
                : 'rounded-md border-2 border-blue-500 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-900'
            }
          >
            Close
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <p
            className={`text-sm font-semibold ${
              morphusActive ? 'text-violet-300' : 'text-slate-500'
            }`}
          >
            Coming Soon
          </p>
        </div>
      </div>
    </div>
  )
}
