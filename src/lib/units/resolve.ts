import {
  characterHeightToMeters,
  centimetersToInches,
  cubicFeetToCubicMeters,
  cubicMetersToCubicFeet,
  celsiusToFahrenheitAbsolute,
  celsiusToFahrenheitDelta,
  feetToMeters,
  fahrenheitToCelsiusAbsolute,
  fahrenheitToCelsiusDelta,
  inchesToCentimeters,
  inchesToMetricLength,
  kilogramsToPounds,
  kilometersToMiles,
  kmhToMph,
  metersToCharacterHeight,
  metersToYards,
  milesToKilometers,
  mphToKmh,
  poundsToKilograms,
  squareFeetToSquareMeters,
  squareMetersToSquareFeet,
  yardsToMeters,
} from './convert'
import { INCHES_PER_FOOT, METERS_PER_FOOT } from './constants'
import type {
  AreaMeasure,
  CharacterHeightMeasure,
  LengthMeasure,
  LengthStandardUnit,
  MeasurementSystem,
  SpeedMeasure,
  TemperatureMeasure,
  VolumeMeasure,
  WeightMeasure,
} from './types'

function hasFinite(n: number | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

export function lengthStandardUnit(measure: LengthMeasure): LengthStandardUnit {
  if (measure.standardUnit) return measure.standardUnit
  if (hasFinite(measure.miles)) return 'miles'
  if (hasFinite(measure.yards)) return 'yards'
  if (hasFinite(measure.inches) && !hasFinite(measure.feet)) return 'inches'
  return 'feet'
}

function totalInchesFromStandard(measure: LengthMeasure): number | undefined {
  const unit = lengthStandardUnit(measure)
  if (unit === 'miles' && hasFinite(measure.miles)) {
    return measure.miles * 5280 * INCHES_PER_FOOT
  }
  if (unit === 'yards' && hasFinite(measure.yards)) {
    return measure.yards * 3 * INCHES_PER_FOOT
  }
  if (unit === 'inches' && hasFinite(measure.inches)) {
    return measure.inches
  }
  let inches = 0
  let any = false
  if (hasFinite(measure.feet)) {
    inches += measure.feet * INCHES_PER_FOOT
    any = true
  }
  if (hasFinite(measure.inches)) {
    inches += measure.inches
    any = true
  }
  return any ? inches : undefined
}

/**
 * Resolve a dual length to the preferred system.
 * Book dual values win; otherwise convert from the known side.
 */
export function resolveLength(
  measure: LengthMeasure,
  system: MeasurementSystem,
): { value: number; unit: string } | undefined {
  const unit = lengthStandardUnit(measure)

  if (system === 'standard') {
    if (unit === 'miles' && hasFinite(measure.miles)) {
      return { value: measure.miles, unit: 'mi' }
    }
    if (unit === 'yards' && hasFinite(measure.yards)) {
      return { value: measure.yards, unit: 'yd' }
    }
    if (unit === 'inches' && hasFinite(measure.inches)) {
      return { value: measure.inches, unit: 'in' }
    }
    if (hasFinite(measure.feet)) {
      return { value: measure.feet, unit: 'ft' }
    }
    if (unit === 'miles' && hasFinite(measure.kilometers)) {
      return { value: kilometersToMiles(measure.kilometers), unit: 'mi' }
    }
    if (unit === 'yards' && hasFinite(measure.meters)) {
      return { value: metersToYards(measure.meters), unit: 'yd' }
    }
    if (hasFinite(measure.centimeters) && !hasFinite(measure.meters)) {
      return { value: centimetersToInches(measure.centimeters), unit: 'in' }
    }
    if (hasFinite(measure.meters)) {
      if (unit === 'inches') {
        return {
          value: centimetersToInches(measure.meters * 100),
          unit: 'in',
        }
      }
      return {
        value: Math.round((measure.meters / METERS_PER_FOOT) * 10) / 10,
        unit: 'ft',
      }
    }
    if (hasFinite(measure.kilometers)) {
      return { value: kilometersToMiles(measure.kilometers), unit: 'mi' }
    }
    return undefined
  }

  // metric
  if (unit === 'miles') {
    if (hasFinite(measure.kilometers)) {
      return { value: measure.kilometers, unit: 'km' }
    }
    if (hasFinite(measure.miles)) {
      return { value: milesToKilometers(measure.miles), unit: 'km' }
    }
  }
  if (unit === 'yards') {
    if (hasFinite(measure.meters)) {
      return { value: measure.meters, unit: 'm' }
    }
    if (hasFinite(measure.yards)) {
      return { value: yardsToMeters(measure.yards), unit: 'm' }
    }
  }
  if (hasFinite(measure.centimeters) && !hasFinite(measure.meters)) {
    return { value: measure.centimeters, unit: 'cm' }
  }
  if (hasFinite(measure.meters)) {
    return { value: measure.meters, unit: 'm' }
  }
  if (hasFinite(measure.kilometers)) {
    return { value: measure.kilometers, unit: 'km' }
  }

  if (unit === 'inches' && hasFinite(measure.inches)) {
    const metric = inchesToMetricLength(measure.inches)
    if (metric.centimeters != null) {
      return { value: metric.centimeters, unit: 'cm' }
    }
    if (metric.meters != null) {
      return { value: metric.meters, unit: 'm' }
    }
  }

  const totalInches = totalInchesFromStandard(measure)
  if (totalInches != null) {
    if (unit === 'yards' && hasFinite(measure.yards)) {
      return { value: yardsToMeters(measure.yards), unit: 'm' }
    }
    if (unit === 'miles' && hasFinite(measure.miles)) {
      return { value: milesToKilometers(measure.miles), unit: 'km' }
    }
    const metric = inchesToMetricLength(totalInches)
    if (metric.centimeters != null) {
      return { value: metric.centimeters, unit: 'cm' }
    }
    if (metric.meters != null) {
      return { value: metric.meters, unit: 'm' }
    }
  }

  return undefined
}

export function resolveWeight(
  measure: WeightMeasure,
  system: MeasurementSystem,
): { value: number; unit: string } | undefined {
  if (system === 'standard') {
    if (hasFinite(measure.pounds)) return { value: measure.pounds, unit: 'lbs' }
    if (hasFinite(measure.kilograms)) {
      return { value: kilogramsToPounds(measure.kilograms), unit: 'lbs' }
    }
    return undefined
  }
  if (hasFinite(measure.kilograms)) return { value: measure.kilograms, unit: 'kg' }
  if (hasFinite(measure.pounds)) {
    return { value: poundsToKilograms(measure.pounds), unit: 'kg' }
  }
  return undefined
}

export function resolveTemperature(
  measure: TemperatureMeasure,
  system: MeasurementSystem,
): { value: number; unit: string } | undefined {
  const delta = measure.isDelta === true
  if (system === 'standard') {
    if (hasFinite(measure.fahrenheit)) {
      return { value: measure.fahrenheit, unit: '°F' }
    }
    if (hasFinite(measure.celsius)) {
      const value = delta
        ? celsiusToFahrenheitDelta(measure.celsius)
        : celsiusToFahrenheitAbsolute(measure.celsius)
      return { value, unit: '°F' }
    }
    return undefined
  }
  if (hasFinite(measure.celsius)) return { value: measure.celsius, unit: '°C' }
  if (hasFinite(measure.fahrenheit)) {
    const value = delta
      ? fahrenheitToCelsiusDelta(measure.fahrenheit)
      : fahrenheitToCelsiusAbsolute(measure.fahrenheit)
    return { value, unit: '°C' }
  }
  return undefined
}

export function resolveSpeed(
  measure: SpeedMeasure,
  system: MeasurementSystem,
): { value: number; unit: string } | undefined {
  if (system === 'standard') {
    if (hasFinite(measure.mph)) return { value: measure.mph, unit: 'mph' }
    if (hasFinite(measure.kmh)) return { value: kmhToMph(measure.kmh), unit: 'mph' }
    return undefined
  }
  if (hasFinite(measure.kmh)) return { value: measure.kmh, unit: 'km/h' }
  if (hasFinite(measure.mph)) return { value: mphToKmh(measure.mph), unit: 'km/h' }
  return undefined
}

export function resolveVolume(
  measure: VolumeMeasure,
  system: MeasurementSystem,
): { value: number; unit: string } | undefined {
  if (system === 'standard') {
    if (hasFinite(measure.cubicFeet)) {
      return { value: measure.cubicFeet, unit: 'cu ft' }
    }
    if (hasFinite(measure.cubicMeters)) {
      return {
        value: cubicMetersToCubicFeet(measure.cubicMeters),
        unit: 'cu ft',
      }
    }
    return undefined
  }
  if (hasFinite(measure.cubicMeters)) {
    return { value: measure.cubicMeters, unit: 'm³' }
  }
  if (hasFinite(measure.cubicFeet)) {
    return { value: cubicFeetToCubicMeters(measure.cubicFeet), unit: 'm³' }
  }
  return undefined
}

export function resolveArea(
  measure: AreaMeasure,
  system: MeasurementSystem,
): { value: number; unit: string } | undefined {
  if (system === 'standard') {
    if (hasFinite(measure.squareFeet)) {
      return { value: measure.squareFeet, unit: 'sq ft' }
    }
    if (hasFinite(measure.squareMeters)) {
      return {
        value: squareMetersToSquareFeet(measure.squareMeters),
        unit: 'sq ft',
      }
    }
    return undefined
  }
  if (hasFinite(measure.squareMeters)) {
    return { value: measure.squareMeters, unit: 'm²' }
  }
  if (hasFinite(measure.squareFeet)) {
    return { value: squareFeetToSquareMeters(measure.squareFeet), unit: 'm²' }
  }
  return undefined
}

export function resolveCharacterHeight(
  measure: CharacterHeightMeasure,
  system: MeasurementSystem,
):
  | { system: 'standard'; feet: number; inches: number }
  | { system: 'metric'; meters: number }
  | undefined {
  const hasStandard = hasFinite(measure.feet) || hasFinite(measure.inches)
  const hasMetric = hasFinite(measure.meters)

  if (system === 'standard') {
    if (hasStandard) {
      return {
        system: 'standard',
        feet: measure.feet ?? 0,
        inches: measure.inches ?? 0,
      }
    }
    if (hasMetric) {
      const { feet, inches } = metersToCharacterHeight(measure.meters!)
      return { system: 'standard', feet, inches }
    }
    return undefined
  }

  if (hasMetric) {
    return { system: 'metric', meters: measure.meters! }
  }
  if (hasStandard) {
    return {
      system: 'metric',
      meters: characterHeightToMeters(measure.feet ?? 0, measure.inches ?? 0),
    }
  }
  return undefined
}

/** Fill missing side of a length measure via engine conversion (custom / single-side). */
export function fillLengthMeasure(measure: LengthMeasure): LengthMeasure {
  if (measure.bookDual) return { ...measure }

  const unit = lengthStandardUnit(measure)
  const out: LengthMeasure = { ...measure, standardUnit: unit }

  const hasStd =
    hasFinite(measure.inches) ||
    hasFinite(measure.feet) ||
    hasFinite(measure.yards) ||
    hasFinite(measure.miles)
  const hasMetric =
    hasFinite(measure.centimeters) ||
    hasFinite(measure.meters) ||
    hasFinite(measure.kilometers)

  if (hasStd && hasMetric) return out

  if (hasStd && !hasMetric) {
    if (unit === 'miles' && hasFinite(measure.miles)) {
      out.kilometers = milesToKilometers(measure.miles)
    } else if (unit === 'yards' && hasFinite(measure.yards)) {
      out.meters = yardsToMeters(measure.yards)
    } else if (unit === 'inches' && hasFinite(measure.inches)) {
      const metric = inchesToMetricLength(measure.inches)
      if (metric.centimeters != null) out.centimeters = metric.centimeters
      if (metric.meters != null) out.meters = metric.meters
    } else {
      const totalInches = totalInchesFromStandard(measure)
      if (totalInches != null) {
        const metric = inchesToMetricLength(totalInches)
        if (metric.centimeters != null) out.centimeters = metric.centimeters
        if (metric.meters != null) out.meters = metric.meters
      } else if (hasFinite(measure.feet)) {
        out.meters = feetToMeters(measure.feet)
      }
    }
  }

  if (hasMetric && !hasStd) {
    if (unit === 'miles' && hasFinite(measure.kilometers)) {
      out.miles = kilometersToMiles(measure.kilometers)
    } else if (unit === 'yards' && hasFinite(measure.meters)) {
      out.yards = metersToYards(measure.meters)
    } else if (hasFinite(measure.centimeters) && !hasFinite(measure.meters)) {
      out.inches = centimetersToInches(measure.centimeters)
    } else if (hasFinite(measure.meters)) {
      out.feet = Math.round((measure.meters / METERS_PER_FOOT) * 10) / 10
    } else if (hasFinite(measure.kilometers)) {
      out.miles = kilometersToMiles(measure.kilometers)
    }
  }

  return out
}

export function fillWeightMeasure(measure: WeightMeasure): WeightMeasure {
  if (measure.bookDual) return { ...measure }
  const out = { ...measure }
  if (hasFinite(measure.pounds) && !hasFinite(measure.kilograms)) {
    out.kilograms = poundsToKilograms(measure.pounds)
  } else if (hasFinite(measure.kilograms) && !hasFinite(measure.pounds)) {
    out.pounds = kilogramsToPounds(measure.kilograms)
  }
  return out
}

export function fillTemperatureMeasure(
  measure: TemperatureMeasure,
): TemperatureMeasure {
  if (measure.bookDual) return { ...measure }
  const out = { ...measure }
  const delta = measure.isDelta === true
  if (hasFinite(measure.fahrenheit) && !hasFinite(measure.celsius)) {
    out.celsius = delta
      ? fahrenheitToCelsiusDelta(measure.fahrenheit)
      : fahrenheitToCelsiusAbsolute(measure.fahrenheit)
  } else if (hasFinite(measure.celsius) && !hasFinite(measure.fahrenheit)) {
    out.fahrenheit = delta
      ? celsiusToFahrenheitDelta(measure.celsius)
      : celsiusToFahrenheitAbsolute(measure.celsius)
  }
  return out
}

/** Convenience: cm for sub-foot custom lengths; meters otherwise. */
export function convertFeetToDisplayMetric(feet: number): {
  value: number
  unit: 'cm' | 'm'
} {
  if (feet < 1) {
    return { value: inchesToCentimeters(feet * INCHES_PER_FOOT), unit: 'cm' }
  }
  return { value: feetToMeters(feet), unit: 'm' }
}
