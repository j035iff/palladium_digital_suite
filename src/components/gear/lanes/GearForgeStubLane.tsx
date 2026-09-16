import { gearPanelTheme } from '../../live/gear/gearPanelTheme'
import type { GearForgeLaneId } from '../../../lib/forgeNavigation/gearForge'
import { GEAR_FORGE_LANE_LABELS, gearForgeLaneNaReason } from '../../../lib/forgeNavigation/gearForge'

type Props = {
  laneId: Exclude<GearForgeLaneId, 'weapons'>
  morphus?: boolean
}

export function GearForgeStubLane({ laneId, morphus = false }: Props) {
  const theme = gearPanelTheme(morphus)
  const reason =
    gearForgeLaneNaReason(laneId) ??
    `${GEAR_FORGE_LANE_LABELS[laneId]} lane is not available yet.`

  return (
    <div
      className={`rounded-xl p-4 shadow-lg ${theme.shell}`}
      role="tabpanel"
      aria-label={GEAR_FORGE_LANE_LABELS[laneId]}
    >
      <div
        className={`rounded-lg border-2 border-dashed px-4 py-8 text-center ${
          morphus ? 'border-violet-600/70 bg-slate-900/40' : 'border-blue-300 bg-blue-50/50'
        }`}
      >
        <p className={`text-sm font-semibold ${theme.th}`}>
          {GEAR_FORGE_LANE_LABELS[laneId]} — not wired yet
        </p>
        <p className={`mt-2 text-xs ${theme.muted}`}>{reason}</p>
      </div>
    </div>
  )
}
