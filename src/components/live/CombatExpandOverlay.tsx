import { useEffect, type ReactNode } from 'react'

type Props = {
  morphus: boolean
  /** Short eyebrow (e.g. ACTION · HAND TO HAND). */
  eyebrow: string
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Close-able expand host for Combat Action (HtH + weapon slots).
 * Familiar Surface chrome aligned with {@link LiveSheetTabOverlay}: backdrop,
 * Escape / click-out dismiss, Close control — no strip paging (combat-only).
 */
export function CombatExpandOverlay({
  morphus,
  eyebrow,
  title,
  onClose,
  children,
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
        aria-label={title}
        className={`flex max-h-[min(92vh,840px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 shadow-2xl ${
          morphus
            ? 'border-violet-400 bg-slate-950 text-violet-50'
            : 'border-blue-500 bg-white text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-start justify-between gap-3 border-b-2 px-4 py-3 ${
            morphus ? 'border-violet-700' : 'border-blue-200'
          }`}
        >
          <div className="min-w-0">
            <p
              className={`text-[10px] font-black uppercase tracking-wider ${
                morphus ? 'text-violet-300' : 'text-blue-800'
              }`}
            >
              {eyebrow}
            </p>
            <h2
              className={`text-sm font-bold ${
                morphus ? 'text-violet-50' : 'text-slate-900'
              }`}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={
              morphus
                ? 'shrink-0 rounded-md border-2 border-violet-300 bg-violet-800 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-violet-700'
                : 'shrink-0 rounded-md border-2 border-blue-600 bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-blue-500'
            }
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  )
}
