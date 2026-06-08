import { describe, expect, it } from 'vitest'
import { creationVitalityPreview, formatRaceHpRollHint } from './creationVitalityPreview'
import { characterFixture } from '../data/characterFixture'
import { getLibraryOccById } from '../data/library/registry'
import { getRaceById } from '../data/library/registry'
import { calculateBaseSdc } from '../utils/vitalsCalculator'
import { occFlatVitalBonus } from './creationOccBonuses'

describe('creationVitalityPreview', () => {
  const human = getRaceById('race_human')
  const occ = getLibraryOccById('occ_ex_government_agent')

  it('shows dashes until race, occ, and P.E. are available', () => {
    const empty = creationVitalityPreview(characterFixture, undefined, undefined)
    expect(empty.facadeHpValue).toBe('—')
    expect(empty.facadeHpRollHint).toBeUndefined()
    expect(empty.facadeSdcValue).toBe('—')
    expect(empty.facadeSdcRollHint).toBeUndefined()
    expect(empty.ppeValue).toBe('—')
    expect(empty.ppeRollHint).toBeUndefined()

    const raceOnly = creationVitalityPreview(characterFixture, human, undefined)
    expect(raceOnly.facadeHpValue).toBe('—')
    expect(raceOnly.facadeHpRollHint).toBe('P.E. + 1D6/level')
    expect(raceOnly.facadeSdcValue).toBe('—')
    expect(raceOnly.facadeSdcRollHint).toBeUndefined()
    expect(raceOnly.ppeValue).toBe('—')
    expect(raceOnly.ppeRollHint).toBeUndefined()
  })

  it('formats human H.P. as P.E. plus per-level dice', () => {
    expect(formatRaceHpRollHint('PE + 1D6')).toBe('P.E. + 1D6/level')
  })

  it('shows race formulas once race, occ, and P.E. are set', () => {
    const preview = creationVitalityPreview(
      {
        ...characterFixture,
        psychicGateBypassed: false,
        facade: {
          ...characterFixture.facade,
          attributes: { ...characterFixture.facade.attributes, pe: 14 },
        },
      },
      human,
      occ,
      { assignments: { pe: 14 }, psychicTier: 'none' },
    )
    expect(preview.facadeHpValue).toBe('14')
    expect(preview.facadeHpRollHint).toBe('P.E. + 1D6/level')
    const sdcFormula = calculateBaseSdc(human, occ)
    const occSdc = occFlatVitalBonus(occ, undefined, 'sdc', {})
    expect(preview.facadeSdcValue).toBe('—')
    expect(preview.facadeSdcRollHint).toBe(
      occSdc > 0 ? `${sdcFormula} + O.C.C. +${occSdc}` : sdcFormula,
    )
    expect(preview.ppeValue).toBe('—')
    expect(preview.ppeRollHint).toContain('2D6')
    expect(preview.ispValue).toBe('—')
    expect(preview.ispRollHint).toBeUndefined()
  })

  it('shows I.S.P. formula from ispEngine when psychic O.C.C. is selected', () => {
    const psychic = getLibraryOccById('occ_pab_psychic_agent')
    const preview = creationVitalityPreview(characterFixture, human, psychic, {
      psychicTier: 'major',
    })
    expect(preview.ispValue).toBe('—')
    expect(preview.ispRollHint).toBe('M.E. + 5D6 (+2D4/level)')
    expect(preview.ispValue).toBe('—')
    expect(preview.facadeSdcRollHint).toBe('1D4*10 + 2D6 (O.C.C.)') // legacy preview field
  })
})
