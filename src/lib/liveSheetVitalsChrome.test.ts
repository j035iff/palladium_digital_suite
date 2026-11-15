import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import {
  formatLiveSheetVitalsChipParts,
  resolveLiveSheetVitalsChromeFlags,
} from './liveSheetVitalsChrome'

function occ(partial: Partial<PalladiumOcc> & Pick<PalladiumOcc, 'id' | 'name'>): PalladiumOcc {
  return {
    description: '',
    gameSystems: ['nightbane'],
    sources: [],
    occType: 'standard',
    tags: [],
    occSkillsCore: [],
    occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
    secondarySkills: { initialSlotsCount: 0, forbiddenCategories: [] },
    wpRules: { coreWps: [], forbiddenWps: [] },
    handToHandRules: { defaultSkillId: 'hth_basic', upgradePaths: [] },
    ...partial,
  } as PalladiumOcc
}

describe('liveSheetVitalsChrome', () => {
  it('hides PPE/ISP when character cannot use magic/talents/psionics', () => {
    const flags = resolveLiveSheetVitalsChromeFlags({
      race: undefined,
      occ: occ({ id: 'occ_soldier', name: 'Soldier' }),
      abilityBudget: { spellSlots: 0, psionicSlots: 0, talentSlots: 0 },
    })
    expect(flags).toEqual({ showPpe: false, showIsp: false })
  })

  it('shows PPE for magic or talents; ISP for psionics', () => {
    expect(
      resolveLiveSheetVitalsChromeFlags({
        race: undefined,
        occ: occ({
          id: 'occ_sorcerer',
          name: 'Sorcerer',
          ppeEngine: {
            baseFormula: '2D4×10+10',
            perLevelFormula: '2D4×10',
            selectionBudget: 6,
            progressionRoadmap: [],
          } as never,
        }),
      }).showPpe,
    ).toBe(true)

    expect(
      resolveLiveSheetVitalsChromeFlags({
        race: undefined,
        occ: occ({ id: 'occ_x', name: 'X' }),
        abilityBudget: { spellSlots: 0, psionicSlots: 0, talentSlots: 2 },
      }).showPpe,
    ).toBe(true)

    expect(
      resolveLiveSheetVitalsChromeFlags({
        race: undefined,
        occ: occ({
          id: 'occ_psychic',
          name: 'Psychic',
          ispEngine: {
            baseFormula: '1D6×10+10',
            perLevelFormula: '1D6×10',
            savingThrowClass: 'major',
            selectionBudget: 4,
            progressionRoadmap: [],
          } as never,
        }),
      }).showIsp,
    ).toBe(true)
  })

  it('orders chip parts SDC → HP → PPE → ISP', () => {
    expect(
      formatLiveSheetVitalsChipParts({
        sdcCurrent: 63,
        sdcMax: 63,
        hpCurrent: 15,
        hpMax: 15,
        ppeCurrent: 40,
        ppeMax: 40,
        ispCurrent: 10,
        ispMax: 10,
        showPpe: true,
        showIsp: true,
      }),
    ).toEqual(['SDC 63/63', 'HP 15/15', 'PPE 40/40', 'ISP 10/10'])
  })
})
