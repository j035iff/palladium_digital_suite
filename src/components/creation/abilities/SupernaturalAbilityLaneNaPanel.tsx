import {
  SUPERNATURAL_ABILITY_LANE_LABELS,
  supernaturalAbilityLaneNaReason,
  type SupernaturalAbilityForgeLane,
} from '../../../lib/forgeNavigation/supernaturalAbilitiesForge'
import { forgeTabVisualTheme } from '../../../lib/forgeNavigation/forgeTabVisual'

function NaPanelWatermark() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <span className="select-none text-4xl font-black uppercase tracking-tighter text-red-500/15 dark:text-red-400/20">
        N/A
      </span>
    </span>
  )
}

type SupernaturalAbilityLaneNaPanelProps = {
  lane: SupernaturalAbilityForgeLane
  occName?: string
  morphus: boolean
}

export function SupernaturalAbilityLaneNaPanel({
  lane,
  occName,
  morphus,
}: SupernaturalAbilityLaneNaPanelProps) {
  const naTheme = forgeTabVisualTheme('na')
  const reason = supernaturalAbilityLaneNaReason(lane, occName)

  return (
    <div
      className={`relative overflow-hidden rounded-lg border p-6 text-sm ${naTheme.headerBar} ${
        morphus ? 'text-slate-300' : ''
      }`}
      role="tabpanel"
    >
      <NaPanelWatermark />
      <div className="relative z-[1] space-y-2">
        <h3 className={`text-xs font-bold uppercase tracking-wide ${naTheme.headerTitle}`}>
          {SUPERNATURAL_ABILITY_LANE_LABELS[lane]} — Not applicable
        </h3>
        <p className={morphus ? 'text-violet-200/90' : 'text-slate-600'}>{reason}</p>
      </div>
    </div>
  )
}
