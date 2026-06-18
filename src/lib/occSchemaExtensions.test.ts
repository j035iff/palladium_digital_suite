import { describe, expect, it } from 'vitest'
import {
  alignmentSatisfiesRestrictions,
  formatAlignmentRestrictionReason,
} from './occAlignmentGate'
import { occLevelGatedSaveBonus } from './creationOccBonuses'
import { assessRelatedSkillCategoryMinimumBlockers } from './occRelatedSkillMinimums'
import {
  mergeOccGrantedAbilities,
  occSupernaturalGrantedAbilityIds,
} from './occSupernaturalGrants'
import { listOccHandToHandOptions } from './creationHandToHandChoice'
import { countSelectedAbilitiesByBudgetCategory } from './creationAbilityBudget'
import type { PalladiumOcc } from '../types'

const mysticPattern: PalladiumOcc = {
  id: 'occ_test_mystic_pattern',
  name: 'Test Mystic Pattern',
  description: 'Pattern row for schema extension tests',
  gameSystems: ['nightbane'],
  sources: [{ gameSystem: 'nightbane', reference: 'Test', pageNumber: 1 }],
  occType: 'magic_user',
  tags: ['test'],
  occSkillsCore: [],
  occRelatedSkills: {
    initialSlotsCount: 10,
    categoryRules: [],
    categoryMinimums: [
      { categoryName: 'Science', minimumCount: 2, label: 'Science (two required)' },
    ],
  },
  secondarySkills: { initialSlotsCount: 6, forbiddenCategories: [] },
  wpRules: { coreWps: [], forbiddenWps: [] },
  handToHandRules: {
    defaultSkillId: 'hth_none',
    upgradePaths: [
      {
        targetSkillId: 'hth_assassin',
        electiveSlotCost: 3,
        alignmentRestrictions: { allowed: ['Miscreant', 'Aberrant', 'Diabolic'] },
      },
    ],
  },
  staticBonuses: {
    saves: { save_magic: 1 },
    levelGatedSaves: {
      save_magic: { '3': 1, '6': 1, '9': 1, '12': 1 },
    },
  },
  ispEngine: {
    baseFormula: '1D4*10+ME',
    perLevelFormula: '1D6+1',
    savingThrowClass: 'major',
    grantedAbilityIds: ['psionic_clairvoyance', 'psionic_exorcism'],
    progressionRoadmap: [{ level: 1, selectionsGained: 5 }],
  },
  ppeEngine: {
    baseFormula: '1D6*10+PE',
    perLevelFormula: '2D6',
    spellAcquisition: 'roadmap_only',
    progressionRoadmap: [{ level: 1, selectionsGained: 6 }],
    magicSchools: ['wizard'],
  },
}

describe('occSupernaturalGrants', () => {
  it('collects granted ids from ppe and isp engines', () => {
    expect(occSupernaturalGrantedAbilityIds(mysticPattern)).toEqual([
      'psionic_clairvoyance',
      'psionic_exorcism',
    ])
  })

  it('merges granted ids ahead of player picks without duplication', () => {
    expect(
      mergeOccGrantedAbilities(
        ['magic_fireball', 'psionic_clairvoyance'],
        ['psionic_clairvoyance', 'psionic_exorcism'],
      ),
    ).toEqual(['psionic_clairvoyance', 'psionic_exorcism', 'magic_fireball'])
  })
})

describe('creationAbilityBudget granted exclusion', () => {
  it('does not count auto-granted abilities toward pick budget', () => {
    const counts = countSelectedAbilitiesByBudgetCategory(
      ['psionic_clairvoyance', 'psionic_exorcism', 'psionic_empathy'],
      ['psionic_clairvoyance', 'psionic_exorcism'],
    )
    expect(counts.psionic).toBe(1)
  })
})

describe('occLevelGatedSaveBonus', () => {
  it('sums milestones at or below character level', () => {
    expect(occLevelGatedSaveBonus(mysticPattern, 'save_magic', 1)).toBe(0)
    expect(occLevelGatedSaveBonus(mysticPattern, 'save_magic', 3)).toBe(1)
    expect(occLevelGatedSaveBonus(mysticPattern, 'save_magic', 12)).toBe(4)
  })
})

describe('assessRelatedSkillCategoryMinimumBlockers', () => {
  it('reports shortfall when Science minimum is unmet', () => {
    const blockers = assessRelatedSkillCategoryMinimumBlockers(mysticPattern, [
      { instanceId: 'skill_biology', skillId: 'skill_biology' },
    ])
    expect(blockers.length).toBe(1)
    expect(blockers[0]).toMatch(/Science/)
  })
})

describe('hand-to-hand alignment gate', () => {
  it('disables assassin for non-evil alignments', () => {
    const good = listOccHandToHandOptions(mysticPattern, 'Principled')
    const assassinGood = good.find((o) => o.tier === 'assassin')
    expect(assassinGood?.disabled).toBe(true)
    expect(assassinGood?.disabledReason).toMatch(/Evil|Miscreant|Aberrant|Diabolic/)

    const evil = listOccHandToHandOptions(mysticPattern, 'Diabolic')
    const assassinEvil = evil.find((o) => o.tier === 'assassin')
    expect(assassinEvil?.disabled).toBe(false)
  })
})

describe('alignmentSatisfiesRestrictions', () => {
  it('honors allowed and forbidden lists', () => {
    expect(
      alignmentSatisfiesRestrictions('Diabolic', {
        allowed: ['Miscreant', 'Aberrant', 'Diabolic'],
      }),
    ).toBe(true)
    expect(
      alignmentSatisfiesRestrictions('Principled', {
        allowed: ['Miscreant', 'Aberrant', 'Diabolic'],
      }),
    ).toBe(false)
    expect(formatAlignmentRestrictionReason({ allowed: ['Diabolic'] })).toMatch(/Diabolic/)
  })
})
