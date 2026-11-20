import type { ReactNode } from 'react'
import type { ConfiguratorTier, ConfiguratorTierResult } from '../../lib/configuratorMatrix'
import {
  configuratorTierTooltip,
  isConfiguratorSelectable,
} from '../../lib/configuratorMatrix'

const TIER_STYLES = {
  active: {
    light:
      'border-blue-600 bg-blue-50 shadow-[0_0_0_2px_rgba(37,99,235,0.25)]',
    morphus:
      'border-amber-400 bg-violet-950/80 shadow-[0_0_0_2px_rgba(251,191,36,0.35)]',
  },
  idle: {
    light: 'border-slate-200 bg-slate-50 hover:border-blue-400',
    morphus: 'border-violet-800 bg-slate-900/60 hover:border-violet-500',
  },
  tier2: {
    light:
      'cursor-not-allowed border-rose-600/80 bg-rose-50/90 text-rose-950',
    morphus:
      'cursor-not-allowed border-rose-500/70 bg-rose-950/40 text-rose-100',
  },
  tier3: {
    light:
      'cursor-not-allowed border-slate-400/60 bg-slate-100/80 text-slate-500 opacity-55 line-through decoration-slate-400',
    morphus:
      'cursor-not-allowed border-slate-600/50 bg-slate-900/30 text-slate-400 opacity-50 line-through',
  },
  filterMismatch: {
    light:
      'border-amber-500 bg-amber-50 text-amber-950 shadow-[0_0_0_2px_rgba(245,158,11,0.35)]',
    morphus:
      'border-amber-400 bg-amber-950/50 text-amber-100 shadow-[0_0_0_2px_rgba(251,191,36,0.4)]',
  },
} as const

function tierStyleKey(
  tier: ConfiguratorTier,
  selected: boolean,
  selectable: boolean,
  filterMismatch: boolean,
): keyof typeof TIER_STYLES {
  if (filterMismatch && selected) return 'filterMismatch'
  if (selected && selectable) return 'active'
  if (tier === 2) return 'tier2'
  if (tier === 3) return 'tier3'
  return 'idle'
}

export function ConfiguratorListItem({
  morphus,
  selected,
  tierResult,
  onSelect,
  onInspect,
  children,
  className = '',
  filterMismatch = false,
  expanded = false,
  expandedDetail,
}: {
  morphus: boolean
  selected: boolean
  tierResult: ConfiguratorTierResult
  onSelect: () => void
  /** When the row is not selectable, click still runs this (read-only expand). */
  onInspect?: () => void
  children: ReactNode
  className?: string
  /** Selected row pinned while active filters / matrix disagree (amber). */
  filterMismatch?: boolean
  expanded?: boolean
  expandedDetail?: ReactNode
}) {
  const selectable = isConfiguratorSelectable(tierResult) || filterMismatch
  const theme = morphus ? 'morphus' : 'light'
  const key = tierStyleKey(
    tierResult.tier,
    selected,
    selectable,
    filterMismatch && selected,
  )
  const tooltip =
    filterMismatch && selected
      ? 'Current selection does not match active filters or matrix constraints.'
      : configuratorTierTooltip(tierResult)
  const hasExpand = expandedDetail != null
  const expandTitle = expanded ? 'Hide description' : 'Show description'

  return (
    <div
      className={`w-full rounded-lg border-2 transition-[box-shadow,transform] ${TIER_STYLES[key][theme]} ${className}`}
    >
      <button
        type="button"
        aria-disabled={!selectable && !onInspect}
        aria-pressed={selected}
        aria-expanded={hasExpand ? expanded : undefined}
        title={hasExpand ? expandTitle : tooltip || undefined}
        onClick={() => {
          if (selectable) onSelect()
          else onInspect?.()
        }}
        className={`w-full px-3 py-2 text-left ${
          selectable || onInspect ? '' : 'cursor-not-allowed'
        }`}
      >
        {tierResult.tier === 2 && tierResult.conflictReason ? (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">
            {tierResult.conflictReason}
          </p>
        ) : null}
        {filterMismatch && selected ? (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-200">
            Does not match current filters
          </p>
        ) : null}
        {tierResult.tier === 3 && tierResult.tagMismatchReason ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
            {tierResult.tagMismatchReason}
          </p>
        ) : null}
        {children}
      </button>
      {expanded && expandedDetail ? (
        <div className="mx-3 mb-2.5 rounded-md border border-sky-400/80 bg-white p-2.5 dark:border-sky-600 dark:bg-slate-950">
          {expandedDetail}
        </div>
      ) : null}
    </div>
  )
}

/** Shared DESCRIPTION panel body for race / O.C.C. expand-in-place. */
export function ConfiguratorDescriptionPanel({
  description,
  eyebrow,
  note,
  noteClassName,
}: {
  description?: string | null
  eyebrow?: string | null
  note?: string | null
  noteClassName?: string
}) {
  const body = description?.trim() ?? ''
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
        Description
      </p>
      {eyebrow ? (
        <p className="mt-1 text-[10px] font-black uppercase tracking-wide opacity-70">
          {eyebrow}
        </p>
      ) : null}
      {body ? (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
          {body}
        </p>
      ) : (
        <p className="mt-1.5 text-xs italic leading-relaxed text-slate-500 dark:text-slate-400">
          No description in catalog.
        </p>
      )}
      {note ? (
        <p className={`mt-1.5 text-[10px] font-semibold leading-snug ${noteClassName ?? ''}`}>
          {note}
        </p>
      ) : null}
    </>
  )
}
