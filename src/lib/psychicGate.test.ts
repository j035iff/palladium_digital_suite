import { describe, expect, it } from 'vitest'
import {
  getStandardPsychicTestBandRows,
  tierFromTestPotential,
} from './psychicGate'

describe('psychicGate', () => {
  it('maps standard d100 bands without Master', () => {
    expect(tierFromTestPotential(1)).toBe('major')
    expect(tierFromTestPotential(9)).toBe('major')
    expect(tierFromTestPotential(10)).toBe('minor')
    expect(tierFromTestPotential(25)).toBe('minor')
    expect(tierFromTestPotential(26)).toBe('none')
    expect(tierFromTestPotential(100)).toBe('none')
  })

  it('lists band rows for UI', () => {
    expect(getStandardPsychicTestBandRows()).toEqual([
      { lo: 1, hi: 9, tier: 'major' },
      { lo: 10, hi: 25, tier: 'minor' },
      { lo: 26, hi: 100, tier: 'none' },
    ])
  })
})
