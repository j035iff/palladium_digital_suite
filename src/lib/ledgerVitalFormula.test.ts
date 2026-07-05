import { describe, expect, it } from 'vitest'
import type { PalladiumOcc, Race } from '../types'
import {
  buildAttrFormulaLedgerFields,
  buildSourcedVitalFlatTerms,
  buildVitalAttrFlatBundle,
  formatHpDiceRollHint,
  formatMorphusSdcValueTooltip,
  formatVitalAttrFlatTooltip,
  formatVitalDiceRollHint,
  formatVitalFormulaLedgerHint,
  formatVitalLedgerTooltip,
  hitPointsPerLevelDiceFormula,
  parseVitalFormulaAttrTerm,
  resolvePpeCreationFormula,
} from './ledgerVitalFormula'
import { formatVitalityBlockValueTooltip } from './spawnDiceBlocks'

describe('ledgerVitalFormula', () => {
  it('parses multiplied attribute terms', () => {
    expect(parseVitalFormulaAttrTerm('MEx3')).toEqual({ attr: 'me', multiplier: 3 })
    expect(parseVitalFormulaAttrTerm('ME * 4')).toEqual({ attr: 'me', multiplier: 4 })
    expect(parseVitalFormulaAttrTerm('PE')).toEqual({ attr: 'pe', multiplier: 1 })
  })

  it('sums P.E. into HP flat value', () => {
    const bundle = buildVitalAttrFlatBundle('PE + 1D6', { pe: 14 })
    expect(bundle.flatTotal).toBe(14)
    expect(formatVitalAttrFlatTooltip(bundle.terms)).toBe('(PE 14)')
  })

  it('sums M.E. × multiplier into ISP flat value', () => {
    const bundle = buildVitalAttrFlatBundle('MEx3 + 5D6', { me: 10 })
    expect(bundle.flatTotal).toBe(30)
    expect(formatVitalAttrFlatTooltip(bundle.terms)).toBe('(ME(10) × 3)')
    expect(formatVitalFormulaLedgerHint('MEx3 + 5D6')).toBe('MEx3 + 5D6')
  })

  it('formats ISP hint with per-level dice', () => {
    expect(formatVitalFormulaLedgerHint('ME + 5D6', '2D4')).toBe(
      'M.E. + 5D6 (+2D4/level)',
    )
  })

  it('formats dice-only hints without attribute or flat constants', () => {
    expect(formatHpDiceRollHint('PE + 1D6')).toBe('Race: +1D6/level')
    expect(
      formatVitalDiceRollHint({
        formulaSources: { race: '3D6*10', occ: 'PE + 3D6*10+20' },
        perLevelFormula: '3D6',
      }),
    ).toBe('Race: 3D6x10 · O.C.C.: 3D6x10 (+3D6/level)')
  })

  it('labels Facade P.E. in dual-form P.P.E. hints', () => {
    expect(
      formatVitalFormulaLedgerHint('PE + 3D6*10+20', '3D6', { pe: 'Facade' }),
    ).toBe('PE (Facade) + 3D6x10 + 20 (+3D6/level)')
    expect(
      formatVitalDiceRollHint({
        formulaSources: { race: '3D6*10', occ: 'PE + 3D6*10+20' },
        perLevelFormula: '3D6',
      }),
    ).toBe('Race: 3D6x10 · O.C.C.: 3D6x10 (+3D6/level)')
  })

  it('sums flat integer terms into P.P.E. flat value', () => {
    const bundle = buildSourcedVitalFlatTerms(
      [{ source: 'occ', formula: 'PE + 3D6*10+20' }],
      { pe: 14 },
    )
    expect(bundle.reduce((sum, term) => sum + term.amount, 0)).toBe(34)
    expect(formatVitalAttrFlatTooltip(bundle)).toBe('(PE 14, OCCFlat +20)')
    const fields = buildAttrFormulaLedgerFields('PE + 3D6*10+20', { pe: 14 }, {
      formulaSources: { occ: 'PE + 3D6*10+20' },
    })
    expect(fields.value).toBe('34')
    expect(fields.valueModified).toBe(true)
  })

  it('labels Facade P.E. in dual-form P.P.E. tooltips', () => {
    const terms = buildSourcedVitalFlatTerms(
      [{ source: 'occ', formula: 'PE + 3D6*10+20' }],
      { pe: 13 },
      { pe: 13 },
      { pe: 'Facade' },
    )
    expect(formatVitalAttrFlatTooltip(terms)).toBe('(PE(Facade) 13, OCCFlat +20)')
  })

  it('formats per-level dice in vitality tooltips', () => {
    expect(
      formatVitalLedgerTooltip(
        [{ kind: 'attr', attr: 'pe', label: 'P.E.', score: 12, multiplier: 1, amount: 12 }],
        [{ kind: 'perLevel', notation: '1D6', amount: 3 }],
      ),
    ).toBe('(PE 12, perLevel(1D6) 3)')
  })

  it('orders rolls before flats within each race / O.C.C. source', () => {
    expect(
      formatVitalLedgerTooltip(
        [
          {
            kind: 'attr',
            attr: 'pe',
            label: 'P.E.',
            score: 13,
            multiplier: 1,
            amount: 13,
            formLabel: 'Facade',
          },
          { kind: 'flat', source: 'race', label: 'RaceFlat', amount: 10 },
          { kind: 'flat', source: 'occ', label: 'OCCFlat', amount: 30 },
        ],
        [
          { kind: 'raceRoll', notation: '3D6', amount: 13 },
          { kind: 'occRoll', notation: '1D4x10', amount: 20 },
          { kind: 'perLevel', notation: '3D6', amount: 14 },
        ],
      ),
    ).toBe(
      '(PE(Facade) 13, RaceRoll(3D6) +13, RaceFlat +10, OCCRoll(1D4x10) +20, OCCFlat +30, perLevel(3D6) 14)',
    )
  })

  it('formats morphus S.D.C. tooltips with facade, race roll, and trait flats', () => {
    expect(
      formatMorphusSdcValueTooltip(
        30,
        [{ kind: 'raceRoll', notation: '2D6x10', amount: 45 }],
        [{ label: 'Arachnid', amount: 50 }],
      ),
    ).toBe('(Facade 30, RaceRoll(2D6x10) +45, Arachnid +50)')
  })

  it('extracts per-level dice from race H.P. formulas', () => {
    expect(hitPointsPerLevelDiceFormula('PE + 1D6')).toBe('1D6')
    expect(hitPointsPerLevelDiceFormula('PE + 2D6')).toBe('2D6')
    expect(hitPointsPerLevelDiceFormula('PEx2')).toBeNull()
  })

  it('builds universal ledger fields for magic P.P.E. with P.E. multiplier', () => {
    const fields = buildAttrFormulaLedgerFields('PEx10 + 2D6', { pe: 12 })
    expect(fields.value).toBe('120')
    expect(fields.valueModified).toBe(true)
    expect(
      formatVitalityBlockValueTooltip(fields.flatTerms ?? [], undefined, {}, []),
    ).toBe('(PE(12) × 10)')
    expect(fields.hint).toBe('Race: 2D6')
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
    }, {
      perLevelFormula: '1D6',
      formulaSources: { race: '2D6', occ: 'PEx10 + 2D6' },
    })
    expect(fields.value).toBe('110')
    expect(fields.hint).toBe('Race: 2D6 · O.C.C.: 2D6 (+1D6/level)')
  })
})
