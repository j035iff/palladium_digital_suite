import { describe, expect, it } from 'vitest'
import { createBlankCharacterForGenre } from './characterRoot'
import { liveCombatPassiveKeyAttribution } from './liveCombatAttribution'
import {
  buildLiveCombatContext,
  resolveLiveCombatStatDetails,
} from './liveStatEngine'

describe('liveCombatPassiveKeyAttribution', () => {
  it('lists per-source lines for morphus initiative attribution', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const attribution = liveCombatPassiveKeyAttribution(
      character,
      'morphus',
      'initiative',
      { supportsDualForm: true },
    )
    expect(attribution.every((line) => line.label !== 'Passive initiative')).toBe(true)
  })
})

describe('resolveLiveCombatStatDetails initiative breakdown', () => {
  it('does not use a lump Passive initiative line', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const ctx = buildLiveCombatContext(character, 'primary', {
      supportsDualForm: true,
    })
    const initiative = resolveLiveCombatStatDetails(ctx, 'initiative')
    expect(initiative.lines.some((line) => line.label === 'Passive initiative')).toBe(
      false,
    )
    expect(initiative.lines.some((line) => line.label === 'Features')).toBe(false)
  })

  it('names morphus traits that grant initiative on the live stack', () => {
    let character = createBlankCharacterForGenre('nightbane')
    character = {
      ...character,
      lineage: 'nightbane',
      activeMorphusCharacteristicIds: ['animal_insectoid_giant_insect'],
    }
    const ctx = buildLiveCombatContext(character, 'morphus', {
      supportsDualForm: true,
    })
    const initiative = resolveLiveCombatStatDetails(ctx, 'initiative')
    const traitLine = initiative.lines.find((line) => line.label === 'Giant Insect')
    expect(traitLine?.amount).toBe(3)
    expect(initiative.lines.some((line) => line.label === 'Passive initiative')).toBe(
      false,
    )
  })
})
