import { describe, expect, it } from 'vitest'
import type { PalladiumOcc, Race } from '../types'
import {
  buildAttrFormulaLedgerFields,
  buildVitalAttrFlatBundle,
  formatVitalAttrFlatTooltip,
  formatVitalFormulaLedgerHint,
  parseVitalFormulaAttrTerm,
  resolvePpeCreationFormula,
} from './ledgerVitalFormula'

describe('ledgerVitalFormula', () => {
  it('parses multiplied attribute terms', () => {
    expect(parseVitalFormulaAttrTerm('MEx3')).toEqual({ attr: 'me', multiplier: 3 })
    expect(parseVitalFormulaAttrTerm('ME * 4')).toEqual({ attr: 'me', multiplier: 4 })
    expect(parseVitalFormulaAttrTerm('PE')).toEqual({ attr: 'pe', multiplier: 1 })
  })

  it('sums P.E. into HP flat value', () => {
    const bundle = buildVitalAttrFlatBundle('PE + 1D6', { pe: 14 })
    expect(bundle.flatTotal).toBe(14)
    expect(formatVitalAttrFlatTooltip(bundle.terms)).toBe('(P.E. +14)')
  })

  it('sums M.E. × multiplier into ISP flat value', () => {
    const bundle = buildVitalAttrFlatBundle('MEx3 + 5D6', { me: 10 })
    expect(bundle.flatTotal).toBe(30)
    expect(formatVitalAttrFlatTooltip(bundle.terms)).toBe('(M.E.(10) × 3)')
    expect(formatVitalFormulaLedgerHint('MEx3 + 5D6')).toBe('MEx3 + 5D6')
  })

  it('formats ISP hint with per-level dice', () => {
    expect(formatVitalFormulaLedgerHint('ME + 5D6', '2D4')).toBe(
      'M.E. + 5D6 (+2D4/level)',
    )
  })

  it('labels Facade P.E. in dual-form P.P.E. hints', () => {
    expect(
      formatVitalFormulaLedgerHint('PE + 3D6*10+20', '3D6', { pe: 'Facade' }),
    ).toBe('PE (Facade) + 3D6x10 + 20 (+3D6/level)')
  })

  it('builds universal ledger fields for magic P.P.E. with P.E. multiplier', () => {
    const fields = buildAttrFormulaLedgerFields('PEx10 + 2D6', { pe: 12 })
    expect(fields.value).toBe('120')
    expect(fields.valueModified).toBe(true)
    expect(fields.valueTooltip).toBe('(P.E.(12) × 10)')
    expect(fields.hint).toBe('PEx10 + 2D6')
  })

  it('merges race dice and O.C.C. attribute P.P.E. formulas', () => {
    const race = {
      vitals: { averageStandardPpe: '2D6' },
    } as Race
    const occ = {
      ppeEngine: { baseFormula: 'PEx10 + 2D6', perLevelFormula: '1D6' },
    } as PalladiumOcc
    expect(resolvePpeCreationFormula(race, occ)).toBe('2D6 + PEx10 + 2D6')
    const fields = buildAttrFormulaLedgerFields(resolvePpeCreationFormula(race, occ), {
      pe: 11,
    }, { perLevelFormula: '1D6' })
    expect(fields.value).toBe('110')
    expect(fields.hint).toBe('2D6 + PEx10 + 2D6 (+1D6/level)')
  })
})
