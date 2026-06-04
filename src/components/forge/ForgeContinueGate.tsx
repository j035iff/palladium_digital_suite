export function ForgeContinueGate({
  enabled,
  validated,
  tooltip,
  blockers,
  onContinue,
  label = 'Continue',
}: {
  enabled: boolean
  /** True after this section was marked complete (matches green tab pill). */
  validated?: boolean
  tooltip: string
  blockers: string[]
  onContinue: () => void
  label?: string
}) {
  const buttonClass = validated
    ? 'rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-md ring-2 ring-emerald-300/80 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:ring-0'
    : 'rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400'

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-dashed pt-4">
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
      {!enabled && blockers.length > 0 ? (
        <ul className="max-w-xl text-xs text-amber-700 dark:text-amber-300">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
