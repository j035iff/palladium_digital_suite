import { describe, expect, it } from 'vitest'
import { getEngineSkillDefFromCatalog } from './creationSkillCatalog'
import {
  formatPhysicalSkillBonusSummary,
  resolveCreationLibrarySkillPreview,
} from './skillDisplayDetails'

describe('skillDisplayDetails', () => {
  it('formats Athletics (general) physical bonuses', () => {
    const summary = formatPhysicalSkillBonusSummary({
      ps: 1,
      spd: '1D6',
      sdc: '1D8',
      parry: 1,
      dodge: 1,
      rollWithImpact: 1,
    })
    expect(summary).toBe(
      '+1 parry/dodge, +1 roll w/punch/fall, +1 PS, +1D6 Spd, +1D8 SDC',
    )
  })

  it('lists acrobatics sub-skills and conditional grants without percentages', () => {
    const def = getEngineSkillDefFromCatalog('skill_acrobatics')
    expect(def).toBeDefined()
    const preview = resolveCreationLibrarySkillPreview(def!)
    expect(preview.physicalBonusSummary).toContain('+1 PS')
    expect(preview.subSkillNames).toEqual([
      'Sense of balance',
      'Walk tightrope or high wire',
      'Climb rope',
      'Back flip',
    ])
    expect(preview.grantedSkillNames).toEqual(['Climbing', 'Prowl'])
  })
})
