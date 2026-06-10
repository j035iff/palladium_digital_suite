import {
  SUPERNATURAL_ABILITY_FORGE_LANES,
  SUPERNATURAL_ABILITY_LANE_LABELS,
  isSupernaturalAbilityLaneAllowed,
  supernaturalAbilityLaneNaReason,
  type SupernaturalAbilityForgeLane,
} from '../../../lib/forgeNavigation/supernaturalAbilitiesForge'
import type { OccCreationAbilityBudget } from '../../../lib/occCreationDerivation'
import { forgeTabVisualTheme } from '../../../lib/forgeNavigation/forgeTabVisual'

function NaTabWatermark() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg"
    >
      <span className="select-none text-lg font-black uppercase tracking-tighter text-red-500/30 dark:text-red-400/35">
        N/A
      </span>
    </span>
  )
}

type SupernaturalAbilityLaneTabsProps = {
  budget: OccCreationAbilityBudget
  activeLane: SupernaturalAbilityForgeLane
  onSelectLane: (lane: SupernaturalAbilityForgeLane) => void
  occName?: string
  morphus: boolean
}

export function SupernaturalAbilityLaneTabs({
  budget,
  activeLane,
  onSelectLane,
  occName,
  morphus,
}: SupernaturalAbilityLaneTabsProps) {
  const naTheme = forgeTabVisualTheme('na')

  const laneTabStyle = (lane: SupernaturalAbilityForgeLane, selected: boolean) => {
    if (!isSupernaturalAbilityLaneAllowed(budget, lane)) {
      return naTheme.pill
    }
    if (selected) {
      return morphus
        ? 'border-violet-400 bg-violet-600 text-white ring-1 ring-violet-400/70'
        : 'border-blue-600 bg-blue-600 text-white ring-1 ring-blue-400/70'
    }
    return morphus
      ? 'border-violet-900 bg-slate-950 text-violet-200 hover:border-violet-700 ring-1 ring-violet-900'
      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 ring-1 ring-slate-300'
  }

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Supernatural ability forge lane"
    >
      {SUPERNATURAL_ABILITY_FORGE_LANES.map((lane) => {
        const allowed = isSupernaturalAbilityLaneAllowed(budget, lane)
        const selected = activeLane === lane
        const title = allowed
          ? SUPERNATURAL_ABILITY_LANE_LABELS[lane]
          : supernaturalAbilityLaneNaReason(lane, occName)

        return (
          <button
            key={lane}
            type="button"
            role="tab"
            aria-selected={selected}
            title={title}
            onClick={() => onSelectLane(lane)}
            className={`relative overflow-hidden rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              !allowed ? 'cursor-pointer opacity-95' : ''
            } ${laneTabStyle(lane, selected)}`}
          >
            {!allowed ? <NaTabWatermark /> : null}
            <span className="relative z-[1]">
              {SUPERNATURAL_ABILITY_LANE_LABELS[lane]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
