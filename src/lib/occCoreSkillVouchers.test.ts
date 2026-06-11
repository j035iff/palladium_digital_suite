import { describe, expect, it } from 'vitest'
import type { CreationSkillPick, PalladiumOcc } from '../types'
import { migrateSkillIdToPick } from './creationSkillPicks'
import {
  canAddSkillViaOccCoreVoucher,
  catalogSkillIdsMatch,
  findOpenOccCoreVoucherSlot,
  listEligibleVoucherSkillIds,
  listOccCoreVoucherTasks,
  occCoreVoucherPicksComplete,
  resolveCreationLibrarySkillTier,
  resolveCreationOccSkillIds,
  resolveVoucherWeaponProficiencyEra,
  voucherUsesDedicatedPickerUi,
} from './occCoreSkillVouchers'
import { listCreationSkillLibrary } from './creationSkillCatalog'

const occ = {
  id: 'occ_voucher_test',
  occSkillsCore: [
    { skillId: 'skill_a', bonusPercent: 5 },
    {
      choiceCount: 1,
      bonusPercent: 0,
      allowedSkillIds: ['skill_b', 'skill_c'],
      label: 'Pick one',
    },
  ],
  occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
} as unknown as PalladiumOcc

describe('occCoreSkillVouchers', () => {
  it('lists voucher tasks from core package', () => {
    const tasks = listOccCoreVoucherTasks(occ, null)
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.id).toBe('core_voucher_1')
  })

  it('merges grants, voucher picks, and extras', () => {
    const ids = resolveCreationOccSkillIds(
      occ,
      null,
      ['skill_extra'],
      { core_voucher_1: [migrateSkillIdToPick('skill_b')] },
    )
    expect(ids).toContain('skill_a')
    expect(ids).toContain('skill_b')
    expect(ids).toContain('skill_extra')
  })

  it('detects incomplete voucher picks', () => {
    const tasks = listOccCoreVoucherTasks(occ, null)
    expect(occCoreVoucherPicksComplete(tasks, {})).toBe(false)
    expect(
      occCoreVoucherPicksComplete(tasks, {
        core_voucher_1: [migrateSkillIdToPick('skill_b')],
      }),
    ).toBe(true)
  })

  it('lists all weapon proficiencies for W.P. of choice vouchers', () => {
    const catalogIds = listCreationSkillLibrary('nightbane').map((s) => s.id)
    const wpIds = catalogIds.filter((id) => id.startsWith('wp_'))
    expect(wpIds.length).toBeGreaterThan(0)

    const eligible = listEligibleVoucherSkillIds(
      {
        choiceCount: 1,
        bonusPercent: 0,
        allowedCategories: ['Weapon Proficiencies'],
        label: 'W.P. of choice',
      },
      'nightbane',
      catalogIds,
    )
    expect(eligible).toEqual(wpIds)
  })

  it('restricts W.P. vouchers to a locked weapon proficiency era', () => {
    const catalogIds = listCreationSkillLibrary('nightbane').map((s) => s.id)
    const modernOnly = listEligibleVoucherSkillIds(
      {
        choiceCount: 1,
        bonusPercent: 0,
        allowedCategories: ['Weapon Proficiencies'],
        weaponProficiencyEra: 'modern',
        label: 'W.P. any modern weapon of choice',
      },
      'nightbane',
      catalogIds,
    )
    expect(modernOnly.length).toBeGreaterThan(0)
    expect(modernOnly).toContain('wp_automatic_pistol')
    expect(modernOnly).not.toContain('wp_archery_and_targeting')
    expect(
      resolveVoucherWeaponProficiencyEra({
        choiceCount: 1,
        bonusPercent: 0,
        allowedCategories: ['Weapon Proficiencies'],
        weaponProficiencyEra: 'ancient',
      }),
    ).toBe('ancient')
  })

  it('routes category vouchers to the library picker, not the dropdown', () => {
    expect(
      voucherUsesDedicatedPickerUi({
        choiceCount: 2,
        bonusPercent: 20,
        allowedCategories: ['Medical', 'Science', 'Technical'],
      }),
    ).toBe(false)
    expect(
      voucherUsesDedicatedPickerUi({
        choiceCount: 1,
        bonusPercent: 0,
        allowedCategories: ['Weapon Proficiencies'],
      }),
    ).toBe(true)
  })

  it('finds an open voucher slot for eligible skills', () => {
    const tasks = listOccCoreVoucherTasks(occ, null)
    const catalogIds = ['skill_a', 'skill_b', 'skill_c']
    const open = findOpenOccCoreVoucherSlot(
      'skill_b',
      tasks,
      {},
      'nightbane',
      catalogIds,
    )
    expect(open).toEqual({
      taskId: 'core_voucher_1',
      slot: 0,
      choiceCount: 1,
    })
  })

  it('matches legacy mathematics ids to canonical math catalog ids', () => {
    expect(
      catalogSkillIdsMatch('skill_math_basic', 'skill_mathematics_basic'),
    ).toBe(true)
    expect(
      resolveCreationLibrarySkillTier('skill_math_basic', {
        relatedPicks: [],
        secondaryPicks: [],
        resolvedOccPicks: [migrateSkillIdToPick('skill_math_basic')],
        voucherTasks: [],
        voucherPicks: {},
      }),
    ).toBe('occ')
  })

  it('blocks duplicate voucher picks', () => {
    const tasks = listOccCoreVoucherTasks(occ, null)
    const catalogIds = ['skill_a', 'skill_b', 'skill_c']
    const picks = { core_voucher_1: [migrateSkillIdToPick('skill_b')] }
    expect(
      canAddSkillViaOccCoreVoucher(
        'skill_b',
        tasks,
        picks,
        'nightbane',
        catalogIds,
        [migrateSkillIdToPick('skill_b')],
      ),
    ).toBe(false)
    expect(
      canAddSkillViaOccCoreVoucher(
        'skill_c',
        tasks,
        picks,
        'nightbane',
        catalogIds,
        [migrateSkillIdToPick('skill_b')],
      ),
    ).toBe(false)
  })
})
