import type { ForgeTabView } from '../forgeNavigation/types'

/** Same Narrative / Combat split as the live character sheet (`hubMode: 'story'` stays internal). */
export type GmHubMode = 'story' | 'combat'

/** Narrative lane top tabs. */
export type GmStoryTabId =
  | 'story_beats'
  | 'people'
  | 'places'
  | 'things'
  | 'notes'

/** Combat lane top tabs — no People; Melee selects from People data via dropdowns. */
export type GmCombatTabId = 'melee' | 'prefabs'

/** Any hub top-tab id (lane-specific orders below). */
export type GmHubTabId = GmStoryTabId | GmCombatTabId

/** People sub-tabs — PCs = joined seats only; NPCs = local-machine + fodder (Pillar 9). */
export type GmCharactersSubTabId = 'pcs' | 'npcs'

/** Things sub-tabs — notes stub + Gear panel (moved from top-level Gear). */
export type GmThingsSubTabId = 'notes' | 'gear'

export const GM_STORY_TAB_ORDER: readonly GmStoryTabId[] = [
  'story_beats',
  'people',
  'places',
  'things',
  'notes',
] as const

export const GM_COMBAT_TAB_ORDER: readonly GmCombatTabId[] = [
  'melee',
  'prefabs',
] as const

export const GM_STORY_TAB_LABELS: Record<GmStoryTabId, string> = {
  story_beats: 'Story Beats',
  people: 'People',
  places: 'Places',
  things: 'Things',
  notes: 'Notes',
}

export const GM_COMBAT_TAB_LABELS: Record<GmCombatTabId, string> = {
  melee: 'Melee',
  prefabs: 'Prefabs',
}

/** Union of all tab ids (for type guards). */
export const GM_HUB_TAB_ORDER: readonly GmHubTabId[] = [
  ...GM_STORY_TAB_ORDER,
  ...GM_COMBAT_TAB_ORDER,
] as const

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

export const GM_THINGS_SUB_TAB_ORDER: readonly GmThingsSubTabId[] = [
  'notes',
  'gear',
] as const

export const GM_THINGS_SUB_TAB_LABELS: Record<GmThingsSubTabId, string> = {
  notes: 'Notes',
  gear: 'Gear',
}

/** Default top tab when switching into a mode (or opening a campaign). */
export function defaultHubTabForMode(mode: GmHubMode): GmHubTabId {
  return mode === 'combat' ? 'melee' : 'story_beats'
}

export function hubTabOrderForMode(
  mode: GmHubMode,
): readonly GmHubTabId[] {
  return mode === 'combat' ? GM_COMBAT_TAB_ORDER : GM_STORY_TAB_ORDER
}

export function hubTabLabel(mode: GmHubMode, tabId: GmHubTabId): string {
  if (mode === 'combat') {
    if ((GM_COMBAT_TAB_ORDER as readonly string[]).includes(tabId)) {
      return GM_COMBAT_TAB_LABELS[tabId as GmCombatTabId]
    }
  } else if ((GM_STORY_TAB_ORDER as readonly string[]).includes(tabId)) {
    return GM_STORY_TAB_LABELS[tabId as GmStoryTabId]
  }
  if (tabId === 'people') return 'People'
  if (tabId === 'melee') return 'Melee'
  if (tabId === 'prefabs') return 'Prefabs'
  if (tabId === 'story_beats') return 'Story Beats'
  if (tabId === 'places') return 'Places'
  if (tabId === 'things') return 'Things'
  if (tabId === 'notes') return 'Notes'
  return tabId
}

export function gmHubModeLabel(mode: GmHubMode): string {
  return GM_HUB_MODE_LABELS[mode]
}

export function gmHubTabTitle(mode: GmHubMode, tabId: GmHubTabId): string {
  return hubTabLabel(mode, tabId)
}

export function isGmHubTabId(id: string): id is GmHubTabId {
  return (GM_HUB_TAB_ORDER as readonly string[]).includes(id)
}

export function isGmHubTabIdForMode(
  mode: GmHubMode,
  id: string,
): id is GmHubTabId {
  return (hubTabOrderForMode(mode) as readonly string[]).includes(id)
}

export function isGmCharactersSubTabId(
  id: string,
): id is GmCharactersSubTabId {
  return (GM_CHARACTERS_SUB_TAB_ORDER as readonly string[]).includes(id)
}

export function isGmThingsSubTabId(id: string): id is GmThingsSubTabId {
  return (GM_THINGS_SUB_TAB_ORDER as readonly string[]).includes(id)
}

export function isGmHubMode(id: string): id is GmHubMode {
  return id === 'story' || id === 'combat'
}

/** True when Narrative → Notes scratchpad surface is on screen. */
export function isViewingNotes(
  hubMode: GmHubMode,
  hubTabId: GmHubTabId,
): boolean {
  return hubMode === 'story' && hubTabId === 'notes'
}

/** @deprecated Use isViewingNotes — Home sub-tabs removed. */
export function isViewingStoryHomeNotes(
  hubMode: GmHubMode,
  hubTabId: GmHubTabId,
  _storyHomeSubTabId?: string,
): boolean {
  return isViewingNotes(hubMode, hubTabId)
}

/** True when the joined-PC summary (Narrative → People → PCs) is on screen. */
export function isViewingCharactersPcs(
  hubTabId: GmHubTabId,
  charactersSubTabId: GmCharactersSubTabId,
): boolean {
  return hubTabId === 'people' && charactersSubTabId === 'pcs'
}

/** Join-blink clear target: Narrative → People → PCs. */
export function isViewingNarrativePeoplePcs(
  hubMode: GmHubMode,
  hubTabId: GmHubTabId,
  charactersSubTabId: GmCharactersSubTabId,
): boolean {
  return (
    hubMode === 'story' &&
    isViewingCharactersPcs(hubTabId, charactersSubTabId)
  )
}

export function buildGmHubTabViews(
  mode: GmHubMode,
  activeTabId: GmHubTabId,
  opts: { campaignOpen: boolean; partyTabBlink?: boolean },
): ForgeTabView[] {
  const order = hubTabOrderForMode(mode)
  return order.map((id) => {
    const locked = !opts.campaignOpen && id !== defaultHubTabForMode(mode)
    const blinking = Boolean(opts.partyTabBlink) && !locked
    return {
      id,
      label: hubTabLabel(mode, id),
      visual: locked ? 'locked' : id === activeTabId ? 'active' : 'available',
      clickable: !locked,
      blockers: locked ? ['Open a campaign from the launcher first'] : [],
      isViewing: id === activeTabId,
      // Blink is tab chrome only; People → PCs stays on the shared observer path.
      // Join cue targets Narrative → People (Combat has no People tab).
      attention:
        mode === 'story' &&
        id === 'people' &&
        blinking &&
        activeTabId !== 'people',
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

export function buildGmThingsSubTabViews(
  activeId: GmThingsSubTabId,
): ForgeTabView[] {
  return GM_THINGS_SUB_TAB_ORDER.map((id) => ({
    id,
    label: GM_THINGS_SUB_TAB_LABELS[id],
    visual: id === activeId ? 'active' : 'available',
    clickable: true,
    blockers: [],
    isViewing: id === activeId,
  }))
}
