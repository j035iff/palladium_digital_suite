import { describe, expect, it } from 'vitest'

import type { PalladiumOcc } from '../types'
import {
  assessRelatedSkillVoucherBlockers,
  canAddSkillViaRelatedVoucher,
  isSkillEligibleForRelatedVoucher,
  listOccRelatedVoucherTasks,
  occRelatedVoucherPicksComplete,
  resolveRelatedVoucherSkillBonus,
  sumRelatedVoucherReservedSlots,
} from './occRelatedSkillVouchers'
import { creationFreeRelatedSkillCap, sumRelatedPoolSlotUsage } from './creationSkillPicks'

const laborerLightOcc = {
  id: 'occ_general_citizen',
  name: 'General Citizen',
  occRelatedSkills: {
    initialSlotsCount: 8,
    categoryRules: [],
    skillVouchers: [
      {
        id: 'related_work_cluster',
        choiceCount: 3,
        label: 'Work cluster',
        clusterBonusPercent: 15,
        clusterCategoryOptions: [
          'Communications',
          'Domestic',
          'Mechanical',
          'Science',
          'Technical',
        ],
      },
    ],
  },
  specializations: [
    {
      id: 'laborer_light',
      name: 'Laborer',
      description: 'test',
      occRelatedSkills: {
        replaceBaseline: true,
        initialSlotsCount: 8,
        categoryRules: [
          { categoryName: 'Communications', accessType: 'none', bonusPercent: 0 },
        ],
        skillVouchers: [
          {
            id: 'related_work_cluster',
            choiceCount: 3,
            clusterBonusPercent: 15,
            clusterCategoryOptions: [
              'Communications',
              'Domestic',
              'Mechanical',
              'Science',
              'Technical',
            ],
          },
        ],
      },
    },
  ],
} as unknown as PalladiumOcc

describe('occRelatedSkillVouchers', () => {
  it('derives free related cap from voucher reservation without counting voucher picks in usage', () => {
    const tasks = listOccRelatedVoucherTasks(laborerLightOcc, 'laborer_light')
    expect(sumRelatedVoucherReservedSlots(tasks)).toBe(3)
    expect(sumRelatedPoolSlotUsage([], [], 0)).toBe(0)
    expect(creationFreeRelatedSkillCap(8, 3)).toBe(5)
  })

  it('requires cluster selection before skill picks', () => {
    const tasks = listOccRelatedVoucherTasks(laborerLightOcc, 'laborer_light')
    const blockers = assessRelatedSkillVoucherBlockers(
      laborerLightOcc,
      {},
      {},
      'laborer_light',
    )
    expect(blockers.some((b) => b.includes('before selecting skills'))).toBe(true)
    expect(
      occRelatedVoucherPicksComplete(tasks, {}, { related_work_cluster: 'Technical' }),
    ).toBe(false)
  })

  it('applies clusterBonusPercent to voucher picks', () => {
    const bonus = resolveRelatedVoucherSkillBonus(
      laborerLightOcc,
      'laborer_light',
      'skill_computer_operation',
      {
        related_work_cluster: [
          { instanceId: 'skill_computer_operation', skillId: 'skill_computer_operation' },
          null,
          null,
        ],
      },
    )
    expect(bonus).toBe(15)
  })

  it('gates library adds on cluster and open slot', () => {
    const tasks = listOccRelatedVoucherTasks(laborerLightOcc, 'laborer_light')
    expect(
      canAddSkillViaRelatedVoucher(
        'skill_computer_operation',
        tasks,
        {},
        laborerLightOcc,
        'laborer_light',
        {},
        [],
      ),
    ).toBe(false)
    expect(
      canAddSkillViaRelatedVoucher(
        'skill_computer_operation',
        tasks,
        {},
        laborerLightOcc,
        'laborer_light',
        { related_work_cluster: 'Technical' },
        [],
      ),
    ).toBe(true)
  })

  it('overrides related accessType none for voucher cluster categories', () => {
    const tasks = listOccRelatedVoucherTasks(laborerLightOcc, 'laborer_light')
    const task = tasks[0]!
    expect(
      isSkillEligibleForRelatedVoucher(
        'skill_radio_basic',
        task,
        laborerLightOcc,
        'laborer_light',
        { related_work_cluster: 'Communications' },
      ),
    ).toBe(true)
    expect(
      canAddSkillViaRelatedVoucher(
        'skill_radio_basic',
        tasks,
        {},
        laborerLightOcc,
        'laborer_light',
        { related_work_cluster: 'Communications' },
        [],
      ),
    ).toBe(true)
  })
})
