export function DevForgeShortcutButton({
  label,
  title,
  onClick,
  variant = 'panel',
}: {
  label: string
  title?: string
  onClick: () => void
  variant?: 'panel' | 'header'
}) {
  const buttonClass =
    'rounded-md border border-amber-600 bg-amber-100 font-semibold text-amber-950 hover:bg-amber-200 dark:border-amber-500 dark:bg-amber-900/60 dark:text-amber-50 dark:hover:bg-amber-900'

  if (variant === 'header') {
    return (
      <button
        type="button"
        title={title ?? label}
        onClick={onClick}
        className={`${buttonClass} border-dashed px-2 py-1 text-[10px] uppercase tracking-wide`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="mb-4 rounded-lg border border-dashed border-amber-500/80 bg-amber-50/80 p-3 dark:bg-amber-950/30">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
        Dev only — not in production builds
      </p>
      <button
        type="button"
        onClick={onClick}
        className={`${buttonClass} px-3 py-1.5 text-sm`}
      >
        {label}
      </button>
    </div>
  )
}
