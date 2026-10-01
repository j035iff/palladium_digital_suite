import { describe, expect, it } from 'vitest'
import {
  applyHubNavTarget,
  hubFocusAfterNavChange,
  hubNavTargetForContentKind,
} from './hubNavigation'

describe('hubNavigation', () => {
  const base = {
    hubMode: 'combat' as const,
    hubTabId: 'melee' as const,
    charactersSubTabId: 'pcs' as const,
    thingsSubTabId: 'notes' as const,
    peopleShowPersonStubs: false,
    hubFocus: null,
  }

  it('routes NPC/PC to Narrative People (never stays on Combat)', () => {
    const npc = applyHubNavTarget(
      base,
      hubNavTargetForContentKind('npc', 'npc_1'),
    )
    expect(npc).toMatchObject({
      hubMode: 'story',
      hubTabId: 'people',
      charactersSubTabId: 'npcs',
      peopleShowPersonStubs: false,
      hubFocus: { kind: 'npc', id: 'npc_1' },
    })

    const pc = applyHubNavTarget(
      base,
      hubNavTargetForContentKind('pc', 'pc_1'),
    )
    expect(pc).toMatchObject({
      hubMode: 'story',
      hubTabId: 'people',
      charactersSubTabId: 'pcs',
    })
  })

  it('routes place/thing/note to Narrative lane tabs', () => {
    const place = applyHubNavTarget(
      base,
      hubNavTargetForContentKind('place', 'place_1'),
    )
    expect(place).toMatchObject({
      hubMode: 'story',
      hubTabId: 'places',
      hubFocus: { kind: 'place', id: 'place_1' },
    })

    const thing = applyHubNavTarget(
      base,
      hubNavTargetForContentKind('thing', 'thing_1'),
    )
    expect(thing).toMatchObject({
      hubMode: 'story',
      hubTabId: 'things',
      thingsSubTabId: 'notes',
    })

    const note = applyHubNavTarget(
      base,
      hubNavTargetForContentKind('note', 'note_1'),
    )
    expect(note).toMatchObject({
      hubMode: 'story',
      hubTabId: 'notes',
    })
  })

  it('routes person stubs to Narrative People stub lane', () => {
    const person = applyHubNavTarget(
      base,
      hubNavTargetForContentKind('person', 'person_1'),
    )
    expect(person).toMatchObject({
      hubMode: 'story',
      hubTabId: 'people',
      peopleShowPersonStubs: true,
      hubFocus: { kind: 'person', id: 'person_1' },
    })
  })

  it('clears focus when leaving the focused surface', () => {
    const focus = { kind: 'place' as const, id: 'place_1' }
    expect(
      hubFocusAfterNavChange(focus, {
        hubMode: 'story',
        hubTabId: 'places',
        charactersSubTabId: 'pcs',
        thingsSubTabId: 'notes',
        peopleShowPersonStubs: false,
      }),
    ).toEqual(focus)
    expect(
      hubFocusAfterNavChange(focus, {
        hubMode: 'story',
        hubTabId: 'notes',
        charactersSubTabId: 'pcs',
        thingsSubTabId: 'notes',
        peopleShowPersonStubs: false,
      }),
    ).toBeNull()
  })
})
