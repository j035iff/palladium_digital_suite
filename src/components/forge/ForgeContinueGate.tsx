export function ForgeContinueGate({
  enabled,
  validated,
  tooltip,
  blockers,
  onContinue,
  label = 'Continue',
  inline = false,
  showBlockers = true,
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
}) {
  const buttonClass = validated
    ? 'rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-md ring-2 ring-emerald-300/80 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:ring-0 sm:px-5 sm:py-2.5 sm:text-sm'
    : 'rounded-lg bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400 sm:px-5 sm:py-2.5 sm:text-sm'

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
      >
        {label}
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
