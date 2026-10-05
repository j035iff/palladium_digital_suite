/**
 * Shared Hub navigation targets for Notes content links (Pillar 9).
 * People is Narrative-only — never open People from Combat (Joe 2026-10-01).
 * Melee selects from the same People data via dropdowns; no Combat People tab.
 */

import type { GmContentLinkKind } from './contentLinks'
import type {
  GmCharactersSubTabId,
  GmHubMode,
  GmHubTabId,
  GmThingsSubTabId,
} from './hubTabs'

export type GmHubFocus = {
  kind: GmContentLinkKind
  id: string
}

export type GmHubNavTarget =
  | {
      surface: 'people'
      sub: GmCharactersSubTabId
      focus?: GmHubFocus
    }
  | {
      surface: 'places'
      focus?: GmHubFocus
    }
  | {
      surface: 'things'
      /** Default notes stub; gear when granting from a future link. */
      sub?: GmThingsSubTabId
      focus?: GmHubFocus
    }
  | {
      surface: 'notes'
      focus?: GmHubFocus
    }
  | {
      surface: 'story_beats'
      focus?: GmHubFocus
    }
  | {
      /** Person stubs — notes-page list (Radical Visibility for [[person:…]]). */
      surface: 'person_stubs'
      focus?: GmHubFocus
    }

export type GmHubNavState = {
  hubMode: GmHubMode
  hubTabId: GmHubTabId
  charactersSubTabId: GmCharactersSubTabId
  thingsSubTabId: GmThingsSubTabId
  /** When true, People shows person stub lane instead of PCs/NPCs. */
  peopleShowPersonStubs: boolean
  hubFocus: GmHubFocus | null
}

/** Map a content-link kind to the Hub surface that owns that stub. */
export function hubNavTargetForContentKind(
  kind: GmContentLinkKind,
  id: string,
): GmHubNavTarget {
  switch (kind) {
    case 'npc':
      return {
        surface: 'people',
        sub: 'npcs',
        focus: { kind, id },
      }
    case 'pc':
      return {
        surface: 'people',
        sub: 'pcs',
        focus: { kind, id },
      }
    case 'person':
      return {
        surface: 'person_stubs',
        focus: { kind, id },
      }
    case 'place':
      return {
        surface: 'places',
        focus: { kind, id },
      }
    case 'thing':
      return {
        surface: 'things',
        sub: 'notes',
        focus: { kind, id },
      }
    case 'note':
      return {
        surface: 'notes',
        focus: { kind, id },
      }
  }
}

/**
 * Pure next-nav state for a target.
 * People / person stubs / narrative entities always force Narrative —
 * never leave the GM on Combat while opening People.
 */
export function applyHubNavTarget(
  current: GmHubNavState,
  target: GmHubNavTarget,
): GmHubNavState {
  if (target.surface === 'people') {
    return {
      ...current,
      hubMode: 'story',
      hubTabId: 'people',
      charactersSubTabId: target.sub,
      peopleShowPersonStubs: false,
      hubFocus: target.focus ?? null,
    }
  }
  if (target.surface === 'person_stubs') {
    return {
      ...current,
      hubMode: 'story',
      hubTabId: 'people',
      peopleShowPersonStubs: true,
      hubFocus: target.focus ?? null,
    }
  }
  if (target.surface === 'places') {
    return {
      ...current,
      hubMode: 'story',
      hubTabId: 'places',
      peopleShowPersonStubs: false,
      hubFocus: target.focus ?? null,
    }
  }
  if (target.surface === 'things') {
    return {
      ...current,
      hubMode: 'story',
      hubTabId: 'things',
      thingsSubTabId: target.sub ?? 'notes',
      peopleShowPersonStubs: false,
      hubFocus: target.focus ?? null,
    }
  }
  if (target.surface === 'notes') {
    return {
      ...current,
      hubMode: 'story',
      hubTabId: 'notes',
      peopleShowPersonStubs: false,
      hubFocus: target.focus ?? null,
    }
  }
  return {
    ...current,
    hubMode: 'story',
    hubTabId: 'story_beats',
    peopleShowPersonStubs: false,
    hubFocus: target.focus ?? null,
  }
}

/** Clear focus when the GM leaves the focused surface. */
export function hubFocusAfterNavChange(
  focus: GmHubFocus | null,
  next: Omit<GmHubNavState, 'hubFocus'>,
): GmHubFocus | null {
  if (!focus) return null
  const target = hubNavTargetForContentKind(focus.kind, focus.id)
  if (target.surface === 'people') {
    if (
      next.hubMode === 'story' &&
      next.hubTabId === 'people' &&
      !next.peopleShowPersonStubs &&
      next.charactersSubTabId === target.sub
    ) {
      return focus
    }
    return null
  }
  if (target.surface === 'person_stubs') {
    if (
      next.hubMode === 'story' &&
      next.hubTabId === 'people' &&
      next.peopleShowPersonStubs
    ) {
      return focus
    }
    return null
  }
  if (target.surface === 'places') {
    if (next.hubMode === 'story' && next.hubTabId === 'places') return focus
    return null
  }
  if (target.surface === 'things') {
    if (
      next.hubMode === 'story' &&
      next.hubTabId === 'things' &&
      next.thingsSubTabId === (target.sub ?? 'notes')
    ) {
      return focus
    }
    return null
  }
  if (target.surface === 'notes') {
    if (next.hubMode === 'story' && next.hubTabId === 'notes') return focus
    return null
  }
  if (next.hubMode === 'story' && next.hubTabId === 'story_beats') return focus
  return null
}

export function isHubFocusMatch(
  focus: GmHubFocus | null,
  kind: GmContentLinkKind,
  id: string,
): boolean {
  return focus != null && focus.kind === kind && focus.id === id
}
