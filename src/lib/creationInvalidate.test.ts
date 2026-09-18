import { describe, expect, it } from 'vitest'
import { createBlankCharacterForGenre } from './characterRoot'
import {
  characterHasMorphusSettingsDefined,
  clearMorphusCreationStatePatch,
  creationInvalidationPatch,
} from './creationInvalidate'

describe('creationInvalidate Morphus wipe', () => {
  it('detects defined Morphus settings', () => {
    const blank = createBlankCharacterForGenre('nightbane')
    expect(characterHasMorphusSettingsDefined(blank)).toBe(false)
    expect(
      characterHasMorphusSettingsDefined({
        ...blank,
        morphusForgeState: { path: 'characteristics', characteristicsPickCount: 4 },
      }),
    ).toBe(true)
    expect(
      characterHasMorphusSettingsDefined({
        ...blank,
        morphusForgeSlotState: { picks: { 'plan:0': 'x' } },
      }),
    ).toBe(true)
  })

  it('wipes Morphus forge + slot state on race invalidation only', () => {
    const withMorphus = {
      ...createBlankCharacterForGenre('nightbane'),
      morphusForgeState: {
        path: 'appearance' as const,
        appearanceEntryId: 'amalgam',
      },
      morphusForgeSlotState: { picks: { 'plan:0': 'animal_canine_router' } },
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'animal_canine_wolf' },
      ],
      activeMorphusCharacteristicIds: ['animal_canine_wolf'],
      creationTraitForgeStubComplete: true,
      creationMorphusDiceFinalized: true,
      creationForgeCompleted: {
        tab1_configurator: true as const,
        tab6_traits: true as const,
      },
    }

    const racePatch = creationInvalidationPatch(withMorphus, 'race')
    expect(racePatch.morphusForgeState).toBeUndefined()
    expect(racePatch.morphusForgeSlotState).toEqual({})
    expect(racePatch.morphusTraitSlotResolutions).toEqual([])
    expect(racePatch.activeMorphusCharacteristicIds).toEqual([])
    expect(racePatch.creationTraitForgeStubComplete).toBe(false)
    expect(racePatch.creationMorphusDiceFinalized).toBe(false)
    expect(racePatch.creationForgeCompleted?.tab6_traits).toBeUndefined()

    const occPatch = creationInvalidationPatch(withMorphus, 'occ')
    expect(occPatch.morphusForgeState).toBeUndefined()
    expect(occPatch.morphusForgeSlotState).toBeUndefined()
    expect(occPatch.morphusTraitSlotResolutions).toBeUndefined()
    expect(occPatch.creationTraitForgeStubComplete).toBeUndefined()
    expect(occPatch.creationForgeCompleted?.tab6_traits).toBeUndefined()
  })

  it('clearMorphusCreationStatePatch clears slot hole fields', () => {
    const patch = clearMorphusCreationStatePatch()
    expect(patch.morphusForgeSlotState).toEqual({})
    expect(patch.morphusTraitSlotResolutions).toEqual([])
    expect(patch.activeMorphusCharacteristicIds).toEqual([])
  })
})
