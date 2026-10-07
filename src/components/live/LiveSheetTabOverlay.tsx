import { useEffect } from 'react'
import { LiveSheetTabBody } from './LiveSheetTabBody'
import {
  LIVE_SHEET_TAB_LABELS,
  liveSheetTabTitle,
  type LiveSheetMode,
  type LiveSheetOverlayTabId,
} from '../../lib/liveSheetTabs'

type Props = {
  mode: LiveSheetMode
  tabId: LiveSheetOverlayTabId
  morphusActive: boolean
  onClose: () => void
}

/**
 * Overlay host for shared Stats/Saves/Skills/Abilities/Gear — reuses
 * `LiveSheetTabBody` (Unified Path; no forked panel math).
 */
export function LiveSheetTabOverlay({
  mode,
  tabId,
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
        aria-label={LIVE_SHEET_TAB_LABELS[tabId]}
        className={`flex max-h-[min(92vh,840px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 shadow-2xl ${
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
          <div className="min-w-0">
            <p
              className={`text-[10px] font-black uppercase tracking-wider ${
                morphusActive ? 'text-violet-300' : 'text-blue-800'
              }`}
            >
              {LIVE_SHEET_TAB_LABELS[tabId]}
            </p>
            <h2
              className={`text-sm font-bold ${
                morphusActive ? 'text-violet-50' : 'text-slate-900'
              }`}
            >
              {liveSheetTabTitle(mode, tabId)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={
              morphusActive
                ? 'shrink-0 rounded-md border-2 border-violet-300 bg-violet-800 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-violet-700'
                : 'shrink-0 rounded-md border-2 border-blue-600 bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-blue-500'
            }
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <LiveSheetTabBody mode={mode} tabId={tabId} />
        </div>
      </div>
    </div>
  )
}
