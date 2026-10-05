import {
  LIVE_SHEET_CANCEL_LEAVE_LABEL,
  LIVE_SHEET_CONTINUE_WITHOUT_SAVING_LABEL,
  LIVE_SHEET_SAVE_LABEL,
  LIVE_SHEET_UNSAVED_BODY,
  LIVE_SHEET_UNSAVED_TITLE,
} from '../../lib/liveSheetSave'

type UnsavedEditsDialogProps = {
  open: boolean
  onSave: () => void
  onContinueWithoutSaving: () => void
  onStay: () => void
}

/**
 * Leave-guard when the live sheet has unsaved edits.
 * Familiar Surface: Save or Continue without saving (plus Stay).
 */
export function UnsavedEditsDialog({
  open,
  onSave,
  onContinueWithoutSaving,
  onStay,
}: UnsavedEditsDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onStay}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="live-sheet-unsaved-title"
        aria-describedby="live-sheet-unsaved-body"
        className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="live-sheet-unsaved-title"
          className="text-base font-bold text-slate-900"
        >
          {LIVE_SHEET_UNSAVED_TITLE}
        </h2>
        <p id="live-sheet-unsaved-body" className="mt-2 text-sm text-slate-600">
          {LIVE_SHEET_UNSAVED_BODY}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onStay}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            {LIVE_SHEET_CANCEL_LEAVE_LABEL}
          </button>
          <button
            type="button"
            onClick={onContinueWithoutSaving}
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 hover:border-amber-400"
          >
            {LIVE_SHEET_CONTINUE_WITHOUT_SAVING_LABEL}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {LIVE_SHEET_SAVE_LABEL}
          </button>
        </div>
      </div>
    </div>
  )
}
