import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import {
  listOccCoreVoucherTasks,
  occCoreVoucherPicksComplete,
  resolveCreationOccSkillIds,
} from './occCoreSkillVouchers'

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
      { core_voucher_1: ['skill_b'] },
    )
    expect(ids).toContain('skill_a')
    expect(ids).toContain('skill_b')
    expect(ids).toContain('skill_extra')
  })

  it('detects incomplete voucher picks', () => {
    const tasks = listOccCoreVoucherTasks(occ, null)
    expect(occCoreVoucherPicksComplete(tasks, {})).toBe(false)
    expect(
      occCoreVoucherPicksComplete(tasks, { core_voucher_1: ['skill_b'] }),
    ).toBe(true)
  })
})
