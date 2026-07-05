import { describe, expect, it } from 'vitest'
import {
  resolveMorphusSdcFlatDerivedStat,
  resolveSdcFlatDerivedStat,
  resolveSourcedVitalFormulaFlat,
  resolveVitalFlatFromTerms,
} from './creationStatEngine'
import {
  compileVitalFormula,
  resolveHitPointsFromSchema,
  resolveVitalFormulaFlat,
  resolveVitalPendingBlockTotal,
  vitalFormulaAttrConstant1,
} from './vitalStatEngine'
import type { PendingDiceBlock } from './spawnDiceBlocks'

describe('resolveVitalFormulaFlat', () => {
  it('Facade H.P. PE + 1D6 → aggregated P.E. × 1', () => {
    const result = resolveVitalFormulaFlat('PE + 1D6', { pe: 14 })
    expect(result.attrPortion).toBe(14)
    expect(result.total).toBe(14)
  })

  it('NPC race PE*3 → aggregated P.E. × 3', () => {
    const result = resolveVitalFormulaFlat('PE*3', { pe: 10 })
    expect(result.attrPortion).toBe(30)
    expect(result.total).toBe(30)
  })

  it('Morphus PEx2 → aggregated P.E. × 2', () => {
    const result = resolveVitalFormulaFlat('PEx2', {}, { pe: 22 })
    expect(result.attrPortion).toBe(44)
    expect(result.total).toBe(44)
  })

  it('P.P.E. PE + 3D6*10 + 20 includes integer flat', () => {
    const result = resolveVitalFormulaFlat('PE + 3D6*10+20', { pe: 14 })
    expect(result.attrPortion).toBe(14)
    expect(result.total).toBe(34)
  })

  it('I.S.P. MEx3 → aggregated M.E. × 3', () => {
    const result = resolveVitalFormulaFlat('MEx3 + 5D6', { me: 10 })
    expect(result.attrPortion).toBe(30)
    expect(result.total).toBe(30)
  })
})

describe('resolveSourcedVitalFormulaFlat', () => {
  it('merges race and OCC attr terms without double-counting attrs', () => {
    const result = resolveSourcedVitalFormulaFlat(
      [
        { source: 'race', formula: '2D6' },
        { source: 'occ', formula: 'PE + 3D6*10+20' },
      ],
      { pe: 12 },
    )
    expect(result.total).toBe(32)
  })
})

describe('resolveHitPointsFromSchema', () => {
  it('adds entered level dice to schema flat total', () => {
    const result = resolveHitPointsFromSchema({
      hpFormula: 'PE + 1D6',
      assignments: { pe: 12 },
      enteredDiceTotal: 5,
    })
    expect(result.total).toBe(17)
  })
})

describe('resolveSdcFlatDerivedStat', () => {
  it('sums race/OCC/skill flats with no attribute anchor', () => {
    const result = resolveSdcFlatDerivedStat({
      flatVitalTerms: [
        { kind: 'flat', source: 'occ', label: 'OCCFlat', amount: 20 },
      ],
      skillFlats: [{ label: 'Skills', amount: 10 }],
    })
    expect(result.total).toBe(30)
  })
})

describe('resolveMorphusSdcFlatDerivedStat', () => {
  it('carries Facade S.D.C. plus trait flats', () => {
    const result = resolveMorphusSdcFlatDerivedStat({
      facadeSdcTotal: 45,
      traitFlats: [{ label: 'Traits', amount: 15 }],
    })
    expect(result.total).toBe(60)
  })
})

describe('compileVitalFormula', () => {
  it('extracts anchor attr and constant1 from schema', () => {
    expect(compileVitalFormula('PE*3', { pe: 10 }).attrConstant1).toBe(3)
    expect(compileVitalFormula('PE + 1D6', { pe: 10 }).attrConstant1).toBe(1)
    expect(vitalFormulaAttrConstant1('PEx2')).toBe(2)
  })
})

describe('resolveVitalPendingBlockTotal', () => {
  it('flat baseline from engine + entered dice', () => {
    const block: PendingDiceBlock = {
      id: 'hp',
      label: 'H.P.',
      flatBaseline: 14,
      groups: [
        {
          kind: 'race',
          display: '1D6',
          rolls: [
            {
              id: 'hp.race.0',
              notation: '1D6',
              min: 1,
              max: 6,
              source: 'Race',
            },
          ],
        },
      ],
    }
    expect(resolveVitalPendingBlockTotal(block, { 'hp.race.0': 4 })).toBe(18)
  })
})

describe('resolveVitalFlatFromTerms multi-attr', () => {
  it('treats multiple attrs as misc terms when formula has PE and ME', () => {
    const result = resolveVitalFlatFromTerms([
      {
        kind: 'attr',
        attr: 'pe',
        label: 'P.E.',
        score: 12,
        multiplier: 1,
        amount: 12,
      },
      {
        kind: 'attr',
        attr: 'me',
        label: 'M.E.',
        score: 10,
        multiplier: 1,
        amount: 10,
      },
    ])
    expect(result.attrPortion).toBe(0)
    expect(result.total).toBe(22)
  })
})
