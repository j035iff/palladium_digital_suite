import {
  LIVE_SHEET_SAVE_LABEL,
  liveSheetSaveStatus,
  liveSheetSaveStatusLabel,
  type LiveSheetSaveStatus,
} from '../../lib/liveSheetSave'

type LiveSheetSaveControlsProps = {
  dirty: boolean
  onSave: () => void
  morphusActive?: boolean
}

function SavedStatusDot({ status }: { status: LiveSheetSaveStatus }) {
  const saved = status === 'saved'
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={liveSheetSaveStatusLabel(status)}
      aria-label={liveSheetSaveStatusLabel(status)}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          saved ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
        aria-hidden
      />
      <span
        className={`text-[10px] font-bold uppercase tracking-wide ${
          saved ? 'text-emerald-700' : 'text-amber-800'
        }`}
      >
        {liveSheetSaveStatusLabel(status)}
      </span>
    </span>
  )
}

/**
 * Explicit Save + saved/unsaved indicator for the live sheet Persistent Core.
 * One control for Story and Combat (Unified Path).
 */
export function LiveSheetSaveControls({
  dirty,
  onSave,
  morphusActive = false,
}: LiveSheetSaveControlsProps) {
  const status = liveSheetSaveStatus(dirty)
  return (
    <div className="flex items-center gap-2">
      <SavedStatusDot status={status} />
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty}
        title={dirty ? 'Save character' : 'All changes saved'}
        aria-label={dirty ? 'Save character' : 'All changes saved'}
        className={`rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
          dirty
            ? morphusActive
              ? 'border-amber-300 bg-violet-900 text-amber-100 hover:border-amber-200'
              : 'border-slate-800 bg-slate-900 text-white hover:bg-slate-800'
            : morphusActive
              ? 'cursor-default border-slate-600 bg-slate-900/50 text-slate-500'
              : 'cursor-default border-slate-200 bg-slate-100 text-slate-400'
        }`}
      >
        {LIVE_SHEET_SAVE_LABEL}
      </button>
    </div>
  )
}
