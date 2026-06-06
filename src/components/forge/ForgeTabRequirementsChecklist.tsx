import type { ForgeTabRequirement } from '../../lib/forgeNavigation/types'

export function ForgeTabRequirementsChecklist({
  requirements,
  morphus = false,
}: {
  requirements: readonly ForgeTabRequirement[]
  morphus?: boolean
}) {
  if (requirements.length === 0) return null

  return (
    <ul
      className="mt-2 space-y-1"
      role="list"
      aria-label="Requirements to continue"
    >
      {requirements.map((req) => (
        <li key={req.id} className="flex items-start gap-2 text-xs leading-snug">
          <span
            className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
              req.satisfied
                ? 'border-emerald-600 bg-emerald-600 text-[10px] font-bold text-white'
                : morphus
                  ? 'border-white/35 bg-transparent'
                  : 'border-slate-400 bg-white dark:border-slate-500 dark:bg-slate-900'
            }`}
            aria-hidden
          >
            {req.satisfied ? '✓' : ''}
          </span>
          <span
            className={
              req.satisfied
                ? morphus
                  ? 'text-emerald-300/90'
                  : 'text-emerald-800 dark:text-emerald-300'
                : morphus
                  ? 'text-white/85'
                  : 'text-slate-700 dark:text-slate-200'
            }
          >
            {req.label}
          </span>
        </li>
      ))}
    </ul>
  )
}
