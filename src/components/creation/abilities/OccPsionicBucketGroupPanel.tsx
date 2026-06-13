import type { ReactNode } from 'react'

import type { OccPsionicPerCategoryBucket } from '../../../lib/occSupernaturalSelection'

export function OccPsionicBucketGroupPanel({
  bucket,
  morphus,
  renderPsionicRow,
}: {
  bucket: OccPsionicPerCategoryBucket
  morphus: boolean
  renderPsionicRow: (id: string) => ReactNode
}) {
  return (
    <li
      className={`rounded-md border text-sm ${
        morphus
          ? 'border-violet-700 bg-slate-900/60'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className={`flex items-baseline justify-between gap-2 border-b px-2 py-1.5 ${
          morphus ? 'border-violet-800' : 'border-slate-200'
        }`}
      >
        <p
          className={`min-w-0 text-sm font-bold leading-snug ${
            morphus ? 'text-amber-300' : 'text-amber-950'
          }`}
        >
          {bucket.label}
        </p>
        <span
          className={`shrink-0 text-sm font-bold tabular-nums ${
            morphus ? 'text-amber-300' : 'text-amber-950'
          }`}
        >
          {bucket.filledCount}/{bucket.cap}
        </span>
      </div>

      {bucket.pickIds.length > 0 ? (
        <ul className="space-y-1 p-2">
          {bucket.pickIds.map((id) => (
            <li key={id} className="list-none">
              {renderPsionicRow(id)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-2 py-2 text-xs opacity-60">
          Choose powers from the {bucket.label} category tab.
        </p>
      )}
    </li>
  )
}
