import { describe, expect, it } from 'vitest'
import {
  assessAttributesBlockers,
  assessConfiguratorBlockers,
  orderedCreationPhases,
  buildCreationFlowContext,
  nextCreationPhase,
} from './creationStep'
import { diceNotationBounds, isDiceNotation } from './diceNotationBounds'
import { createBlankCharacterForGenre } from './characterRoot'
import { getRaceById } from '../data/library/registry'
import { getPalladiumOccById } from '../data/library/occCatalogLoader'
import { getOccById, snapshotOccForCharacter } from '../data/occDefinitions'

describe('creationStep', () => {
  it('orders phases with psychic gate before skills', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const race = getRaceById('race_human')
    const ctx = buildCreationFlowContext(
      character,
      race,
      undefined,
      'nightbane',
    )
    const order = orderedCreationPhases(ctx)
    const psychicIx = order.indexOf('psychicGate')
    const skillsIx = order.indexOf('skills')
    expect(psychicIx).toBeGreaterThan(-1)
    expect(skillsIx).toBeGreaterThan(psychicIx)
  })

  it('blocks configurator until O.C.C. is chosen', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const blockers = assessConfiguratorBlockers(character, undefined, undefined)
    expect(blockers.some((b) => /Select a race/i.test(b))).toBe(true)
  })

  it('blocks attributes until pool is filled and assigned', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const occ = getPalladiumOccById('occ_ex_government_agent')
    const blockers = assessAttributesBlockers(character, occ)
    expect(blockers.length).toBeGreaterThan(0)
  })

  it('omits psychic gate phase for natural psychic O.C.C.s', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const race = getRaceById('race_human')
    const occLib = getPalladiumOccById('occ_pab_psychic_agent')!
    const ctx = buildCreationFlowContext(character, race, occLib, 'nightbane')
    expect(orderedCreationPhases(ctx)).not.toContain('psychicGate')
  })

  it('advances from configurator to attributes when valid', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const race = getRaceById('race_human')
    const occLib = getPalladiumOccById('occ_ex_government_agent')!
    const occ = getOccById('occ_ex_government_agent')!
    const withOcc = {
      ...character,
      raceId: 'race_human',
      occ: snapshotOccForCharacter(occ),
    }
    const blockers = assessConfiguratorBlockers(withOcc, race, occLib)
    expect(blockers).toHaveLength(0)
    const ctx = buildCreationFlowContext(withOcc, race, occLib, 'nightbane')
    expect(nextCreationPhase('configurator', ctx)).toBe('attributes')
  })
})

describe('diceNotationBounds', () => {
  it('parses 1D6 and 2D6 ranges', () => {
    expect(isDiceNotation('1D6')).toBe(true)
    expect(diceNotationBounds('1D6')).toEqual({ min: 1, max: 6 })
    expect(diceNotationBounds('2D6')).toEqual({ min: 2, max: 12 })
  })

  it('parses multiplied notation', () => {
    expect(diceNotationBounds('1D4*10')).toEqual({ min: 10, max: 40 })
  })
})

describe('attributePoolNotationBounds', () => {
  it('extends only flat 2D6 and 3D6 for exceptional totals', async () => {
    const { attributePoolNotationBounds } = await import('./diceNotationBounds')
    expect(attributePoolNotationBounds('3D6')).toEqual({ min: 3, max: 30 })
    expect(attributePoolNotationBounds('2D6')).toEqual({ min: 2, max: 18 })
    expect(attributePoolNotationBounds('4D6')).toEqual({ min: 4, max: 24 })
    expect(attributePoolNotationBounds('3D6+2')).toEqual({ min: 5, max: 20 })
  })
})
