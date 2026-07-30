import { describe, expect, it } from 'vitest'
import { createBlankCharacterForGenre } from './characterRoot'
import { effectiveStructuralPool } from './effectiveVitality'
import { buildMorphusPassiveBundle } from './morphusPassiveBridge'
import {
  morphusCreationPreviewResolveOptions,
  polymorphicDeltaFromBase,
} from './morphusPolymorphicResolver'

describe('Morphus S.D.C. display stability', () => {
  it('never auto-rolls dice after Trait Forge finalize (Pillar 5)', () => {
    const deltas = Array.from({ length: 12 }, () =>
      polymorphicDeltaFromBase(
        100,
        [{ dice: '4D6x10' }],
        morphusCreationPreviewResolveOptions(true),
      ),
    )
    expect(new Set(deltas)).toEqual(new Set([0]))
  })

  it('does not re-apply baked Morphus S.D.C. trait bonuses after vitality commit', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      isFinalized: true,
      creationVitalityCommitted: true,
      creationTraitForgeStubComplete: true,
      morphusTraitSlotResolutions: [
        { slotId: 'plan:0', catalogEntryId: 'mineral_1_living_statue' },
      ],
      morphus: {
        ...createBlankCharacterForGenre('nightbane').morphus,
        structuralDamageCapacity: {
          current: 180,
          maximum: 180,
          scaling: 'sdc_hp' as const,
        },
      },
    }

    const samples = Array.from({ length: 8 }, () => {
      const bundle = buildMorphusPassiveBundle(character, 'morphus')
      const pool = effectiveStructuralPool(
        character,
        'morphus',
        character.morphus.structuralDamageCapacity,
      )
      return {
        passiveSdc: bundle?.modifiers.sdc ?? 0,
        displayed: pool.maximum,
      }
    })

    for (const sample of samples) {
      expect(sample.passiveSdc).toBe(0)
      expect(sample.displayed).toBe(180)
    }
  })
})
