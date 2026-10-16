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

function SavedStatusDot({
  status,
  morphusActive,
}: {
  status: LiveSheetSaveStatus
  morphusActive: boolean
}) {
  const saved = status === 'saved'
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={liveSheetSaveStatusLabel(status)}
      aria-label={liveSheetSaveStatusLabel(status)}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          saved ? 'bg-emerald-500' : 'bg-orange-500'
        }`}
        aria-hidden
      />
      <span
        className={`text-[10px] font-bold uppercase tracking-wide ${
          saved
            ? morphusActive
              ? 'text-emerald-400'
              : 'text-emerald-700'
            : morphusActive
              ? 'text-orange-300'
              : 'text-orange-700'
        }`}
      >
        {liveSheetSaveStatusLabel(status)}
      </span>
    </span>
  )
}

/**
 * Explicit Save + saved/unsaved indicator for the live sheet Persistent Core.
 * Dirty → orange Save (enabled); clean → greyed/disabled.
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
      <SavedStatusDot status={status} morphusActive={morphusActive} />
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty}
        title={dirty ? 'Save character' : 'All changes saved'}
        aria-label={dirty ? 'Save character' : 'All changes saved'}
        className={`rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
          dirty
            ? 'border-orange-600 bg-orange-500 text-white hover:bg-orange-400'
            : morphusActive
              ? 'cursor-not-allowed border-slate-600 bg-slate-800/60 text-slate-500 opacity-60'
              : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70'
        }`}
      >
        {LIVE_SHEET_SAVE_LABEL}
      </button>
    </div>
  )
}
