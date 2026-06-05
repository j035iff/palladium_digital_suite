import { describe, expect, it } from 'vitest'
import type { CreationSkillPick, PalladiumOcc } from '../types'
import { migrateSkillIdToPick } from './creationSkillPicks'
import {
  listEligibleVoucherSkillIds,
  listOccCoreVoucherTasks,
  occCoreVoucherPicksComplete,
  resolveCreationOccSkillIds,
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
})
