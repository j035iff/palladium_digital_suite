import type { ForgeTabView } from './forgeNavigation/types'

/**
 * Live sheet mode ids.
 * Chrome label for `story` is **Campaigns** (`LIVE_SHEET_MODE_LABELS`) — internal id
 * stays `story` so GM Hub / join docs that share the story|combat split stay aligned.
 */
export type LiveSheetMode = 'story' | 'combat'

/** Shared drill-down tabs opened as overlays over the active mode Home. */
export type LiveSheetOverlayTabId =
  | 'stats'
  | 'saves'
  | 'skills'
  | 'abilities'
  | 'gear'

/** Mode Home (`home`) + overlay tabs — one body pipeline (`LiveSheetTabBody`). */
export type LiveSheetTabId = 'home' | LiveSheetOverlayTabId

export const LIVE_SHEET_OVERLAY_TAB_ORDER: readonly LiveSheetOverlayTabId[] = [
  'stats',
  'saves',
  'skills',
  'abilities',
  'gear',
] as const

export const LIVE_SHEET_TAB_ORDER: readonly LiveSheetTabId[] = [
  'home',
  ...LIVE_SHEET_OVERLAY_TAB_ORDER,
] as const

export const LIVE_SHEET_MODE_LABELS: Record<LiveSheetMode, string> = {
  story: 'Campaigns',
  combat: 'Combat',
}

export const LIVE_SHEET_TAB_LABELS: Record<LiveSheetTabId, string> = {
  home: 'Home',
  stats: 'Stats',
  saves: 'Saves',
  skills: 'Skills',
  abilities: 'Abilities',
  gear: 'Gear',
}

const SHARED_TAB_TITLES: Record<LiveSheetOverlayTabId, string> = {
  stats: 'Attributes & movement',
  saves: 'Saving throws',
  skills: 'Skills',
  abilities: 'Magic, psionics & talents',
  gear: 'Weapons, armor & load',
}

export function liveSheetModeLabel(mode: LiveSheetMode): string {
  return LIVE_SHEET_MODE_LABELS[mode]
}

export function liveSheetTabTitle(
  mode: LiveSheetMode,
  tabId: LiveSheetTabId,
): string {
  if (tabId === 'home') {
    return mode === 'combat' ? 'Combat HUD' : 'Campaign notes'
  }
  return SHARED_TAB_TITLES[tabId]
}

export function isLiveSheetTabId(id: string): id is LiveSheetTabId {
  return (LIVE_SHEET_TAB_ORDER as readonly string[]).includes(id)
}

export function isLiveSheetOverlayTabId(id: string): id is LiveSheetOverlayTabId {
  return (LIVE_SHEET_OVERLAY_TAB_ORDER as readonly string[]).includes(id)
}

/**
 * Strip pills for Stats · Saves · Skills · Abilities · Gear.
 * No Home pill — mode Home is the Campaigns / Combat body under the mode switch.
 */
export function buildLiveSheetOverlayTabViews(
  activeOverlayTabId: LiveSheetOverlayTabId | null,
): ForgeTabView[] {
  return LIVE_SHEET_OVERLAY_TAB_ORDER.map((id) => ({
    id,
    label: LIVE_SHEET_TAB_LABELS[id],
    visual: id === activeOverlayTabId ? 'active' : 'available',
    clickable: true,
    blockers: [],
    isViewing: id === activeOverlayTabId,
  }))
}

/** @deprecated Prefer {@link buildLiveSheetOverlayTabViews} for the Persistent Core strip. */
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
