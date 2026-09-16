import type { ForgeTabView } from './types'
import {
  GEAR_SUB_TAB_LABELS,
  GEAR_SUB_TAB_ORDER,
  type GearSubTabId,
} from '../gearSubTabs'

/** Gear Forge lane ids — same as live Gear sub-tabs (Unified Path). */
export type GearForgeLaneId = GearSubTabId

export const GEAR_FORGE_LANE_ORDER = GEAR_SUB_TAB_ORDER

export const GEAR_FORGE_LANE_LABELS = GEAR_SUB_TAB_LABELS

/** Lanes fully usable in the first Gear Forge MVP. */
export const GEAR_FORGE_USABLE_LANES: readonly GearForgeLaneId[] = [
  'weapons',
] as const

export function gearForgeLaneNaReason(laneId: GearForgeLaneId): string | null {
  if (GEAR_FORGE_USABLE_LANES.includes(laneId)) return null
  if (laneId === 'armor') {
    return 'Armor lane not wired yet — armor templates stay on the live sheet for now.'
  }
  if (laneId === 'artifacts') {
    return 'Artifacts lane coming soon — use Weapons lane custom property stack for unique weapons.'
  }
  return 'Other gear lane not wired yet — misc gear stays on the live sheet for now.'
}

export function isGearForgeLaneId(id: string): id is GearForgeLaneId {
  return (GEAR_FORGE_LANE_ORDER as readonly string[]).includes(id)
}

/**
 * Lane pills for GearForgeShell.
 * Stub lanes stay visible and clickable (Radical Visibility) with blockers explaining why grant is N/A.
 */
export function buildGearForgeLaneViews(
  activeLaneId: GearForgeLaneId,
): ForgeTabView[] {
  return GEAR_FORGE_LANE_ORDER.map((id) => {
    const naReason = gearForgeLaneNaReason(id)
    const blockers = naReason ? [naReason] : []
    return {
      id,
      label: GEAR_FORGE_LANE_LABELS[id],
      visual: id === activeLaneId ? 'active' : 'available',
      clickable: true,
      blockers,
      isViewing: id === activeLaneId,
    }
  })
}
