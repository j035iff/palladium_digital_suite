import { LIVE_SHEET_SAVE_LABEL } from '../../lib/liveSheetSave'

type LiveSheetSaveControlsProps = {
  dirty: boolean
  onSave: () => void
  morphusActive?: boolean
}

/**
 * Explicit Save for the live sheet Persistent Core.
 * Dirty → orange Save (enabled); clean → greyed/disabled.
 * Dirty/clean is carried by the button alone (no separate Saved/Unsaved chip).
 * One control for Story and Combat (Unified Path).
 */
export function LiveSheetSaveControls({
  dirty,
  onSave,
  morphusActive = false,
}: LiveSheetSaveControlsProps) {
  return (
    <div className="flex items-center gap-2">
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
