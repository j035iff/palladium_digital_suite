import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../../types'
import { listCharacterCreationTabRequirements } from './characterCreationTabRequirements'
import type { CharacterCreationForgeContext } from './characterCreationForge'

const pandoraOcc = {
  id: 'occ_pandora',
  handToHandRules: {
    defaultSkillId: 'hth_none',
    upgradePaths: [{ targetSkillId: 'hand_to_hand_basic', electiveSlotCost: 1 }],
  },
  occSkillsCore: [
    { choiceCount: 2, bonusPercent: 20, allowedCategories: ['Science'] },
  ],
  occRelatedSkills: { initialSlotsCount: 8, categoryRules: [] },
  secondarySkills: { initialSlotsCount: 4 },
} as unknown as PalladiumOcc

function ctx(
  overrides: Partial<CharacterCreationForgeContext['character']> = {},
): CharacterCreationForgeContext {
  return {
    character: {
      raceId: 'race_human',
      occ: { id: 'occ_pandora', xpTable: { floors: [0] } },
      creationPsychicTierChosen: false,
      creationOccCoreVoucherPicks: {},
      creationRelatedSkillPicks: [],
      creationSecondarySkillPicks: [],
      creationHandToHandTier: 'none',
      facade: { alignment: 'Principled' },
      ...overrides,
    } as CharacterCreationForgeContext['character'],
    race: {
      id: 'race_human',
      name: 'Human',
      gameSystems: ['nightbane'],
      canPickOcc: true,
      occLimitations: { forbiddenOccIds: [], forbiddenCategories: [] },
    } as CharacterCreationForgeContext['race'],
    occ: pandoraOcc,
    psychicTier: 'none',
    supportsDualForm: false,
  }
}

describe('listCharacterCreationTabRequirements', () => {
  it('tracks psychic gate requirement completion', () => {
    const pending = listCharacterCreationTabRequirements('tab3_psionic', ctx())
    expect(pending[0]?.satisfied).toBe(false)

    const done = listCharacterCreationTabRequirements(
      'tab3_psionic',
      ctx({ creationPsychicTierChosen: true }),
    )
    expect(done[0]?.satisfied).toBe(true)
  })

  it('skips psychic gate requirements for natural psychic O.C.C.s', () => {
    const psychicOcc = {
      ...pandoraOcc,
      id: 'occ_pab_psychic_agent',
      occType: 'psychic',
      ispEngine: { baseFormula: 'ME + 5D6', perLevelFormula: '2D4' },
    } as CharacterCreationForgeContext['occ']
    const requirements = listCharacterCreationTabRequirements('tab3_psionic', {
      ...ctx({ creationPsychicTierChosen: false }),
      occ: psychicOcc,
    })
    expect(requirements).toHaveLength(0)
  })

  it('lists skill tab requirements with live satisfaction state', () => {
    const requirements = listCharacterCreationTabRequirements('tab4_skills', ctx())
    expect(requirements.some((r) => r.id === 'occ-vouchers' && !r.satisfied)).toBe(
      true,
    )
    expect(requirements.some((r) => r.id === 'hand-to-hand')).toBe(false)
  })

  it('tab1 uses a single race/O.C.C. pair requirement without alignment', () => {
    const requirements = listCharacterCreationTabRequirements('tab1_configurator', ctx())
    expect(requirements).toHaveLength(1)
    expect(requirements[0]?.id).toBe('race-occ-pair')
    expect(requirements[0]?.label).toBe('Select a valid race and O.C.C. combination')
    expect(requirements[0]?.satisfied).toBe(true)
  })

  it('tab1 adds specialization requirement when O.C.C. has branches', () => {
    const branchedOcc = {
      ...pandoraOcc,
      specializations: [{ id: 'spec_a', name: 'Branch A' }],
    } as PalladiumOcc
    const requirements = listCharacterCreationTabRequirements('tab1_configurator', {
      ...ctx(),
      occ: branchedOcc,
    })
    expect(requirements.map((r) => r.id)).toEqual(['race-occ-pair', 'occ-spec'])
    expect(requirements[1]?.satisfied).toBe(false)
  })
})
