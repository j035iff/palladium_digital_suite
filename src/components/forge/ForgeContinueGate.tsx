export function ForgeContinueGate({
  enabled,
  tooltip,
  blockers,
  onContinue,
  label = 'Continue',
}: {
  enabled: boolean
  tooltip: string
  blockers: string[]
  onContinue: () => void
  label?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-dashed pt-4">
      <button
        type="button"
        disabled={!enabled}
        title={tooltip}
        onClick={onContinue}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-400"
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
