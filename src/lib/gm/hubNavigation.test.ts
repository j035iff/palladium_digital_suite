import { describe, expect, it } from 'vitest'
import {
  applyHubNavTarget,
  hubFocusAfterNavChange,
  hubNavTargetForContentKind,
} from './hubNavigation'

describe('hubNavigation', () => {
  const base = {
    hubMode: 'combat' as const,
    hubTabId: 'gear' as const,
    charactersSubTabId: 'pcs' as const,
    storyHomeSubTabId: 'notes' as const,
    hubFocus: null,
  }

  it('routes NPC/PC to shared Characters without flipping mode', () => {
    const npc = applyHubNavTarget(
      base,
      hubNavTargetForContentKind('npc', 'npc_1'),
    )
    expect(npc).toMatchObject({
      hubMode: 'combat',
      hubTabId: 'characters',
      charactersSubTabId: 'npcs',
      hubFocus: { kind: 'npc', id: 'npc_1' },
    })

    const pc = applyHubNavTarget(
      base,
      hubNavTargetForContentKind('pc', 'pc_1'),
    )
    expect(pc).toMatchObject({
      hubMode: 'combat',
      hubTabId: 'characters',
      charactersSubTabId: 'pcs',
    })
  })

  it('routes person/place/thing/note to Narrative Home', () => {
    const place = applyHubNavTarget(
      base,
      hubNavTargetForContentKind('place', 'place_1'),
    )
    expect(place).toMatchObject({
      hubMode: 'story',
      hubTabId: 'home',
      storyHomeSubTabId: 'places',
      hubFocus: { kind: 'place', id: 'place_1' },
    })
  })

  it('clears focus when leaving the focused surface', () => {
    const focus = { kind: 'place' as const, id: 'place_1' }
    expect(
      hubFocusAfterNavChange(focus, {
        hubMode: 'story',
        hubTabId: 'home',
        charactersSubTabId: 'pcs',
        storyHomeSubTabId: 'places',
      }),
    ).toEqual(focus)
    expect(
      hubFocusAfterNavChange(focus, {
        hubMode: 'story',
        hubTabId: 'home',
        charactersSubTabId: 'pcs',
        storyHomeSubTabId: 'notes',
      }),
    ).toBeNull()
  })
})
