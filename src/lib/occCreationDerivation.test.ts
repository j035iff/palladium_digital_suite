import { describe, expect, it } from 'vitest'
import { getFeatureById, getLibraryOccById } from '../data/library/registry'
import type { PalladiumOcc } from '../types'
import {
  abilityPassesOccSupernaturalRules,
  isOccRelatedSkillAllowed,
  occRelatedSkillAllowedInCategory,
} from './occCreationDerivation'

const occWithPhysicalExcept: PalladiumOcc = {
  id: 'occ_test',
  name: 'Test',
  description: '',
  gameSystems: ['nightbane'],
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
  secondarySkills: { initialSlotsCount: 4 },
  wpRules: { allowedCategories: [] },
  handToHandRules: {},
  staticBonuses: {},
  attributeRequirements: {},
  finances: {},
  startingEquipment: {},
}

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
