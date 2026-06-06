import type { ForgeTabVisualState } from '../../lib/forgeNavigation/types'

function continueButtonClass(
  enabled: boolean,
  validated: boolean,
  headerVisual?: ForgeTabVisualState,
): string {
  const base =
    'rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wide transition sm:px-5 sm:py-2.5 sm:text-sm'

  if (!enabled) {
    const onDarkHeader =
      headerVisual === 'active' ||
      headerVisual === 'complete' ||
      headerVisual === 'incomplete' ||
      headerVisual === 'conflict'
    return onDarkHeader
      ? `${base} cursor-not-allowed border-2 border-dashed border-white/50 bg-slate-900/25 text-white/45`
      : `${base} cursor-not-allowed border-2 border-dashed border-slate-400 bg-slate-200 text-slate-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-400`
  }

  if (validated) {
    return `${base} bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-200 hover:bg-emerald-400`
  }

  return `${base} bg-white text-blue-800 shadow-lg ring-2 ring-blue-900/25 hover:bg-blue-50`
}

export function ForgeContinueGate({
  enabled,
  validated,
  tooltip,
  blockers,
  onContinue,
  label = 'Continue',
  inline = false,
  showBlockers = true,
  headerVisual,
}: {
  enabled: boolean
  /** True after this section was marked complete (matches green tab pill). */
  validated?: boolean
  tooltip: string
  blockers: string[]
  onContinue: () => void
  label?: string
  /** Top-right placement beside the tab page title. */
  inline?: boolean
  /** When false, parent renders blockers (e.g. below the title row). */
  showBlockers?: boolean
  /** Active tab header color — tunes disabled contrast. */
  headerVisual?: ForgeTabVisualState
}) {
  const buttonClass = continueButtonClass(enabled, validated === true, headerVisual)

  return (
    <div
      className={
        inline
          ? 'flex flex-wrap items-center justify-end gap-2'
          : 'flex flex-wrap items-center gap-3 border-t border-dashed pt-4'
      }
    >
      <button
        type="button"
        disabled={!enabled}
        title={tooltip}
        onClick={onContinue}
        className={buttonClass}
        aria-pressed={validated === true}
        aria-label={
          enabled ? `${label} — ready to continue` : `${label} — requirements incomplete`
        }
      >
        {label}
        {enabled ? ' ✓' : ''}
      </button>
      {showBlockers && !enabled && blockers.length > 0 ? (
        <ul className="max-w-xl text-xs text-amber-700 dark:text-amber-300">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
