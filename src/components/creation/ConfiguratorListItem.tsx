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
  children,
  className = '',
  filterMismatch = false,
}: {
  morphus: boolean
  selected: boolean
  tierResult: ConfiguratorTierResult
  onSelect: () => void
  children: ReactNode
  className?: string
  /** Selected row pinned while active filters / matrix disagree (amber). */
  filterMismatch?: boolean
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

  return (
    <button
      type="button"
      aria-disabled={!selectable}
      aria-pressed={selected}
      title={tooltip || undefined}
      onClick={() => {
        if (selectable) onSelect()
      }}
      className={`w-full rounded-lg border-2 px-3 py-2 text-left transition-[box-shadow,transform] ${TIER_STYLES[key][theme]} ${className}`}
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
  )
}
