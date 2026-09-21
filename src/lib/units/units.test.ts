import { describe, expect, it } from 'vitest'
import {
  characterHeightToMeters,
  celsiusToFahrenheitAbsolute,
  celsiusToFahrenheitDelta,
  cubicMetersToCubicFeet,
  feetToMeters,
  fahrenheitToCelsiusAbsolute,
  fahrenheitToCelsiusDelta,
  fillLengthMeasure,
  fillTemperatureMeasure,
  fillWeightMeasure,
  formatCharacterHeight,
  formatLength,
  formatTemperature,
  formatWeight,
  inchesToCentimeters,
  metersToCharacterHeight,
  milesToKilometers,
  mphToKmh,
  parseLengthFromProse,
  parseTemperatureFromProse,
  parseWeightFromProse,
  poundsToKilograms,
  resolveLength,
  resolveWeight,
  squareMetersToSquareFeet,
  yardsToMeters,
} from './index'

describe('gross conversion factors', () => {
  it('converts inches to whole centimeters', () => {
    expect(inchesToCentimeters(1)).toBe(3) // 2.5 → 3
    expect(inchesToCentimeters(4)).toBe(10)
  })

  it('converts feet to meters via inch ladder (nearest tenth)', () => {
    expect(feetToMeters(1)).toBe(0.3)
    expect(feetToMeters(100)).toBe(30)
  })

  it('uses 1:1 yards to meters only for yard quantities', () => {
    expect(yardsToMeters(5)).toBe(5)
  })

  it('converts miles to km at 1.6', () => {
    expect(milesToKilometers(1)).toBe(1.6)
    expect(milesToKilometers(2)).toBe(3.2)
  })

  it('converts pounds to kilograms at 0.5', () => {
    expect(poundsToKilograms(5)).toBe(2.5)
    expect(poundsToKilograms(11)).toBe(5.5)
  })

  it('converts absolute temperature with Palladium offset', () => {
    expect(fahrenheitToCelsiusAbsolute(39)).toBe(5) // (39-30)/2 = 4.5 → 5
    expect(celsiusToFahrenheitAbsolute(4)).toBe(38) // 8+30
  })

  it('converts temperature deltas at 1°F = ½°C', () => {
    expect(fahrenheitToCelsiusDelta(4)).toBe(2)
    expect(fahrenheitToCelsiusDelta(10)).toBe(5)
    expect(celsiusToFahrenheitDelta(5)).toBe(10)
  })

  it('converts speed, volume, and area', () => {
    expect(mphToKmh(5)).toBe(8)
    expect(cubicMetersToCubicFeet(1)).toBe(35)
    expect(squareMetersToSquareFeet(1)).toBe(10.8)
  })

  it('converts character height 5′10″ → 1.8 m', () => {
    expect(characterHeightToMeters(5, 10)).toBe(1.8)
  })

  it('converts meters to feet+inches at nearest whole inch', () => {
    // 1.8 m → 72 in via gross factor (may not round-trip 5′10″ after tenth rounding)
    expect(metersToCharacterHeight(1.8)).toEqual({ feet: 6, inches: 0 })
    expect(metersToCharacterHeight(1.75)).toEqual({ feet: 5, inches: 10 })
  })
})

describe('resolve dual measures', () => {
  it('prefers book dual values without recalculating', () => {
    const length = {
      feet: 100,
      meters: 30.5,
      standardUnit: 'feet' as const,
      bookDual: true,
    }
    expect(resolveLength(length, 'metric')).toEqual({
      value: 30.5,
      unit: 'm',
    })
    expect(formatLength(length, 'metric')).toBe('30.5 m')
  })

  it('calculates metric when only standard is known', () => {
    expect(resolveLength({ feet: 100, standardUnit: 'feet' }, 'metric')).toEqual(
      {
        value: 30,
        unit: 'm',
      },
    )
    expect(resolveWeight({ pounds: 11 }, 'metric')).toEqual({
      value: 5.5,
      unit: 'kg',
    })
  })

  it('uses yard ladder only when standardUnit is yards', () => {
    expect(
      resolveLength({ yards: 10, standardUnit: 'yards' }, 'metric'),
    ).toEqual({ value: 10, unit: 'm' })
    // 10 feet via inch ladder → 3.0 m, not 10 m
    expect(resolveLength({ feet: 10, standardUnit: 'feet' }, 'metric')).toEqual({
      value: 3,
      unit: 'm',
    })
  })

  it('formats character height for both systems', () => {
    expect(formatCharacterHeight({ feet: 5, inches: 10 }, 'metric')).toBe(
      '1.8 m',
    )
    // Single-side metric → nearest whole inch via gross factor (1.8 m → 6′0″)
    expect(formatCharacterHeight({ meters: 1.8 }, 'standard')).toBe('6\'0"')
    expect(
      formatCharacterHeight({ feet: 5, inches: 10, meters: 1.8 }, 'standard'),
    ).toBe('5\'10"')
  })
})

describe('fill missing side', () => {
  it('does not overwrite bookDual measures', () => {
    const filled = fillLengthMeasure({
      feet: 100,
      meters: 30.5,
      bookDual: true,
    })
    expect(filled.meters).toBe(30.5)
  })

  it('fills weight and temperature from one side', () => {
    expect(fillWeightMeasure({ pounds: 10 }).kilograms).toBe(5)
    expect(fillTemperatureMeasure({ fahrenheit: 39 }).celsius).toBe(5)
    expect(
      fillTemperatureMeasure({ fahrenheit: 10, isDelta: true }).celsius,
    ).toBe(5)
  })
})

describe('prose parsers for ingest', () => {
  it('parses dual feet/meters from book prose', () => {
    const parsed = parseLengthFromProse('Sense within 100 ft (30.5 m).')
    expect(parsed).toMatchObject({
      feet: 100,
      meters: 30.5,
      bookDual: true,
      standardUnit: 'feet',
    })
  })

  it('parses yards and miles dual forms', () => {
    expect(parseLengthFromProse('20 yards (20 m)')).toMatchObject({
      yards: 20,
      meters: 20,
      standardUnit: 'yards',
      bookDual: true,
    })
    expect(parseLengthFromProse('2 miles (3.2 km)')).toMatchObject({
      miles: 2,
      kilometers: 3.2,
      standardUnit: 'miles',
      bookDual: true,
    })
  })

  it('ignores dice length expressions', () => {
    expect(parseLengthFromProse('extend 1D4 feet (0.3-1.2 m)')).toBeUndefined()
  })

  it('parses weight and temperature dual forms', () => {
    expect(parseWeightFromProse('weighs 4.6 lb (2.0 kg)')).toMatchObject({
      pounds: 4.6,
      kilograms: 2,
      bookDual: true,
    })
    expect(parseTemperatureFromProse('39°F (4°C)')).toMatchObject({
      fahrenheit: 39,
      celsius: 4,
      bookDual: true,
    })
  })

  it('formats temperature deltas', () => {
    expect(
      formatTemperature({ fahrenheit: 4, isDelta: true }, 'metric'),
    ).toBe('+2°C')
  })
})
