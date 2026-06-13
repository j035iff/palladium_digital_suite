import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import {
  assessOccEnginePsionicBlockers,
  occCreationPsionicSlotBudget,
  sumCreationSelectionPlanPicks,
  supernaturalSelectionModeRequiredPicks,
} from './occSupernaturalSelection'
import { occRelatedSkillSelectionSlotCost } from './occRelatedSkillSlotCosts'
import { creationSkillPickSlotWeight } from './creationSkillPicks'

const psychicOcc = {
  id: 'test_psychic',
  ispEngine: {
    baseFormula: 'ME+1D4*10',
    perLevelFormula: '10',
    savingThrowClass: 'master',
    progressionRoadmap: [],
    creationSelectionPlan: [
      {
        selectionsGained: 6,
        selectionMode: {
          kind: 'per_category',
          buckets: { sensitive: 2, physical: 2, healer: 2 },
        },
      },
    ],
    perLevelSelection: {
      fromLevel: 2,
      selectionsGained: 1,
      selectionMode: {
        kind: 'pool',
        selections: 1,
        categories: ['sensitive', 'physical', 'healer'],
      },
    },
  },
} as PalladiumOcc

describe('occSupernaturalSelection', () => {
  it('sums per_category creation plan picks', () => {
    const plan = psychicOcc.ispEngine!.creationSelectionPlan!
    expect(sumCreationSelectionPlanPicks(plan)).toBe(6)
    expect(occCreationPsionicSlotBudget(psychicOcc)).toBe(6)
  })

  it('counts pool mode selections', () => {
    expect(
      supernaturalSelectionModeRequiredPicks({
        kind: 'pool',
        selections: 6,
        categories: ['sensitive', 'physical', 'healer'],
      }),
    ).toBe(6)
  })

  it('reports blockers until per-category buckets are filled', () => {
    expect(
      assessOccEnginePsionicBlockers({
        occ: psychicOcc,
        selectedIds: [],
        genreId: 'nightbane',
      }).length,
    ).toBe(1)
  })
})

describe('occRelatedSkillSlotCosts', () => {
  const occ = {
    occRelatedSkills: {
      initialSlotsCount: 10,
      categoryRules: [
        {
          categoryName: 'Medical',
          accessType: 'any',
          bonusPercent: 0,
          selectionSlotCost: 2,
          skillSpecificSelectionSlotCosts: {
            skill_first_aid: 1,
          },
        },
      ],
    },
  } as PalladiumOcc

  it('applies category selectionSlotCost', () => {
    expect(occRelatedSkillSelectionSlotCost(occ, 'skill_surgery')).toBe(2)
    expect(occRelatedSkillSelectionSlotCost(occ, 'skill_first_aid')).toBe(1)
  })

  it('folds selection slot cost into pick weight', () => {
    expect(
      creationSkillPickSlotWeight(
        { instanceId: 'a', skillId: 'skill_surgery' },
        { occ },
      ),
    ).toBe(2)
  })
})
