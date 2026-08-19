import type { ReactNode } from 'react'
import type { CombatWeaponGlyphId } from '../../lib/combatWeaponSlots'
import { CombatWeaponGlyph } from './CombatWeaponGlyph'

type Props = {
  morphus: boolean
  categoryLabel: string
  expanded: boolean
  empty: boolean
  emptyReason?: string
  glyphId: CombatWeaponGlyphId
  summary: ReactNode
  onToggle: () => void
  children?: ReactNode
}

/**
 * Combat Home category row — collapsed basics + Expand for full profile (ui_wireframe.md §3).
 */
export function CombatCategoryBubble({
  morphus,
  categoryLabel,
  expanded,
  empty,
  emptyReason,
  glyphId,
  summary,
  onToggle,
  children,
}: Props) {
  const shell = morphus
    ? empty
      ? 'border-violet-800/70 bg-slate-950/50 text-violet-300/80'
      : 'border-violet-300 bg-slate-950/90 text-violet-50'
    : empty
      ? 'border-slate-300 bg-slate-50 text-slate-500'
      : 'border-slate-900 bg-white text-slate-900'

  const expandBtn = morphus
    ? 'rounded-full border-2 border-violet-200 bg-violet-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-violet-600'
    : 'rounded-full border-2 border-slate-900 bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-blue-500'

  return (
    <article className={`overflow-hidden rounded-[1.75rem] border-2 ${shell}`}>
      <div className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(7rem,auto)_auto]">
        <div className={`flex min-w-0 items-start gap-3 ${empty ? 'opacity-55' : ''}`}>
          <span className={morphus ? 'text-violet-200' : 'text-blue-800'}>
            <CombatWeaponGlyph id={glyphId} />
          </span>
          <div className="min-w-0 text-[11px] font-semibold leading-snug">
            {empty ? (
              <p>{emptyReason ?? 'Nothing equipped in this slot.'}</p>
            ) : (
              summary
            )}
          </div>
        </div>
        <p
          className={`text-center text-base font-semibold leading-tight tracking-tight sm:text-lg ${
            morphus ? 'text-violet-100' : 'text-slate-900'
          } ${empty ? 'opacity-50' : ''}`}
        >
          {categoryLabel}
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            className={expandBtn}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      {expanded ? (
        <div
          className={`border-t px-4 py-3 ${
            morphus ? 'border-violet-700/80 bg-black/35' : 'border-slate-200 bg-slate-50/90'
          }`}
        >
          {children}
        </div>
      ) : null}
    </article>
  )
}
