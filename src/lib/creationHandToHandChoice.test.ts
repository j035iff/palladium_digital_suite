import { describe, expect, it } from 'vitest'

import type { PalladiumOcc } from '../types'

import {

  assessHandToHandBlockers,

  canAffordHandToHandTier,

  creationHandToHandElectiveSlotCost,

  listOccHandToHandOptions,

  occStartingHandToHandTier,

} from './creationHandToHandChoice'



const exGovernmentOcc = {

  handToHandRules: {

    defaultSkillId: 'hand_to_hand_basic',

    upgradePaths: [

      { targetSkillId: 'hand_to_hand_expert', electiveSlotCost: 2 },

      { targetSkillId: 'hand_to_hand_martial_arts', electiveSlotCost: 3 },

      { targetSkillId: 'hand_to_hand_assassin', electiveSlotCost: 3 },

    ],

  },

} as PalladiumOcc



const pandoraOcc = {

  handToHandRules: {

    defaultSkillId: null,

    upgradePaths: [

      { targetSkillId: 'hand_to_hand_basic', electiveSlotCost: 1 },

      { targetSkillId: 'hand_to_hand_expert', electiveSlotCost: 2 },

    ],

  },

} as PalladiumOcc



describe('creationHandToHandChoice', () => {

  it('defaults to O.C.C. granted Hand-to-Hand tier', () => {

    expect(occStartingHandToHandTier(exGovernmentOcc)).toBe('basic')

    expect(occStartingHandToHandTier(pandoraOcc)).toBe('none')

  })



  it('bootstraps mandatory paid Hand-to-Hand when only one upgrade path exists', () => {

    const assassinSpec = {

      handToHandRules: {

        defaultSkillId: null,

        upgradePaths: [

          { targetSkillId: 'hand_to_hand_assassin', electiveSlotCost: 2 },

        ],

      },

    } as PalladiumOcc

    expect(occStartingHandToHandTier(assassinSpec)).toBe('assassin')

    expect(creationHandToHandElectiveSlotCost(assassinSpec, 'assassin')).toBe(2)

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



  it('blocks when purchasable Hand-to-Hand is unselected', () => {

    expect(assessHandToHandBlockers(pandoraOcc, 'none')).toEqual([

      'Select a Hand-to-Hand fighting style.',

    ])

  })



  it('respects related slot budget when reserving Hand-to-Hand cost', () => {

    expect(canAffordHandToHandTier(exGovernmentOcc, 'expert', 8, 7)).toBe(false)

    expect(canAffordHandToHandTier(exGovernmentOcc, 'expert', 8, 6)).toBe(true)

    expect(

      assessHandToHandBlockers(exGovernmentOcc, 'expert', 8, 7).length,

    ).toBeGreaterThan(0)

  })

})


