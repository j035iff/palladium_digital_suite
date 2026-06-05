import { describe, expect, it } from 'vitest'
import type { PalladiumOcc } from '../types'
import {
  listOccVariableAttributeBonusTasks,
  listOccVariableBonusTasks,
} from './occVariableBonus'

const occ = {
  id: 'occ_test',
  staticBonuses: {
    attributes: { ps: '1D4', pe: 2 },
    vitals: { sdc: '2D6' },
  },
  occSkillsCore: [],
  occRelatedSkills: { initialSlotsCount: 0, categoryRules: [] },
} as unknown as PalladiumOcc

describe('occVariableBonus', () => {
  it('Phase I.2 lists only attribute dice bonuses', () => {
    const attrTasks = listOccVariableAttributeBonusTasks(occ, null)
    expect(attrTasks).toHaveLength(1)
    expect(attrTasks[0]?.statKey).toBe('ps')
    expect(attrTasks[0]?.notation).toBe('1D4')
  })

  it('full task list still includes vitals for spawn ledger', () => {
    const all = listOccVariableBonusTasks(occ, null)
    expect(all.some((t) => t.section === 'attributes')).toBe(true)
    expect(all.some((t) => t.section === 'vitals')).toBe(true)
  })
})
