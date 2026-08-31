import type { ForgeTabView } from '../forgeNavigation/types'

/** Same Story / Combat split as the live character sheet. */
export type GmHubMode = 'story' | 'combat'

/** Shared sub-tabs under both hub modes (sheet analogue: Home + Stats/Saves/…). */
export type GmHubTabId = 'home' | 'party' | 'cast'

export const GM_HUB_TAB_ORDER: readonly GmHubTabId[] = [
  'home',
  'party',
  'cast',
] as const

export const GM_HUB_TAB_LABELS: Record<GmHubTabId, string> = {
  home: 'Home',
  party: 'Party',
  cast: 'Cast',
}

const SHARED_TAB_TITLES: Record<Exclude<GmHubTabId, 'home'>, string> = {
  party: 'Party',
  cast: 'Cast',
}

export function gmHubTabTitle(mode: GmHubMode, tabId: GmHubTabId): string {
  if (tabId === 'home') {
    return mode === 'combat' ? 'Combat' : 'Sessions'
  }
  return SHARED_TAB_TITLES[tabId]
}

export function isGmHubTabId(id: string): id is GmHubTabId {
  return (GM_HUB_TAB_ORDER as readonly string[]).includes(id)
}

export function isGmHubMode(id: string): id is GmHubMode {
  return id === 'story' || id === 'combat'
}

export function buildGmHubTabViews(
  activeTabId: GmHubTabId,
  opts: { campaignOpen: boolean },
): ForgeTabView[] {
  return GM_HUB_TAB_ORDER.map((id) => {
    const locked = !opts.campaignOpen && id !== 'home'
    return {
      id,
      label: GM_HUB_TAB_LABELS[id],
      visual: locked ? 'locked' : id === activeTabId ? 'active' : 'available',
      clickable: !locked,
      blockers: locked ? ['Open a campaign from the launcher first'] : [],
      isViewing: id === activeTabId,
    }
  })
}
