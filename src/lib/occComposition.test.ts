import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import { resolveEffectivePalladiumOcc } from './occComposition'

const baseOcc = {
  id: 'occ_test_parent',
  name: 'Test Parent',
  description: 'Parent row',
  gameSystems: ['nightbane'],
  sources: [{ gameSystem: 'nightbane', reference: 'Test', pageNumber: 1 }],
  occType: 'civilian',
  tags: [],
  occSkillsCore: [{ skillId: 'skill_math_basic', bonusPercent: 0 }],
  occRelatedSkills: {
    initialSlotsCount: 4,
    categoryRules: [
      { categoryName: 'Domestic', accessType: 'any', bonusPercent: 0 },
      { categoryName: 'Rogue', accessType: 'none', bonusPercent: 0 },
    ],
  },
  secondarySkills: { initialSlotsCount: 2, forbiddenCategories: [] },
  levelUpSkillChoices: [{ levelUnlocked: 3, quantity: 1, poolSource: 'related' }],
  wpRules: { coreWps: [], forbiddenWps: [] },
  handToHandRules: {
    defaultSkillId: 'hth_none',
    upgradePaths: [{ targetSkillId: 'hth_basic', electiveSlotCost: 1 }],
  },
} as PalladiumOcc

describe('resolveEffectivePalladiumOcc', () => {
  it('replaces occSkillsCore when specialization supplies a non-empty core package', () => {
    const occ: PalladiumOcc = {
      ...baseOcc,
      specializations: [
        {
          id: 'branch_a',
          name: 'Branch A',
          description: '01-10% — Branch',
          occSkillsCore: [{ skillId: 'skill_streetwise', bonusPercent: 30 }],
        },
      ],
    }
    const effective = resolveEffectivePalladiumOcc(occ, 'branch_a')
    expect(effective.occSkillsCore).toEqual([
      { skillId: 'skill_streetwise', bonusPercent: 30 },
    ])
  })

  it('replaces related skills when replaceBaseline is true', () => {
    const occ: PalladiumOcc = {
      ...baseOcc,
      specializations: [
        {
          id: 'branch_b',
          name: 'Branch B',
          description: '11-20% — Branch',
          occRelatedSkills: {
            replaceBaseline: true,
            initialSlotsCount: 8,
            categoryRules: [
              { categoryName: 'Rogue', accessType: 'any', bonusPercent: 10 },
            ],
          },
        },
      ],
    }
    const effective = resolveEffectivePalladiumOcc(occ, 'branch_b')
    expect(effective.occRelatedSkills.initialSlotsCount).toBe(8)
    expect(effective.occRelatedSkills.categoryRules).toHaveLength(1)
    expect(effective.occRelatedSkills.categoryRules[0]?.categoryName).toBe('Rogue')
  })

  it('replaces secondarySkills and levelUpSkillChoices from specialization', () => {
    const occ: PalladiumOcc = {
      ...baseOcc,
      specializations: [
        {
          id: 'branch_c',
          name: 'Branch C',
          description: '21-25% — Branch',
          secondarySkills: { initialSlotsCount: 5, forbiddenCategories: [] },
          levelUpSkillChoices: [
            { levelUnlocked: 4, quantity: 2, poolSource: 'secondary' },
          ],
        },
      ],
    }
    const effective = resolveEffectivePalladiumOcc(occ, 'branch_c')
    expect(effective.secondarySkills.initialSlotsCount).toBe(5)
    expect(effective.levelUpSkillChoices).toEqual([
      { levelUnlocked: 4, quantity: 2, poolSource: 'secondary' },
    ])
  })
})
