import type { ForgeTabView } from './forgeNavigation/types'

export type GearSubTabId = 'weapons' | 'armor' | 'artifacts' | 'other'

export const GEAR_SUB_TAB_ORDER: readonly GearSubTabId[] = [
  'weapons',
  'armor',
  'artifacts',
  'other',
] as const

export const GEAR_SUB_TAB_LABELS: Record<GearSubTabId, string> = {
  weapons: 'Weapons',
  armor: 'Armor',
  artifacts: 'Artifacts',
  other: 'Other',
}

export function buildGearSubTabViews(activeSubTabId: GearSubTabId): ForgeTabView[] {
  return GEAR_SUB_TAB_ORDER.map((id) => ({
    id,
    label: GEAR_SUB_TAB_LABELS[id],
    visual: id === activeSubTabId ? 'active' : 'available',
    clickable: true,
    blockers: [],
    isViewing: id === activeSubTabId,
  }))
}
