import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../../types'
import { createBlankCharacterForGenre } from '../characterRoot'
import { getRaceById, getLibraryOccById } from '../../data/library/registry'
import { creationNeedsAbilitySelection } from '../creationPhases'
import { resolveEffectiveCreationAbilityBudget } from '../creationAbilityBudget'
import {
  buildCharacterCreationForgeContext,
  deriveCharacterCreationForgeNavigation,
} from './characterCreationForge'
import { listCharacterCreationTabRequirements } from './characterCreationTabRequirements'
import type { CharacterCreationForgeContext } from './characterCreationForge'

const pandoraOcc = {
  id: 'occ_pandora',
  handToHandRules: {
    defaultSkillId: 'hth_none',
    upgradePaths: [{ targetSkillId: 'hth_basic', electiveSlotCost: 1 }],
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
      creationGenreId: 'rifts',
      hostGenreId: 'rifts',
      occ: { id: 'occ_pandora', xpTable: { floors: [0] } },
      creationPsychicTierChosen: false,
      creationOccCoreVoucherPicks: {},
      creationRelatedSkillPicks: [],
      creationSecondarySkillPicks: [],
      creationHandToHandTier: 'none',
      primary: { alignment: 'Principled' },
      ...overrides,
    } as CharacterCreationForgeContext['character'],
    race: getRaceById('race_human', 'rifts'),
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
    } as unknown as PalladiumOcc
    const requirements = listCharacterCreationTabRequirements('tab1_configurator', {
      ...ctx(),
      occ: branchedOcc,
    })
    expect(requirements.map((r) => r.id)).toEqual(['race-occ-pair', 'occ-spec'])
    expect(requirements[1]?.satisfied).toBe(false)
  })

  it('tab7 requires Nightbane R.C.C. 1st-level talent for basic O.C.C.', () => {
    const race = getRaceById('race_nightbane')
    const occ = getLibraryOccById('occ_nightbane_basic')
    expect(race).toBeDefined()
    expect(occ).toBeDefined()

    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'race_nightbane',
      occ: { id: occ!.id, name: occ!.name, category: occ!.occType },
      creationGenreId: 'nightbane' as const,
    } as unknown as Parameters<typeof buildCharacterCreationForgeContext>[0]
    const forgeCtx = buildCharacterCreationForgeContext(
      character,
      race,
      occ,
      'none',
    )
    const budget = resolveEffectiveCreationAbilityBudget({
      occ,
      raceId: 'race_nightbane',
      psychicTier: 'none',
      creationGenreId: 'nightbane',
    })
    expect(creationNeedsAbilitySelection(budget, 'nightbane')).toBe(true)

    const requirements = listCharacterCreationTabRequirements(
      'tab7_abilities',
      forgeCtx,
    )
    expect(requirements.some((r) => r.id === 'ability-talents' && !r.satisfied)).toBe(
      true,
    )

    const nav = deriveCharacterCreationForgeNavigation(forgeCtx, 'tab7_abilities')
    const abilitiesTab = nav.tabs.find((t) => t.id === 'tab7_abilities')
    expect(abilitiesTab?.visual).not.toBe('na')
  })
})
