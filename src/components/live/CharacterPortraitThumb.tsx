/**
 * Familiar Surface portrait thumbnail for People / party listings.
 */
export function CharacterPortraitThumb({
  dataUrl,
  label,
  sizeClass = 'h-12 w-12',
}: {
  dataUrl: string | undefined
  label: string
  sizeClass?: string
}) {
  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={label}
        className={`${sizeClass} shrink-0 rounded-md border border-slate-600 object-cover`}
      />
    )
  }
  const initial = label.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-sm font-bold text-slate-400`}
      aria-hidden
    >
      {initial}
    </span>
  )
}
