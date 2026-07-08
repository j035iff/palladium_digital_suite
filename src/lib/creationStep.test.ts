import { describe, expect, it } from 'vitest'
import {
  assessAttributesBlockers,
  assessConfiguratorBlockers,
  orderedCreationPhases,
  buildCreationFlowContext,
  nextCreationPhase,
} from './creationStep'
import { diceNotationBounds, diceCoreBounds, isDiceNotation } from './diceNotationBounds'
import { createBlankCharacterForGenre } from './characterRoot'
import { getRaceById } from '../data/library/registry'
import { getPalladiumOccById } from '../data/library/occCatalogLoader'
import { getOccById, snapshotOccForCharacter } from '../data/occDefinitions'

describe('creationStep', () => {
  it('orders phases with psychic gate before skills when latent psionics apply', () => {
    const character = createBlankCharacterForGenre('rifts')
    const race = getRaceById('race_human', 'rifts')
    const ctx = buildCreationFlowContext(
      character,
      race,
      undefined,
      'rifts',
    )
    const order = orderedCreationPhases(ctx)
    const psychicIx = order.indexOf('psychicGate')
    const skillsIx = order.indexOf('skills')
    expect(psychicIx).toBeGreaterThan(-1)
    expect(skillsIx).toBeGreaterThan(psychicIx)
  })

  it('omits psychic gate phase for Nightbane human on mundane O.C.C.', () => {
    const character = {
      ...createBlankCharacterForGenre('nightbane'),
      raceId: 'race_human',
    }
    const race = getRaceById('race_human', 'nightbane')
    const occLib = getPalladiumOccById('occ_ex_government_agent')!
    const ctx = buildCreationFlowContext(character, race, occLib, 'nightbane')
    expect(orderedCreationPhases(ctx)).not.toContain('psychicGate')
  })

  it('blocks configurator until O.C.C. is chosen', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const blockers = assessConfiguratorBlockers(character, undefined, undefined)
    expect(blockers.some((b) => /Select a race/i.test(b))).toBe(true)
  })

  it('blocks attributes until all eight values are assigned', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const occ = getPalladiumOccById('occ_ex_government_agent')
    const blockers = assessAttributesBlockers(character, occ)
    expect(blockers.length).toBeGreaterThan(0)
  })

  it('allows attributes when all eight are typed directly without using the pool', () => {
    const character = createBlankCharacterForGenre('nightbane')
    const occ = getPalladiumOccById('occ_ex_government_agent')
    const withAssignments = {
      ...character,
      creationAttributeAssignments: {
        iq: 12,
        me: 11,
        ma: 10,
        ps: 14,
        pp: 12,
        pe: 13,
        pb: 11,
        spd: 10,
      },
    }
    expect(assessAttributesBlockers(withAssignments, occ)).toHaveLength(0)
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
    expect(diceNotationBounds('1D4x10')).toEqual({ min: 10, max: 40 })
    expect(diceNotationBounds('1D6X10+20')).toEqual({ min: 30, max: 80 })
    expect(diceNotationBounds('1D6+4')).toEqual({ min: 5, max: 10 })
    expect(diceNotationBounds('-1D6')).toEqual({ min: -6, max: -1 })
    expect(diceCoreBounds('1D6X10+20')).toEqual({ min: 10, max: 60 })
    expect(diceCoreBounds('1D6+2')).toEqual({ min: 1, max: 6 })
  })

  it('lists discrete totals for multiplied dice', async () => {
    const { diceCoreAllowedValues } = await import('./diceNotationBounds')
    expect(diceCoreAllowedValues('1D4x10')).toEqual([10, 20, 30, 40])
    expect(diceCoreAllowedValues('2D6x10')).toEqual([
      20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120,
    ])
    expect(diceCoreAllowedValues('1D6')).toBeUndefined()
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
