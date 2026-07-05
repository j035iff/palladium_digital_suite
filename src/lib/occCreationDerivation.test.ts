import { describe, expect, it } from 'vitest'
import { getFeatureById, getLibraryOccById } from '../data/library/registry'
import type { PalladiumOcc } from '../types'
import {
  abilityPassesOccSupernaturalRules,
  isOccRelatedSkillAllowed,
  occRelatedSkillAllowedInCategory,
} from './occCreationDerivation'

const occWithPhysicalExcept = {
  id: 'occ_test',
  name: 'Test',
  description: '',
  gameSystems: ['nightbane'],
  sources: [],
  tags: [],
  occType: 'scholar_civilian',
  occSkillsCore: [],
  occRelatedSkills: {
    initialSlotsCount: 4,
    categoryRules: [
      {
        categoryName: 'Physical',
        accessType: 'except',
        exceptions: ['acrobatics', 'boxing', 'wrestling'],
        bonusPercent: 0,
      },
      {
        categoryName: 'Espionage',
        accessType: 'none',
        bonusPercent: 0,
      },
    ],
  },
  secondarySkills: { initialSlotsCount: 4, forbiddenCategories: [] },
  wpRules: { coreWps: [], forbiddenWps: [] },
  handToHandRules: { defaultSkillId: null, upgradePaths: [] },
  staticBonuses: {},
  attributeRequirements: {},
  finances: {},
  startingEquipment: {},
} as unknown as PalladiumOcc

describe('occRelatedSkillAllowedInCategory', () => {
  it('blocks except-list skills using short exception ids', () => {
    expect(
      occRelatedSkillAllowedInCategory(
        occWithPhysicalExcept,
        'skill_acrobatics',
        'Physical',
      ),
    ).toBe(false)
    expect(
      occRelatedSkillAllowedInCategory(
        occWithPhysicalExcept,
        'skill_boxing',
        'Physical',
      ),
    ).toBe(false)
  })

  it('allows non-except physical skills', () => {
    expect(
      occRelatedSkillAllowedInCategory(
        occWithPhysicalExcept,
        'skill_body_building_weight_lifting',
        'Physical',
      ),
    ).toBe(true)
  })
})

describe('isOccRelatedSkillAllowed activeFilterCategory', () => {
  it('applies only the active browse category rule', () => {
    expect(
      isOccRelatedSkillAllowed(
        occWithPhysicalExcept,
        'skill_pick_locks',
        undefined,
        null,
        'Espionage',
      ),
    ).toBe(false)
    expect(
      isOccRelatedSkillAllowed(
        occWithPhysicalExcept,
        'skill_pick_locks',
        undefined,
        null,
        'Rogue',
      ),
    ).toBe(true)
  })

  it('without a filter allows when any book category permits', () => {
    expect(
      isOccRelatedSkillAllowed(
        occWithPhysicalExcept,
        'skill_pick_locks',
      ),
    ).toBe(true)
  })
})

describe('abilityPassesOccSupernaturalRules psionic categories', () => {
  const pabPsychicAgent = getLibraryOccById('occ_pab_psychic_agent')

  it('blocks super psionics for P.A.B. Psychic Agent at 1st level', () => {
    expect(pabPsychicAgent).toBeDefined()
    const superPower = getFeatureById('psionic_astral_transference')
    expect(superPower).toBeDefined()
    const gate = abilityPassesOccSupernaturalRules(
      pabPsychicAgent!,
      superPower!,
      4,
      'nightbane',
    )
    expect(gate.allowed).toBe(false)
    expect(gate.reason).toMatch(/permits/i)
  })

  it('allows sensitive psionics for P.A.B. Psychic Agent', () => {
    const sensitive = getFeatureById('psionic_astral_projection')
    expect(sensitive).toBeDefined()
    const gate = abilityPassesOccSupernaturalRules(
      pabPsychicAgent!,
      sensitive!,
      4,
      'nightbane',
    )
    expect(gate.allowed).toBe(true)
  })
})

describe('isOccRelatedSkillAllowed — forbidden weapon proficiencies', () => {
  it('blocks military W.P.s on civilian Nightbane packages', () => {
    const occ = getLibraryOccById('occ_nightbane_basic')
    expect(occ).toBeDefined()
    expect(
      isOccRelatedSkillAllowed(
        occ!,
        'wp_automatic_and_semiautomatic_rifles',
        'WP: Modern',
      ),
    ).toBe(false)
    expect(
      isOccRelatedSkillAllowed(occ!, 'wp_heavy', 'WP: Modern'),
    ).toBe(false)
    expect(
      isOccRelatedSkillAllowed(occ!, 'wp_revolver', 'WP: Modern'),
    ).toBe(true)
  })
})
