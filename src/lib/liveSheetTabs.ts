import type { ForgeTabView } from '../forgeNavigation/types'

export type LiveSheetTabId =
  | 'stats'
  | 'saves'
  | 'skills'
  | 'abilities'
  | 'gear'
  | 'combat'

export const LIVE_SHEET_TAB_ORDER: readonly LiveSheetTabId[] = [
  'stats',
  'saves',
  'skills',
  'abilities',
  'gear',
  'combat',
] as const

export const LIVE_SHEET_TAB_LABELS: Record<LiveSheetTabId, string> = {
  stats: 'Stats',
  saves: 'Saves',
  skills: 'Skills',
  abilities: 'Abilities',
  gear: 'Gear',
  combat: 'Combat',
}

export const LIVE_SHEET_TAB_TITLES: Record<LiveSheetTabId, string> = {
  stats: 'Attributes & movement',
  saves: 'Saving throws',
  skills: 'Skills',
  abilities: 'Magic, psionics & talents',
  gear: 'Armory & inventory',
  combat: 'Combat HUD',
}

export function isLiveSheetTabId(id: string): id is LiveSheetTabId {
  return (LIVE_SHEET_TAB_ORDER as readonly string[]).includes(id)
}

/** Forge-style pills for the live sheet (no Continue / progression frontier). */
export function buildLiveSheetTabViews(activeTabId: LiveSheetTabId): ForgeTabView[] {
  return LIVE_SHEET_TAB_ORDER.map((id) => ({
    id,
    label: LIVE_SHEET_TAB_LABELS[id],
    visual: id === activeTabId ? 'active' : 'available',
    clickable: true,
    blockers: [],
    isViewing: id === activeTabId,
  }))
}
