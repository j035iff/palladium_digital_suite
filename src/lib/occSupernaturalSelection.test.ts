import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import {
  assessOccEnginePsionicBlockers,
  occCreationPsionicSlotBudget,
  occEnginePsionicPickAllowed,
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

  const grantedSensitive = [
    'psionic_see_aura',
    'psionic_sense_evil',
    'psionic_meditation',
    'psionic_presence_sense',
  ]

  it('excludes granted psionics from per-category pick budget', () => {
    const grantedIds = grantedSensitive
    const twoSensitivePicks = ['psionic_clairvoyance', 'psionic_telepathy']

    expect(
      occEnginePsionicPickAllowed({
        occ: psychicOcc,
        selectedIds: [...grantedIds, ...twoSensitivePicks],
        candidateId: 'psionic_telekinesis',
        genreId: 'nightbane',
        viewingCategory: 'physical',
        grantedIds,
      }),
    ).toEqual({ allowed: true })

    expect(
      occEnginePsionicPickAllowed({
        occ: psychicOcc,
        selectedIds: [...grantedIds, ...twoSensitivePicks],
        candidateId: 'psionic_clairvoyance',
        genreId: 'nightbane',
        viewingCategory: 'sensitive',
        grantedIds,
      }),
    ).toEqual({ allowed: true })
  })

  it('blocks a third pick in the same per-category bucket', () => {
    const grantedIds = grantedSensitive
    const threeSensitivePicks = [
      'psionic_clairvoyance',
      'psionic_telepathy',
      'psionic_see_the_invisible',
    ]

    expect(
      occEnginePsionicPickAllowed({
        occ: psychicOcc,
        selectedIds: [...grantedIds, ...threeSensitivePicks],
        candidateId: 'psionic_sense_magic',
        genreId: 'nightbane',
        viewingCategory: 'sensitive',
        grantedIds,
      }),
    ).toEqual({
      allowed: false,
      reason: 'Sensitive pick budget is full (2).',
    })
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
    expect(occRelatedSkillSelectionSlotCost(occ, 'skill_medical_doctor')).toBe(2)
    expect(occRelatedSkillSelectionSlotCost(occ, 'skill_first_aid')).toBe(1)
  })

  it('folds selection slot cost into pick weight', () => {
    expect(
      creationSkillPickSlotWeight(
        { instanceId: 'a', skillId: 'skill_medical_doctor' },
        { occ },
      ),
    ).toBe(2)
  })
})
