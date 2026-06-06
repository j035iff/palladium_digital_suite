import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import {
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
