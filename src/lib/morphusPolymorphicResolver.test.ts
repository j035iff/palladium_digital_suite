import { describe, expect, it } from 'vitest'
import {
  applyMorphusAttributeMinFloor,
  polymorphicDeltaFromBase,
  resolveStatWithPolymorphicModifiers,
} from './morphusPolymorphicResolver'

describe('morphusPolymorphicResolver', () => {
  const animalMagnetism = [{ flat: 8, minValue: 20 }] as const

  it('defers minValue until floors are applied at finalize', () => {
    expect(
      resolveStatWithPolymorphicModifiers(11, animalMagnetism, { applyFloors: false }),
    ).toBe(19)
    expect(polymorphicDeltaFromBase(11, animalMagnetism, { applyFloors: false })).toBe(8)
    expect(
      resolveStatWithPolymorphicModifiers(12, animalMagnetism, { applyFloors: false }),
    ).toBe(20)
    expect(polymorphicDeltaFromBase(12, animalMagnetism, { applyFloors: false })).toBe(8)
  })

  it('applies minValue after all bonuses when floors are enabled', () => {
    expect(resolveStatWithPolymorphicModifiers(11, animalMagnetism)).toBe(20)
    expect(polymorphicDeltaFromBase(11, animalMagnetism)).toBe(9)
    expect(resolveStatWithPolymorphicModifiers(12, animalMagnetism)).toBe(20)
    expect(polymorphicDeltaFromBase(12, animalMagnetism)).toBe(8)
    expect(resolveStatWithPolymorphicModifiers(15, animalMagnetism)).toBe(23)
  })

  it('applies deferred attribute minimum after trait bonuses are summed', () => {
    expect(applyMorphusAttributeMinFloor(19, 20)).toBe(20)
    expect(applyMorphusAttributeMinFloor(23, 20)).toBe(23)
  })

  it('applies maxValue caps after modifier math', () => {
    expect(resolveStatWithPolymorphicModifiers(18, [{ flat: 4, maxValue: 19 }])).toBe(
      19,
    )
  })
})
