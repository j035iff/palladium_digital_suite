import { describe, expect, it } from 'vitest'

import { resolveCreationSkillBrowseLock } from './creationSkillBrowseLock'
import type { OccRelatedVoucherTask } from './occRelatedSkillVouchers'
import type { PalladiumOcc } from '../types'

function stubVocationalTask(): OccRelatedVoucherTask {
  return {
    id: 'related_work_cluster',
    entry: {
      id: 'related_work_cluster',
      choiceCount: 3,
      clusterCategoryOptions: ['Domestic', 'Technical'],
      clusterBonusPercent: 15,
    },
  }
}

describe('resolveCreationSkillBrowseLock', () => {
  it('keeps progressive browse locks off when vocational focus is incomplete', () => {
    const lock = resolveCreationSkillBrowseLock({
      effectiveOcc: {
        id: 'occ_stub',
        occSkillsCore: [],
        occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
      } as unknown as PalladiumOcc,
      specializationId: null,
      relatedVoucherTasks: [stubVocationalTask()],
      voucherPicks: {},
      relatedVoucherPicks: {},
      relatedVoucherClusters: {},
    })

    expect(lock.vocationalFocusIncomplete).toBe(true)
    expect(lock.blocksRelatedSecondaryBrowse).toBe(false)
    expect(lock.blocksCreationVoucherWhileVocationalIncomplete).toBe(false)
  })

  it('reports no incomplete vocational focus when tasks are empty', () => {
    const lock = resolveCreationSkillBrowseLock({
      effectiveOcc: undefined,
      specializationId: null,
      relatedVoucherTasks: [],
      voucherPicks: {},
      relatedVoucherPicks: {},
      relatedVoucherClusters: {},
    })

    expect(lock.vocationalFocusIncomplete).toBe(false)
    expect(lock.creationVouchersIncomplete).toBe(false)
    expect(lock.blocksRelatedSecondaryBrowse).toBe(false)
  })
})
