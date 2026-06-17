import { describe, expect, it } from 'vitest'
import { getRaceById } from '../data/library/registry'
import { getPalladiumOccById } from '../data/library/occCatalogLoader'
import { rollPrimarySdcMaximum } from './spawnFinalVitality'
import { rollDiceNotation } from './diceNotation'

const blankAttrs = {
  iq: 10,
  me: 10,
  ma: 10,
  ps: { score: 10, tier: 'standard' as const },
  pp: 10,
  pe: 10,
  pb: 10,
  spd: 10,
}

describe('rollPrimarySdcMaximum', () => {
  it('accepts flat race S.D.C. bases (Nightbane R.C.C. = 30)', () => {
    const race = getRaceById('nightbane')
    const occ = getPalladiumOccById('occ_nightbane_basic')
    expect(race).toBeDefined()
    expect(occ).toBeDefined()
    expect(rollPrimarySdcMaximum(blankAttrs, { race, occ })).toBe(30)
  })
})

describe('rollDiceNotation', () => {
  it('returns plain integers without rolling', () => {
    expect(rollDiceNotation('30')).toBe(30)
  })
})
