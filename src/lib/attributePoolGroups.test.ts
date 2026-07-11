import { describe, expect, it } from 'vitest'
import type { RaceAttributeFormulas } from '../types'
import {
  assignmentToPoolRoll,
  attributePoolDiceCoreBounds,
  buildAttributePoolDiceGroups,
  compareAttributePoolGroupOrder,
  poolRollToAssignmentValue,
  raceAttrDiceCore,
  raceAttrFlatBonus,
  raceAttrPoolExceptionalEligible,
} from './attributePoolGroups'

const guardianFormulas = {
  iq: '2D4+16',
  me: '2D6+16',
  ma: '2D6+12',
  ps: '2D4+14',
  pp: '2D4+16',
  pe: '2D6+14',
  pb: '1D6+14',
  spd: '2D6+20',
} as RaceAttributeFormulas

const mixedFormulas = {
  iq: '3D6',
  me: '3D6+2',
  ma: '2D6',
  ps: '2D6+4',
  pp: '3D6',
  pe: '3D6+2',
  pb: '2D6',
  spd: '2D6+4',
} as RaceAttributeFormulas

const wildVampireFormulas = {
  iq: '2D6+1',
  me: '3D6+4',
  ma: '2D6+2',
  ps: '3D6+14',
  pp: '3D6+8',
  pe: '1D6+16',
  pb: '1D6+2',
  spd: '5D6+10',
} as RaceAttributeFormulas

describe('attributePoolGroups', () => {
  it('groups Guardian attributes by dice core in ascending NdM order', () => {
    const groups = buildAttributePoolDiceGroups(guardianFormulas)
    expect(groups).toHaveLength(3)
    expect(groups.map((group) => group.diceCore)).toEqual(['2D4', '1D6', '2D6'])
    expect(groups[0]).toMatchObject({
      diceCore: '2D4',
      exceptionalEligible: false,
      poolBounds: { min: 2, max: 8 },
      attrs: ['iq', 'ps', 'pp'],
      slotStart: 0,
      slotCount: 3,
    })
    expect(groups[1]).toMatchObject({
      diceCore: '1D6',
      exceptionalEligible: false,
      poolBounds: { min: 1, max: 6 },
      attrs: ['pb'],
      slotStart: 3,
      slotCount: 1,
    })
    expect(groups[2]).toMatchObject({
      diceCore: '2D6',
      exceptionalEligible: false,
      poolBounds: { min: 2, max: 12 },
      attrs: ['me', 'ma', 'pe', 'spd'],
      slotStart: 4,
      slotCount: 4,
    })
  })

  it('orders Wild Vampire pools as 1D6, 2D6, 3D6, 5D6', () => {
    const groups = buildAttributePoolDiceGroups(wildVampireFormulas)
    expect(groups.map((group) => group.diceCore)).toEqual([
      '1D6',
      '2D6',
      '3D6',
      '5D6',
    ])
    expect(groups[0]).toMatchObject({
      attrs: ['pe', 'pb'],
      slotStart: 0,
      slotCount: 2,
    })
    expect(groups[1]).toMatchObject({
      attrs: ['iq', 'ma'],
      slotStart: 2,
      slotCount: 2,
    })
    expect(groups[2]).toMatchObject({
      attrs: ['me', 'ps', 'pp'],
      slotStart: 4,
      slotCount: 3,
    })
    expect(groups[3]).toMatchObject({
      attrs: ['spd'],
      slotStart: 7,
      slotCount: 1,
    })
  })

  it('splits flat and modified 2D6 / 3D6 into separate pool groups', () => {
    const groups = buildAttributePoolDiceGroups(mixedFormulas)
    expect(groups).toHaveLength(4)
    expect(groups.map((group) => `${group.diceCore}${group.exceptionalEligible ? '*' : ''}`)).toEqual([
      '2D6',
      '2D6*',
      '3D6',
      '3D6*',
    ])
    expect(groups[0]).toMatchObject({
      diceCore: '2D6',
      exceptionalEligible: false,
      poolBounds: { min: 2, max: 12 },
      attrs: ['ps', 'spd'],
    })
    expect(groups[1]).toMatchObject({
      diceCore: '2D6',
      exceptionalEligible: true,
      poolBounds: { min: 2, max: 18 },
      attrs: ['ma', 'pb'],
    })
    expect(groups[2]).toMatchObject({
      diceCore: '3D6',
      exceptionalEligible: false,
      poolBounds: { min: 3, max: 18 },
      attrs: ['me', 'pe'],
    })
    expect(groups[3]).toMatchObject({
      diceCore: '3D6',
      exceptionalEligible: true,
      poolBounds: { min: 3, max: 30 },
      attrs: ['iq', 'pp'],
    })
  })

  it('sorts dice cores by faces then die count', () => {
    expect(
      compareAttributePoolGroupOrder(
        { diceCore: '2D4', exceptionalEligible: false },
        { diceCore: '1D6', exceptionalEligible: false },
      ),
    ).toBeLessThan(0)
    expect(
      compareAttributePoolGroupOrder(
        { diceCore: '1D6', exceptionalEligible: false },
        { diceCore: '2D6', exceptionalEligible: false },
      ),
    ).toBeLessThan(0)
    expect(
      compareAttributePoolGroupOrder(
        { diceCore: '3D6', exceptionalEligible: false },
        { diceCore: '5D6', exceptionalEligible: false },
      ),
    ).toBeLessThan(0)
  })

  it('converts dice-only pool rolls to assignment totals with race flats', () => {
    expect(raceAttrFlatBonus(guardianFormulas, 'iq')).toBe(16)
    expect(poolRollToAssignmentValue(guardianFormulas, 'iq', 5)).toBe(21)
    expect(poolRollToAssignmentValue(guardianFormulas, 'ps', 5)).toBe(19)
    expect(assignmentToPoolRoll(guardianFormulas, 'iq', 21)).toBe(5)
  })

  it('normalizes dice cores from full formulas', () => {
    expect(raceAttrDiceCore(guardianFormulas, 'iq')).toBe('2D4')
    expect(raceAttrDiceCore(guardianFormulas, 'pb')).toBe('1D6')
  })

  it('detects exceptional eligibility only on flat 2D6 / 3D6', () => {
    expect(raceAttrPoolExceptionalEligible(mixedFormulas, 'iq')).toBe(true)
    expect(raceAttrPoolExceptionalEligible(mixedFormulas, 'me')).toBe(false)
    expect(raceAttrPoolExceptionalEligible(mixedFormulas, 'ma')).toBe(true)
    expect(raceAttrPoolExceptionalEligible(mixedFormulas, 'ps')).toBe(false)
    expect(raceAttrPoolExceptionalEligible(guardianFormulas, 'me')).toBe(false)
  })

  it('bounds dice-core pool entries by exceptional profile', () => {
    expect(attributePoolDiceCoreBounds('2D4', false)).toEqual({ min: 2, max: 8 })
    expect(attributePoolDiceCoreBounds('2D6', true)).toEqual({ min: 2, max: 18 })
    expect(attributePoolDiceCoreBounds('2D6', false)).toEqual({ min: 2, max: 12 })
    expect(attributePoolDiceCoreBounds('1D6', false)).toEqual({ min: 1, max: 6 })
    expect(attributePoolDiceCoreBounds('3D6', true)).toEqual({ min: 3, max: 30 })
    expect(attributePoolDiceCoreBounds('3D6', false)).toEqual({ min: 3, max: 18 })
  })
})
