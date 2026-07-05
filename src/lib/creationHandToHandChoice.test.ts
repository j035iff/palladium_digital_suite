import { describe, expect, it } from 'vitest'

import type { PalladiumOcc } from '../types'

import { characterFixture } from '../data/characterFixture'

import {

  canAffordHandToHandTier,
  creationHandToHandTierFromSkillId,

  creationHandToHandElectiveSlotCost,

  creationHandToHandMeetsMinimumTier,
  creationHandToHandReservedRelatedSlots,

  effectiveCreationHandToHandTier,

  listOccHandToHandOptions,

  occStartingHandToHandTier,

} from './creationHandToHandChoice'

import { resolveEffectivePalladiumOcc } from './occComposition'



const exGovernmentOcc = {

  handToHandRules: {

    defaultSkillId: 'hth_basic',

    upgradePaths: [

      { targetSkillId: 'hth_expert', electiveSlotCost: 2 },

      { targetSkillId: 'hth_martial_arts', electiveSlotCost: 3 },

      { targetSkillId: 'hth_assassin', electiveSlotCost: 3 },

    ],

  },

} as unknown as PalladiumOcc



const pandoraOcc = {

  handToHandRules: {

    defaultSkillId: 'hth_none',

    upgradePaths: [

      { targetSkillId: 'hth_basic', electiveSlotCost: 1 },

      { targetSkillId: 'hth_expert', electiveSlotCost: 2 },

    ],

  },

} as unknown as PalladiumOcc



describe('creationHandToHandChoice', () => {

  it('resolves hth_* catalog ids to creation tiers', () => {
    expect(creationHandToHandTierFromSkillId('hth_basic')).toBe('basic')
    expect(creationHandToHandTierFromSkillId('hth_expert')).toBe('expert')
    expect(creationHandToHandTierFromSkillId('hth_martial_arts')).toBe('martial_arts')
    expect(creationHandToHandTierFromSkillId('hth_assassin')).toBe('assassin')
    expect(creationHandToHandTierFromSkillId('hth_none')).toBe('none')
  })

  it('defaults to O.C.C. granted Hand-to-Hand tier', () => {

    expect(occStartingHandToHandTier(exGovernmentOcc)).toBe('basic')

    expect(occStartingHandToHandTier(pandoraOcc)).toBe('none')

  })



  it('bootstraps mandatory paid Hand-to-Hand when only one upgrade path exists', () => {

    const assassinSpec = {

      handToHandRules: {

        defaultSkillId: null,

        upgradePaths: [

          { targetSkillId: 'hth_assassin', electiveSlotCost: 2 },

        ],

      },

    } as unknown as PalladiumOcc

    expect(occStartingHandToHandTier(assassinSpec)).toBe('assassin')

    expect(creationHandToHandElectiveSlotCost(assassinSpec, 'assassin')).toBe(2)

    expect(effectiveCreationHandToHandTier({ primary: characterFixture.primary, creationHandToHandTier: 'none' }, assassinSpec)).toBe(
      'assassin',
    )
    expect(effectiveCreationHandToHandTier({ primary: characterFixture.primary }, assassinSpec)).toBe('assassin')
    expect(
      creationHandToHandReservedRelatedSlots(assassinSpec, { primary: characterFixture.primary, creationHandToHandTier: 'none' }),
    ).toBe(2)
    expect(creationHandToHandReservedRelatedSlots(assassinSpec, { primary: characterFixture.primary })).toBe(2)

  })



  it('lists default plus upgrade paths with slot costs', () => {

    const options = listOccHandToHandOptions(exGovernmentOcc)

    expect(options.map((o) => o.tier)).toEqual([

      'basic',

      'expert',

      'martial_arts',

      'assassin',

    ])

    expect(options[0].label).toContain('included')

    expect(options[1].electiveSlotCost).toBe(2)

    expect(options[2].electiveSlotCost).toBe(3)

  })



  it('charges elective slots only for upgrades above default', () => {

    expect(creationHandToHandElectiveSlotCost(exGovernmentOcc, 'basic')).toBe(0)

    expect(creationHandToHandElectiveSlotCost(exGovernmentOcc, 'expert')).toBe(2)

    expect(creationHandToHandElectiveSlotCost(pandoraOcc, 'basic')).toBe(1)

  })



  it('lists untrained None as an included option when upgrades are elective', () => {

    const options = listOccHandToHandOptions(pandoraOcc)

    expect(options.map((o) => o.tier)).toEqual(['none', 'basic', 'expert'])

    expect(options[0]?.label).toBe('None (included)')

  })



  it('respects related slot budget when reserving Hand-to-Hand cost', () => {

    expect(canAffordHandToHandTier(exGovernmentOcc, 'expert', 8, 7)).toBe(false)

    expect(canAffordHandToHandTier(exGovernmentOcc, 'expert', 8, 6)).toBe(true)

  })

  it('disables tiers below minimumCreationHandToHandTier on effective O.C.C.', () => {
    const adaBase = {
      specializations: [
        {
          id: 'occ_ada_assassin_specialist',
          name: 'Assassination Specialist',
          description: 'test',
          handToHandRules: {
            upgradePaths: [],
            minimumCreationHandToHandTier: 'expert',
          },
        },
      ],
      handToHandRules: {
        defaultSkillId: 'hth_basic',
        upgradePaths: [
          { targetSkillId: 'hth_expert', electiveSlotCost: 1 },
          { targetSkillId: 'hth_martial_arts', electiveSlotCost: 2 },
          { targetSkillId: 'hth_assassin', electiveSlotCost: 2 },
        ],
      },
    } as unknown as PalladiumOcc

    const effective = resolveEffectivePalladiumOcc(adaBase, 'occ_ada_assassin_specialist')

    const options = listOccHandToHandOptions(effective)
    const basic = options.find((o) => o.tier === 'basic')
    const expert = options.find((o) => o.tier === 'expert')

    expect(basic?.disabled).toBe(true)
    expect(basic?.disabledReason).toMatch(/Expert or higher/)
    expect(expert?.disabled).toBe(false)
    expect(creationHandToHandMeetsMinimumTier(effective, 'basic')).toBe(false)
    expect(creationHandToHandMeetsMinimumTier(effective, 'expert')).toBe(true)
    expect(creationHandToHandMeetsMinimumTier(effective, 'assassin')).toBe(true)
    expect(effectiveCreationHandToHandTier({ primary: characterFixture.primary, creationHandToHandTier: 'basic' }, effective)).toBe(
      'basic',
    )
    expect(
      effectiveCreationHandToHandTier({ primary: characterFixture.primary, creationHandToHandTier: 'expert' }, effective),
    ).toBe('expert')
  })

})


