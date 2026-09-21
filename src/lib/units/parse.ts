/**
 * Lightweight prose parsers for ingest Pass A/B — extract dual measures from
 * book text like `100 ft (30.5 m)` or `39°F (4°C)`. Dice ranges are ignored.
 */

import type {
  LengthMeasure,
  LengthStandardUnit,
  SpeedMeasure,
  TemperatureMeasure,
  WeightMeasure,
} from './types'

function num(raw: string): number | undefined {
  const n = Number.parseFloat(raw.replace(/,/g, ''))
  return Number.isFinite(n) ? n : undefined
}

/**
 * Parse a dual length fragment. Returns undefined when no measurable length found.
 * Does not parse dice expressions (e.g. `1D4 feet`).
 */
export function parseLengthFromProse(text: string): LengthMeasure | undefined {
  if (/\d+D\d+/i.test(text)) {
    // Dice present — leave for later ingest rules (ignored for now).
    return undefined
  }

  const yardDual =
    /(\d+(?:\.\d+)?)\s*(?:yards?|yds?)\s*\((\d+(?:\.\d+)?)\s*m(?:eters?)?\)/i.exec(
      text,
    )
  if (yardDual) {
    return {
      yards: num(yardDual[1]),
      meters: num(yardDual[2]),
      standardUnit: 'yards',
      bookDual: true,
      display: yardDual[0],
    }
  }

  const mileDual =
    /(\d+(?:\.\d+)?)\s*(?:miles?|mi)\s*\((\d+(?:\.\d+)?)\s*km\)/i.exec(text)
  if (mileDual) {
    return {
      miles: num(mileDual[1]),
      kilometers: num(mileDual[2]),
      standardUnit: 'miles',
      bookDual: true,
      display: mileDual[0],
    }
  }

  const feetDual =
    /(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\s*\((\d+(?:\.\d+)?)\s*m(?:eters?)?\)/i.exec(
      text,
    )
  if (feetDual) {
    return {
      feet: num(feetDual[1]),
      meters: num(feetDual[2]),
      standardUnit: 'feet',
      bookDual: true,
      display: feetDual[0],
    }
  }

  const inchDual =
    /(\d+(?:\.\d+)?)\s*(?:inches|inch|in)\s*\((\d+(?:\.\d+)?)\s*cm\)/i.exec(text)
  if (inchDual) {
    return {
      inches: num(inchDual[1]),
      centimeters: num(inchDual[2]),
      standardUnit: 'inches',
      bookDual: true,
      display: inchDual[0],
    }
  }

  // Single-side standard
  const yardsOnly = /(\d+(?:\.\d+)?)\s*(?:yards?|yds?)\b/i.exec(text)
  if (yardsOnly) {
    return {
      yards: num(yardsOnly[1]),
      standardUnit: 'yards' satisfies LengthStandardUnit,
      bookDual: false,
      display: yardsOnly[0],
    }
  }
  const milesOnly = /(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/i.exec(text)
  if (milesOnly) {
    return {
      miles: num(milesOnly[1]),
      standardUnit: 'miles',
      bookDual: false,
      display: milesOnly[0],
    }
  }
  const feetOnly = /(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\b/i.exec(text)
  if (feetOnly) {
    return {
      feet: num(feetOnly[1]),
      standardUnit: 'feet',
      bookDual: false,
      display: feetOnly[0],
    }
  }
  const inchesOnly = /(\d+(?:\.\d+)?)\s*(?:inches|inch|in)\b/i.exec(text)
  if (inchesOnly) {
    return {
      inches: num(inchesOnly[1]),
      standardUnit: 'inches',
      bookDual: false,
      display: inchesOnly[0],
    }
  }

  return undefined
}

export function parseWeightFromProse(text: string): WeightMeasure | undefined {
  const dual =
    /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\s*\((\d+(?:\.\d+)?)\s*kg\)/i.exec(text)
  if (dual) {
    return {
      pounds: num(dual[1]),
      kilograms: num(dual[2]),
      bookDual: true,
      display: dual[0],
    }
  }
  const lb = /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b/i.exec(text)
  if (lb) {
    return { pounds: num(lb[1]), bookDual: false, display: lb[0] }
  }
  const kg = /(\d+(?:\.\d+)?)\s*kg\b/i.exec(text)
  if (kg) {
    return { kilograms: num(kg[1]), bookDual: false, display: kg[0] }
  }
  return undefined
}

export function parseTemperatureFromProse(
  text: string,
): TemperatureMeasure | undefined {
  const dual =
    /([+-]?\d+(?:\.\d+)?)\s*°?\s*F(?:ahrenheit)?\s*\(([+-]?\d+(?:\.\d+)?)\s*°?\s*C(?:elsius)?\)/i.exec(
      text,
    )
  if (dual) {
    const f = num(dual[1])
    const c = num(dual[2])
    const isDelta = dual[0].includes('+') || /alter|±|delta|by\s+\d/i.test(text)
    return {
      fahrenheit: f,
      celsius: c,
      isDelta,
      bookDual: true,
      display: dual[0],
    }
  }
  const fOnly = /([+-]?\d+(?:\.\d+)?)\s*°?\s*F(?:ahrenheit)?\b/i.exec(text)
  if (fOnly) {
    return {
      fahrenheit: num(fOnly[1]),
      isDelta: fOnly[1].startsWith('+') || fOnly[1].startsWith('-'),
      bookDual: false,
      display: fOnly[0],
    }
  }
  const cOnly = /([+-]?\d+(?:\.\d+)?)\s*°?\s*C(?:elsius)?\b/i.exec(text)
  if (cOnly) {
    return {
      celsius: num(cOnly[1]),
      isDelta: cOnly[1].startsWith('+') || cOnly[1].startsWith('-'),
      bookDual: false,
      display: cOnly[0],
    }
  }
  return undefined
}

export function parseSpeedFromProse(text: string): SpeedMeasure | undefined {
  const dual =
    /(\d+(?:\.\d+)?)\s*mph\s*\((\d+(?:\.\d+)?)\s*km(?:\/h|h)?\)/i.exec(text)
  if (dual) {
    return {
      mph: num(dual[1]),
      kmh: num(dual[2]),
      bookDual: true,
      display: dual[0],
    }
  }
  const mph = /(\d+(?:\.\d+)?)\s*mph\b/i.exec(text)
  if (mph) {
    return { mph: num(mph[1]), bookDual: false, display: mph[0] }
  }
  return undefined
}
