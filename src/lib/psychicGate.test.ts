import { describe, expect, it } from 'vitest'
import { getLibraryOccById } from '../data/library/registry'
import {
  getStandardPsychicTestBandRows,
  psychicGateCreationPsionicSlots,
  psychicGateIspFormula,
  psychicGateIspFormulaHint,
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

  it('exposes tier I.S.P. formulas for Minor and Major', () => {
    expect(psychicGateIspFormula('minor')).toEqual({
      base: 'ME + 2D6',
      perLevel: '1D6',
    })
    expect(psychicGateIspFormula('major')).toEqual({
      base: 'ME + 4D6',
      perLevel: '1D6+1',
    })
    expect(psychicGateIspFormulaHint('minor')).toBe('ME + 2D6 (+1D6/level)')
    expect(psychicGateIspFormulaHint('major')).toBe('ME + 4D6 (+1D6+1/level)')
  })

  it('maps gate tiers to creation psionic pick budgets', () => {
    const civilian = getLibraryOccById('occ_ex_government_agent')
    expect(psychicGateCreationPsionicSlots('minor', civilian)).toBe(2)
    expect(psychicGateCreationPsionicSlots('major', civilian)).toBe(8)
    expect(psychicGateCreationPsionicSlots('none', civilian)).toBe(0)
    expect(
      psychicGateCreationPsionicSlots(
        'master',
        getLibraryOccById('occ_pab_psychic_agent'),
      ),
    ).toBe(0)
  })
})
