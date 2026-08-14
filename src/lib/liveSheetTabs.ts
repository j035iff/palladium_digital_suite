import type { ForgeTabView } from './forgeNavigation/types'

export type LiveSheetMode = 'story' | 'combat'

export type LiveSheetTabId =
  | 'home'
  | 'stats'
  | 'saves'
  | 'skills'
  | 'abilities'
  | 'gear'

export const LIVE_SHEET_TAB_ORDER: readonly LiveSheetTabId[] = [
  'home',
  'stats',
  'saves',
  'skills',
  'abilities',
  'gear',
] as const

export const LIVE_SHEET_TAB_LABELS: Record<LiveSheetTabId, string> = {
  home: 'Home',
  stats: 'Stats',
  saves: 'Saves',
  skills: 'Skills',
  abilities: 'Abilities',
  gear: 'Gear',
}

const SHARED_TAB_TITLES: Record<Exclude<LiveSheetTabId, 'home'>, string> = {
  stats: 'Attributes & movement',
  saves: 'Saving throws',
  skills: 'Skills',
  abilities: 'Magic, psionics & talents',
  gear: 'Armory & inventory',
}

export function liveSheetTabTitle(
  mode: LiveSheetMode,
  tabId: LiveSheetTabId,
): string {
  if (tabId === 'home') {
    return mode === 'combat' ? 'Combat HUD' : 'Story notes'
  }
  return SHARED_TAB_TITLES[tabId]
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
