import { describe, expect, it } from 'vitest'
import {
  buildMorphusSelectedTraitsPanelSections,
  defaultMorphusTraitPanelPlaceholderBoxes,
  morphusSlotPlanPanelBoxes,
} from './morphusSelectedTraitsPanel'
import { MORPHUS_APPEARANCE_ROUTING_TABLE } from '../data/library/morphusForgeRoutingLoader'

describe('morphusSelectedTraitsPanel', () => {
  it('shows nothing until a crossroads path is chosen', () => {
    expect(buildMorphusSelectedTraitsPanelSections({}, undefined)).toEqual([])
  })

  it('shows only Appearance Archetype placeholders for Path 1 without an archetype', () => {
    const sections = buildMorphusSelectedTraitsPanelSections({ path: 'appearance' }, undefined)
    expect(sections).toHaveLength(1)
    expect(sections[0]?.title).toBe('Appearance Archetype')
    expect(sections[0]?.boxes.map((box) => box.title)).toEqual(['Trait Table 1', 'Trait Table 2'])
    expect(defaultMorphusTraitPanelPlaceholderBoxes()).toHaveLength(2)
  })

  it('shows only Personality Traits for Path 2 before the count is entered', () => {
    const sections = buildMorphusSelectedTraitsPanelSections(
      { path: 'characteristics' },
      undefined,
    )
    expect(sections).toHaveLength(1)
    expect(sections[0]?.title).toBe('Personality Traits')
    expect(sections[0]?.boxes.map((box) => box.title)).toEqual(['1D4+2 Characteristics'])
  })

  it('expands Dimensional Traveler slot plan into labeled boxes', () => {
    const entry = MORPHUS_APPEARANCE_ROUTING_TABLE.entries.find(
      (row) => row.id === 'dimensional_traveler',
    )!
    const boxes = morphusSlotPlanPanelBoxes(entry.slotPlan)
    expect(boxes).toHaveLength(3)
    expect(boxes[0]?.title).toBe('Biomechanical')
    expect(boxes[1]?.title).toBe('Fantasy OR Sci-Fi')
    expect(boxes[2]?.title).toBe('1D4 of')
    expect(boxes[2]?.bulletDetails).toEqual([
      'Animal Form',
      'Extraterrestrial',
      'Characteristics',
      'Stigmata',
      'Undead',
    ])

    const sections = buildMorphusSelectedTraitsPanelSections(
      { path: 'appearance', appearanceEntryId: 'dimensional_traveler' },
      undefined,
    )
    expect(sections).toHaveLength(1)
    const appearance = sections[0]!
    expect(appearance.path).toBe('appearance')
    expect(appearance.subtitle).toBe('Dimensional Traveler')
    expect(appearance.boxes.map((box) => box.title)).toEqual([
      'Biomechanical',
      'Fantasy OR Sci-Fi',
      '1D4 of',
    ])
    expect(appearance.boxes[2]?.bulletDetails).toEqual(boxes[2]?.bulletDetails)
  })

  it('lists characteristic slots after Path 2 count is entered', () => {
    const sections = buildMorphusSelectedTraitsPanelSections(
      { path: 'characteristics', characteristicsPickCount: 4 },
      undefined,
    )
    expect(sections).toHaveLength(1)
    const personality = sections[0]!
    expect(personality.path).toBe('characteristics')
    expect(personality.boxes).toHaveLength(4)
    expect(personality.characteristicTrees).toHaveLength(4)
    expect(personality.boxes.map((box) => box.title)).toEqual([
      'Characteristic 1',
      'Characteristic 2',
      'Characteristic 3',
      'Characteristic 4',
    ])
  })

  it('builds nested characteristic pick trees for sidebar display', () => {
    const sections = buildMorphusSelectedTraitsPanelSections(
      { path: 'characteristics', characteristicsPickCount: 1 },
      {
        routingPicks: { 'plan:0': 'misshapen' },
        branchTableIds: { 'plan:0/plan:0': 'unnatural_limbs' },
        picks: { 'plan:0/plan:0/branch': 'unnatural_limbs_2d4_pairs_of_tiny_arms_and_hands' },
      },
    )
    const tree = sections[0]?.characteristicTrees[0]
    expect(tree?.entries.map((entry) => entry.name)).toEqual([
      'Misshapen',
      'Unnatural Limbs',
      '2D4 Pairs of Tiny Arms and Hands',
    ])
    expect(tree?.entries[0]?.depth).toBe(0)
    expect(tree?.entries[1]?.depth).toBe(1)
    expect(tree?.entries[2]?.depth).toBe(2)
  })
})
