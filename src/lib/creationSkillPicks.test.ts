import { describe, expect, it } from 'vitest'

import {
  additionalSlotsForSkillAdd,
  buildCreationSkillPick,
  creationFreeRelatedSkillCap,
  creationLibrarySkillAddState,
  creationLibrarySkillVoucherAddAllowed,
  resolveCreationLibrarySkillVoucherBlockReason,
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
  sumFreeRelatedSkillSlotUsage,
  sumRelatedPoolSlotUsage,
  upgradePickToProfessional,
  validateSpecializationInput,
} from './creationSkillPicks'
import type { CreationSkillPick, PalladiumOcc } from '../types'
import { getSkillById } from '../data/skillLibrary'
import { getEngineSkillDefFromCatalog } from './creationSkillCatalog'
import { WP_PAIRED_WEAPONS_SKILL_ID } from './pairedWeaponSupport'
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

  it('treats legacy mathematics skill ids as canonical math ids', () => {
    const occPicks: CreationSkillPick[] = [
      { instanceId: 'skill_math_basic', skillId: 'skill_math_basic' },
    ]
    expect(
      isCreationSkillIdentityTaken(occPicks, 'skill_mathematics_basic'),
    ).toBe(true)
    expect(
      isCreationSkillFullySelected('skill_mathematics_basic', occPicks, [], []),
    ).toBe(true)
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
    } as unknown as PalladiumOcc
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

  it('counts H2H and pro surcharges in related usage while cap only reserves specialization vouchers', () => {
    const relatedCap = 8
    const voucherReserved = 3
    const handToHandReserved = 2
    const related: CreationSkillPick[] = []
    const occCore: CreationSkillPick[] = []

    const freeCap = creationFreeRelatedSkillCap(relatedCap, voucherReserved)
    expect(freeCap).toBe(5)
    expect(sumRelatedPoolSlotUsage(related, occCore, handToHandReserved)).toBe(2)
    expect(sumFreeRelatedSkillSlotUsage(related)).toBe(0)
  })

  it('counts hand-to-hand upgrade cost in pool usage against the free related cap', () => {
    const relatedCap = 8
    const voucherReserved = 0
    const freeCap = creationFreeRelatedSkillCap(relatedCap, voucherReserved)
    const handToHandReserved = 2
    const related: CreationSkillPick[] = []
    const occCore: CreationSkillPick[] = []

    const used = sumRelatedPoolSlotUsage(related, occCore, handToHandReserved)
    expect(used).toBe(2)
    expect(freeCap - used).toBe(6)

    const withSixSkills = Array.from({ length: 6 }, () =>
      buildCreationSkillPick('skill_detect_concealment', {}),
    )
    const usedAfterSkills = sumRelatedPoolSlotUsage(
      withSixSkills,
      occCore,
      handToHandReserved,
    )
    expect(usedAfterSkills).toBe(8)
    expect(freeCap - usedAfterSkills).toBe(0)
  })

  it('blocks voucher picks that fail catalog prerequisites', () => {
    const electrical = getEngineSkillDefFromCatalog('skill_electrical_engineer')!
    const withoutPrereqs = creationLibrarySkillVoucherAddAllowed(electrical, {
      effectiveOcc: null,
      specializationId: null,
      allPicks: [],
    })
    expect(withoutPrereqs).toBe(false)
    expect(
      resolveCreationLibrarySkillVoucherBlockReason(electrical, {
        effectiveOcc: null,
        specializationId: null,
        allPicks: [],
      }),
    ).toContain('Math: Advanced')

    const withPrereqs = creationLibrarySkillVoucherAddAllowed(electrical, {
      effectiveOcc: null,
      specializationId: null,
      allPicks: [
        buildCreationSkillPick('skill_math_advanced', {}),
        buildCreationSkillPick('skill_literacy', {}),
      ],
    })
    expect(withPrereqs).toBe(true)
  })

  it('blocks voucher W.P. Paired Weapons without a supporting ancient W.P.', () => {
    const paired = getEngineSkillDefFromCatalog(WP_PAIRED_WEAPONS_SKILL_ID)!
    expect(
      creationLibrarySkillVoucherAddAllowed(paired, {
        effectiveOcc: null,
        specializationId: null,
        allPicks: [],
      }),
    ).toBe(false)
    expect(
      creationLibrarySkillVoucherAddAllowed(paired, {
        effectiveOcc: null,
        specializationId: null,
        allPicks: [buildCreationSkillPick('wp_sword', {})],
      }),
    ).toBe(true)
  })

  it('counts voucher picks toward paired-weapon support in the related library', () => {
    const paired = getEngineSkillDefFromCatalog(WP_PAIRED_WEAPONS_SKILL_ID)!
    const ctx: CreationLibrarySkillContext = {
      effectiveOcc: null,
      specializationId: null,
      relatedSlotsUsed: 0,
      relatedSkillCap: 4,
      secondaryPickSlots: 0,
      secondaryCap: 4,
      occPicks: [],
      relatedPicks: [],
      secondaryPicks: [],
      allPicks: [buildCreationSkillPick('wp_knife', {})],
    }
    const state = creationLibrarySkillAddState(paired, ctx)
    expect(state.canAddRelated).toBe(true)
  })
})
