import { describe, expect, it } from 'vitest'
import { parsePhysicalDiceRoll } from './diceNotation'
import { diceCoreBounds, diceNotationBounds } from './diceNotationBounds'
import { createPhysicalPendingRoll } from './creationPhysicalDice'

describe('parsePhysicalDiceRoll', () => {
  it('splits dice from trailing flat modifiers', () => {
    expect(parsePhysicalDiceRoll('1D6X10+20')).toEqual({
      diceNotation: '1d6*10',
      flatBonus: 20,
    })
    expect(parsePhysicalDiceRoll('1D6+2')).toEqual({
      diceNotation: '1d6',
      flatBonus: 2,
    })
    expect(parsePhysicalDiceRoll('1D6+4')).toEqual({
      diceNotation: '1d6',
      flatBonus: 4,
    })
  })

  it('keeps negative dice rolls intact', () => {
    expect(parsePhysicalDiceRoll('-1D6')).toEqual({
      diceNotation: '-1d6',
      flatBonus: 0,
    })
  })
})

describe('diceCoreBounds', () => {
  it('bounds physical rolls without bundled flats', () => {
    expect(diceCoreBounds('1D6X10+20')).toEqual({ min: 10, max: 60 })
    expect(diceCoreBounds('1D6+2')).toEqual({ min: 1, max: 6 })
  })

  it('full bounds still include flats for legacy callers', () => {
    expect(diceNotationBounds('1D6X10+20')).toEqual({ min: 30, max: 80 })
  })
})

describe('createPhysicalPendingRoll', () => {
  it('builds Review rows with dice-only notation and range', () => {
    const { roll, flatBonus } = createPhysicalPendingRoll(
      'morphus_sdc',
      'trait',
      0,
      'Cyclops/Giant',
      '1D6x10+20',
    )
    expect(flatBonus).toBe(20)
    expect(roll.notation).toBe('1D6x10')
    expect(roll.min).toBe(10)
    expect(roll.max).toBe(60)
  })
})
