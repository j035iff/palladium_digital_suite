import {
  CM_PER_INCH,
  CUBIC_FEET_PER_CUBIC_METER,
  INCHES_PER_FOOT,
  KG_PER_LB,
  KM_PER_MILE,
  KMH_PER_MPH,
  METERS_PER_FOOT,
  METERS_PER_YARD,
  SQUARE_FEET_PER_SQUARE_METER,
} from './constants'

/** Round to nearest tenth (e.g. 2.4 kg, 1.6 km). */
export function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

/** Round to nearest whole number. */
export function roundWhole(value: number): number {
  return Math.round(value)
}

/** Inches → centimeters (nearest whole cm when used for sub-foot lengths). */
export function inchesToCentimeters(inches: number): number {
  return roundWhole(inches * CM_PER_INCH)
}

export function centimetersToInches(cm: number): number {
  return roundWhole(cm / CM_PER_INCH)
}

/**
 * Feet → meters via inch ladder (not yards).
 * Length ≥ 1 foot: nearest tenth meter.
 */
export function feetToMeters(feet: number): number {
  return roundTenth(feet * METERS_PER_FOOT)
}

export function metersToFeet(meters: number): number {
  return roundTenth(meters / METERS_PER_FOOT)
}

/** Yards ↔ meters 1:1, nearest tenth — only when the book used yards. */
export function yardsToMeters(yards: number): number {
  return roundTenth(yards * METERS_PER_YARD)
}

export function metersToYards(meters: number): number {
  return roundTenth(meters / METERS_PER_YARD)
}

export function milesToKilometers(miles: number): number {
  return roundTenth(miles * KM_PER_MILE)
}

export function kilometersToMiles(km: number): number {
  return roundTenth(km / KM_PER_MILE)
}

/**
 * Total length in inches → metric.
 * &lt; 1 foot → whole centimeters; ≥ 1 foot → meters to nearest tenth.
 */
export function inchesToMetricLength(totalInches: number): {
  centimeters?: number
  meters?: number
} {
  if (totalInches < INCHES_PER_FOOT) {
    return { centimeters: inchesToCentimeters(totalInches) }
  }
  return { meters: roundTenth((totalInches * CM_PER_INCH) / 100) }
}

export function poundsToKilograms(pounds: number): number {
  return roundTenth(pounds * KG_PER_LB)
}

export function kilogramsToPounds(kg: number): number {
  return roundTenth(kg / KG_PER_LB)
}

/** Absolute temperature: (F − 30) / 2 → C, nearest whole. */
export function fahrenheitToCelsiusAbsolute(f: number): number {
  return roundWhole((f - 30) / 2)
}

export function celsiusToFahrenheitAbsolute(c: number): number {
  return roundWhole(c * 2 + 30)
}

/** Temperature deltas: 1°F = ½°C, nearest whole. */
export function fahrenheitToCelsiusDelta(f: number): number {
  return roundWhole(f / 2)
}

export function celsiusToFahrenheitDelta(c: number): number {
  return roundWhole(c * 2)
}

export function mphToKmh(mph: number): number {
  return roundTenth(mph * KMH_PER_MPH)
}

export function kmhToMph(kmh: number): number {
  return roundTenth(kmh / KMH_PER_MPH)
}

export function cubicMetersToCubicFeet(m3: number): number {
  return roundTenth(m3 * CUBIC_FEET_PER_CUBIC_METER)
}

export function cubicFeetToCubicMeters(ft3: number): number {
  return roundTenth(ft3 / CUBIC_FEET_PER_CUBIC_METER)
}

export function squareMetersToSquareFeet(m2: number): number {
  return roundTenth(m2 * SQUARE_FEET_PER_SQUARE_METER)
}

export function squareFeetToSquareMeters(ft2: number): number {
  return roundTenth(ft2 / SQUARE_FEET_PER_SQUARE_METER)
}

/**
 * Character height: feet + inches → meters (nearest tenth).
 * Example: 5′10″ → 1.8 m.
 */
export function characterHeightToMeters(feet: number, inches: number): number {
  const totalInches = Math.max(0, feet) * INCHES_PER_FOOT + Math.max(0, inches)
  return roundTenth((totalInches * CM_PER_INCH) / 100)
}

/** Character height: meters → feet + inches (nearest whole inch). */
export function metersToCharacterHeight(meters: number): {
  feet: number
  inches: number
} {
  const totalInches = Math.max(0, roundWhole((meters * 100) / CM_PER_INCH))
  const feet = Math.floor(totalInches / INCHES_PER_FOOT)
  const inches = totalInches % INCHES_PER_FOOT
  return { feet, inches }
}
