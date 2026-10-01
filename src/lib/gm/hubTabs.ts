import type { ForgeTabView } from '../forgeNavigation/types'

/** Same Narrative / Combat split as the live character sheet (`hubMode: 'story'` stays internal). */
export type GmHubMode = 'story' | 'combat'

/** Shared top tabs under both hub modes (sheet analogue: Home + …). */
export type GmHubTabId = 'home' | 'characters' | 'gear'

/** Characters sub-tabs — PCs = joined seats only; NPCs = local-machine + fodder (Pillar 9). */
export type GmCharactersSubTabId = 'pcs' | 'npcs'

/** Narrative Home sub-tabs (Combat Home stays the combat HUD — no fork). */
export type GmStoryHomeSubTabId = 'people' | 'places' | 'things' | 'notes'

export const GM_HUB_TAB_ORDER: readonly GmHubTabId[] = [
  'home',
  'characters',
  'gear',
] as const

export const GM_HUB_TAB_LABELS: Record<GmHubTabId, string> = {
  home: 'Home',
  characters: 'Characters',
  gear: 'Gear',
}

/** User-visible mode chrome — internal id `story` displays as Narrative. */
export const GM_HUB_MODE_LABELS: Record<GmHubMode, string> = {
  story: 'Narrative',
  combat: 'Combat',
}

export const GM_CHARACTERS_SUB_TAB_ORDER: readonly GmCharactersSubTabId[] = [
  'pcs',
  'npcs',
] as const

export const GM_CHARACTERS_SUB_TAB_LABELS: Record<
  GmCharactersSubTabId,
  string
> = {
  pcs: 'PCs',
  npcs: 'NPCs',
}

export const GM_STORY_HOME_SUB_TAB_ORDER: readonly GmStoryHomeSubTabId[] = [
  'people',
  'places',
  'things',
  'notes',
] as const

export const GM_STORY_HOME_SUB_TAB_LABELS: Record<
  GmStoryHomeSubTabId,
  string
> = {
  people: 'People',
  places: 'Places',
  things: 'Things',
  notes: 'Notes',
}

/**
 * People / Places / Things / Notes are live placeholder lanes (Notes also has
 * the campaign scratchpad). No “not in this build” grey-out — Radical Visibility
 * applies to broken content links instead.
 */
export function gmStoryHomeStubReason(_subTabId: GmStoryHomeSubTabId): string {
  return ''
}

/** True when Narrative Home → Notes scratchpad surface is on screen. */
export function isViewingStoryHomeNotes(
  hubMode: GmHubMode,
  hubTabId: GmHubTabId,
  storyHomeSubTabId: GmStoryHomeSubTabId,
): boolean {
  return (
    hubMode === 'story' &&
    hubTabId === 'home' &&
    storyHomeSubTabId === 'notes'
  )
}

const SHARED_TAB_TITLES: Record<Exclude<GmHubTabId, 'home'>, string> = {
  characters: 'Characters',
  gear: 'Gear',
}

export function gmHubModeLabel(mode: GmHubMode): string {
  return GM_HUB_MODE_LABELS[mode]
}

export function gmHubTabTitle(mode: GmHubMode, tabId: GmHubTabId): string {
  if (tabId === 'home') {
    return mode === 'combat' ? 'Combat' : 'Narrative'
  }
  return SHARED_TAB_TITLES[tabId]
}

export function isGmHubTabId(id: string): id is GmHubTabId {
  return (GM_HUB_TAB_ORDER as readonly string[]).includes(id)
}

export function isGmCharactersSubTabId(
  id: string,
): id is GmCharactersSubTabId {
  return (GM_CHARACTERS_SUB_TAB_ORDER as readonly string[]).includes(id)
}

export function isGmStoryHomeSubTabId(
  id: string,
): id is GmStoryHomeSubTabId {
  return (GM_STORY_HOME_SUB_TAB_ORDER as readonly string[]).includes(id)
}

export function isGmHubMode(id: string): id is GmHubMode {
  return id === 'story' || id === 'combat'
}

/** True when the joined-PC summary (Characters → PCs) is on screen. */
export function isViewingCharactersPcs(
  hubTabId: GmHubTabId,
  charactersSubTabId: GmCharactersSubTabId,
): boolean {
  return hubTabId === 'characters' && charactersSubTabId === 'pcs'
}

export function buildGmHubTabViews(
  activeTabId: GmHubTabId,
  opts: { campaignOpen: boolean; partyTabBlink?: boolean },
): ForgeTabView[] {
  return GM_HUB_TAB_ORDER.map((id) => {
    const locked = !opts.campaignOpen && id !== 'home'
    const blinking = Boolean(opts.partyTabBlink) && !locked
    return {
      id,
      label: GM_HUB_TAB_LABELS[id],
      visual: locked ? 'locked' : id === activeTabId ? 'active' : 'available',
      clickable: !locked,
      blockers: locked ? ['Open a campaign from the launcher first'] : [],
      isViewing: id === activeTabId,
      // Blink is tab chrome only; Characters → PCs stays on the shared observer path.
      // When already on Characters, cue moves to the PCs sub-tab (see buildGmCharactersSubTabViews).
      attention:
        id === 'characters' && blinking && activeTabId !== 'characters',
    }
  })
}

export function buildGmCharactersSubTabViews(
  activeId: GmCharactersSubTabId,
  opts: { partyTabBlink?: boolean } = {},
): ForgeTabView[] {
  const blinking = Boolean(opts.partyTabBlink)
  return GM_CHARACTERS_SUB_TAB_ORDER.map((id) => ({
    id,
    label: GM_CHARACTERS_SUB_TAB_LABELS[id],
    visual: id === activeId ? 'active' : 'available',
    clickable: true,
    blockers: [],
    isViewing: id === activeId,
    attention: id === 'pcs' && blinking && activeId !== 'pcs',
  }))
}

export function buildGmStoryHomeSubTabViews(
  activeId: GmStoryHomeSubTabId,
): ForgeTabView[] {
  return GM_STORY_HOME_SUB_TAB_ORDER.map((id) => {
    const stubReason = gmStoryHomeStubReason(id)
    return {
      id,
      label: GM_STORY_HOME_SUB_TAB_LABELS[id],
      visual: id === activeId ? 'active' : 'available',
      clickable: true,
      blockers: stubReason ? [stubReason] : [],
      isViewing: id === activeId,
    }
  })
}
