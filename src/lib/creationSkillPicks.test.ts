import { describe, expect, it } from 'vitest'

import {
  additionalSlotsForSkillAdd,
  buildCreationSkillPick,
  creationLibrarySkillAddState,
  creationSkillPickHasEditableSpecialization,
  creationSkillPickSlotWeight,
  downgradePickToStandard,
  findMatchingCreationSkillPick,
  isCreationSkillFullySelected,
  isCreationSkillIdentityTaken,
  formatCreationSkillPickLabel,
  getCreationRelatedPicks,
  resolveProfessionalPercentBonus,
  occGrantPickComplete,
  skillNeedsPickDialog,
  skillNeedsVoucherPickDialog,
  skillRequiresSpecialization,
  skillSupportsProfessionalQuality,
  sumCreationSkillPickSlots,
  sumOccCoreProfessionalRelatedSlotSurcharges,
  sumRelatedPoolSlotUsage,
  upgradePickToProfessional,
  validateSpecializationInput,
} from './creationSkillPicks'
import type { CreationSkillPick, PalladiumOcc } from '../types'
import { getSkillById } from '../data/skillLibrary'
import { getEngineSkillDefFromCatalog } from './creationSkillCatalog'
import type { CreationLibrarySkillContext } from './creationSkillPicks'

describe('creationSkillPicks', () => {
  it('migrates legacy string ids to picks', () => {
    const picks = getCreationRelatedPicks({
      creationRelatedSkillIds: ['skill_cook', 'skill_language'],
    })
    expect(picks).toHaveLength(2)
    expect(picks[0].skillId).toBe('skill_cook')
  })

  it('loads Literacy from catalog without hardcoded American suffix', () => {
    expect(getSkillById('skill_literacy')?.name).toBe('Literacy')
  })

  it('requires specialization for Language and Literacy', () => {
    expect(skillRequiresSpecialization('skill_language')).toBe(true)
    expect(skillRequiresSpecialization('skill_literacy')).toBe(true)
    expect(skillRequiresSpecialization('skill_play_musical_instrument')).toBe(true)
    expect(skillRequiresSpecialization('skill_cook')).toBe(false)
  })

  it('validates specialization min length', () => {
    expect(validateSpecializationInput('')).toBe(false)
    expect(validateSpecializationInput(' ')).toBe(false)
    expect(validateSpecializationInput('Guitar')).toBe(true)
  })

  it('counts professional picks as 2 slots', () => {
    const picks: CreationSkillPick[] = [
      { instanceId: 'a', skillId: 'skill_cook' },
      { instanceId: 'b', skillId: 'skill_cook', professionalQuality: true },
    ]
    expect(creationSkillPickSlotWeight(picks[0])).toBe(1)
    expect(creationSkillPickSlotWeight(picks[1])).toBe(2)
    expect(sumCreationSkillPickSlots(picks)).toBe(3)
  })

  it('formats parameterized professional labels', () => {
    const pick: CreationSkillPick = {
      instanceId: 'x',
      skillId: 'skill_play_musical_instrument',
      specialization: 'Guitar',
      professionalQuality: true,
    }
    expect(formatCreationSkillPickLabel(pick)).toBe(
      'Play Musical Instrument: Guitar (Professional Quality)',
    )
  })

  it('matches picks by skill and specialization', () => {
    const picks: CreationSkillPick[] = [
      {
        instanceId: '1',
        skillId: 'skill_language',
        specialization: 'Spanish',
      },
    ]
    expect(
      findMatchingCreationSkillPick(picks, 'skill_language', 'spanish')?.instanceId,
    ).toBe('1')
    expect(findMatchingCreationSkillPick(picks, 'skill_language', 'French')).toBeUndefined()
  })

  it('computes additional slots for add and upgrade', () => {
    const amateur: CreationSkillPick = { instanceId: 'a', skillId: 'skill_cook' }
    expect(additionalSlotsForSkillAdd(undefined, false)).toBe(1)
    expect(additionalSlotsForSkillAdd(undefined, true)).toBe(2)
    expect(additionalSlotsForSkillAdd(amateur, true)).toBe(1)
    expect(additionalSlotsForSkillAdd(amateur, false)).toBe(0)
  })

  it('detects professional quality support on Cook', () => {
    expect(skillSupportsProfessionalQuality('skill_cook')).toBe(true)
  })

  it('voucher parameterized picks require specialization text', () => {
    expect(skillNeedsVoucherPickDialog('skill_language')).toBe(true)
    expect(skillNeedsVoucherPickDialog('skill_literacy')).toBe(true)
    expect(
      occGrantPickComplete({ instanceId: 'a', skillId: 'skill_literacy' }),
    ).toBe(false)
    expect(
      occGrantPickComplete({
        instanceId: 'a',
        skillId: 'skill_literacy',
        specialization: 'English',
      }),
    ).toBe(true)
  })

  it('does not block parameterized occ picks from library selection', () => {
    const occPicks: CreationSkillPick[] = [
      { instanceId: 'v1', skillId: 'skill_language', specialization: 'Spanish' },
    ]
    expect(
      isCreationSkillFullySelected('skill_language', occPicks, [], []),
    ).toBe(false)
  })

  it('detects duplicate skill identity across grant and voucher', () => {
    const all: CreationSkillPick[] = [
      {
        instanceId: 'skill_literacy',
        skillId: 'skill_literacy',
        specialization: 'English',
      },
      {
        instanceId: 'v2',
        skillId: 'skill_literacy',
        specialization: 'English',
      },
    ]
    expect(
      isCreationSkillIdentityTaken(all, 'skill_literacy', 'English'),
    ).toBe(true)
    expect(
      isCreationSkillIdentityTaken(all, 'skill_literacy', 'French'),
    ).toBe(false)
  })

  it('only opens pick dialog when specialization or professional choice is needed', () => {
    expect(skillNeedsPickDialog('skill_vehicle_armorer', [])).toBe(false)
    expect(skillNeedsPickDialog('skill_language', [])).toBe(true)
    expect(skillNeedsPickDialog('skill_cook', [])).toBe(true)
    expect(
      skillNeedsPickDialog('skill_cook', [
        { instanceId: 'a', skillId: 'skill_cook', professionalQuality: true },
      ]),
    ).toBe(false)
  })

  it('applies domestic +10% for professional cook', () => {
    const pick = buildCreationSkillPick('skill_cook', { professionalQuality: true })
    expect(resolveProfessionalPercentBonus('skill_cook', pick)).toBe(10)
  })

  it('flags parameterized locked picks as editable', () => {
    const language = buildCreationSkillPick('skill_language', {
      specialization: 'Spanish',
    })
    const armorer = buildCreationSkillPick('skill_vehicle_armorer', {})
    expect(creationSkillPickHasEditableSpecialization(language)).toBe(true)
    expect(creationSkillPickHasEditableSpecialization(armorer)).toBe(false)
  })

  it('toggles professional quality slot weight', () => {
    const standard = buildCreationSkillPick('skill_cook', {})
    expect(creationSkillPickSlotWeight(standard)).toBe(1)
    const pro = upgradePickToProfessional(standard)
    expect(creationSkillPickSlotWeight(pro)).toBe(2)
    const back = downgradePickToStandard(pro)
    expect(creationSkillPickSlotWeight(back)).toBe(1)
    expect(back.professionalQuality).toBeUndefined()
  })

  it('charges occ core professional upgrades against the related pool', () => {
    const related = [buildCreationSkillPick('skill_detect_concealment', {})]
    const occCore = [
      { instanceId: 'skill_cook', skillId: 'skill_cook', professionalQuality: true },
    ]
    expect(sumOccCoreProfessionalRelatedSlotSurcharges(occCore)).toBe(1)
    expect(sumRelatedPoolSlotUsage(related, occCore, 0)).toBe(2)
    expect(sumRelatedPoolSlotUsage(related, occCore, 2)).toBe(4)
  })

  it('allows related but not secondary for allowedAsSecondarySkill false catalog rows', () => {
    const boxing = getEngineSkillDefFromCatalog('skill_boxing')!
    const occPhysicalAny = {
      id: 'occ_test_physical',
      occRelatedSkills: {
        initialSlotsCount: 4,
        categoryRules: [
          { categoryName: 'Physical', accessType: 'any', bonusPercent: 0 },
        ],
      },
      secondarySkills: { initialSlotsCount: 4 },
    } as PalladiumOcc
    const ctx: CreationLibrarySkillContext = {
      effectiveOcc: occPhysicalAny,
      specializationId: null,
      relatedSlotsUsed: 0,
      relatedSkillCap: 4,
      secondaryPickSlots: 0,
      secondaryCap: 4,
      occPicks: [],
      relatedPicks: [],
      secondaryPicks: [],
      activeFilterCategory: 'Physical',
    }
    const state = creationLibrarySkillAddState(boxing, ctx)
    expect(state.canAddRelated).toBe(true)
    expect(state.canAddSecondary).toBe(false)
  })

  it('counts hand-to-hand upgrade cost only in pool usage, not by shrinking the cap', () => {
    const relatedCap = 8
    const handToHandReserved = 2
    const related: CreationSkillPick[] = []
    const occCore: CreationSkillPick[] = []

    const used = sumRelatedPoolSlotUsage(related, occCore, handToHandReserved)
    expect(used).toBe(2)
    expect(relatedCap - used).toBe(6)

    const withSixSkills = Array.from({ length: 6 }, () =>
      buildCreationSkillPick('skill_detect_concealment', {}),
    )
    const usedAfterSkills = sumRelatedPoolSlotUsage(
      withSixSkills,
      occCore,
      handToHandReserved,
    )
    expect(usedAfterSkills).toBe(8)
    expect(relatedCap - usedAfterSkills).toBe(0)
  })
})
