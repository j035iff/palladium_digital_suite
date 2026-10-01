/**
 * Shared Hub navigation targets for Notes content links (Pillar 9).
 * Characters stays one pipeline under Narrative/Combat — never fork by mode.
 * Narrative entity kinds always open Narrative Home (not Combat HUD).
 */

import type { GmContentLinkKind } from './contentLinks'
import type {
  GmCharactersSubTabId,
  GmHubMode,
  GmHubTabId,
  GmStoryHomeSubTabId,
} from './hubTabs'

export type GmHubFocus = {
  kind: GmContentLinkKind
  id: string
}

export type GmHubNavTarget =
  | {
      surface: 'characters'
      sub: GmCharactersSubTabId
      focus?: GmHubFocus
    }
  | {
      surface: 'storyHome'
      sub: GmStoryHomeSubTabId
      focus?: GmHubFocus
    }

export type GmHubNavState = {
  hubMode: GmHubMode
  hubTabId: GmHubTabId
  charactersSubTabId: GmCharactersSubTabId
  storyHomeSubTabId: GmStoryHomeSubTabId
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
        surface: 'characters',
        sub: 'npcs',
        focus: { kind, id },
      }
    case 'pc':
      return {
        surface: 'characters',
        sub: 'pcs',
        focus: { kind, id },
      }
    case 'person':
      return {
        surface: 'storyHome',
        sub: 'people',
        focus: { kind, id },
      }
    case 'place':
      return {
        surface: 'storyHome',
        sub: 'places',
        focus: { kind, id },
      }
    case 'thing':
      return {
        surface: 'storyHome',
        sub: 'things',
        focus: { kind, id },
      }
    case 'note':
      return {
        surface: 'storyHome',
        sub: 'notes',
        focus: { kind, id },
      }
  }
}

/**
 * Pure next-nav state for a target.
 * Characters keeps the current hubMode (shared panel).
 * storyHome forces Narrative + Home.
 */
export function applyHubNavTarget(
  current: GmHubNavState,
  target: GmHubNavTarget,
): GmHubNavState {
  if (target.surface === 'characters') {
    return {
      ...current,
      hubTabId: 'characters',
      charactersSubTabId: target.sub,
      hubFocus: target.focus ?? null,
    }
  }
  return {
    ...current,
    hubMode: 'story',
    hubTabId: 'home',
    storyHomeSubTabId: target.sub,
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
  if (target.surface === 'characters') {
    if (
      next.hubTabId === 'characters' &&
      next.charactersSubTabId === target.sub
    ) {
      return focus
    }
    return null
  }
  if (
    next.hubMode === 'story' &&
    next.hubTabId === 'home' &&
    next.storyHomeSubTabId === target.sub
  ) {
    return focus
  }
  return null
}

export function isHubFocusMatch(
  focus: GmHubFocus | null,
  kind: GmContentLinkKind,
  id: string,
): boolean {
  return focus != null && focus.kind === kind && focus.id === id
}
