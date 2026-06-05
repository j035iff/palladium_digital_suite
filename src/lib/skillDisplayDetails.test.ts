import { describe, expect, it } from 'vitest'
import { formatPhysicalSkillBonusSummary } from './skillDisplayDetails'

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
})
