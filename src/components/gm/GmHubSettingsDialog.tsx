import { UnitsPreferenceToggle } from '../units/UnitsPreferenceToggle'

/**
 * Hub Settings dial — app-global prefs (units). Desktop-first; not a full
 * settings surface for every viewport yet.
 */
export function GmHubSettingsDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 p-4 pt-16 sm:pt-20"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gm-hub-settings-title"
        className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-950 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="gm-hub-settings-title"
            className="text-sm font-black uppercase tracking-[0.18em] text-amber-200"
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:border-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Measurement units apply on this device across Hub, sheet, and forge —
          not locked to the campaign.
        </p>
        <div className="mt-4">
          <UnitsPreferenceToggle tone="launcher" />
        </div>
      </div>
    </div>
  )
}
