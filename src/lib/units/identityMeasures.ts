/**
 * Identity profile Height / Weight at the UI boundary.
 * Canonical persist: heightFeet / heightInches / weightLbs (US Customary strings).
 * Display/edit follows {@link MeasurementSystem} via shared convert helpers — no parallel path.
 * Metric height is whole centimeters only (e.g. 178 cm).
 */

import {
  characterHeightToCentimeters,
  centimetersToCharacterHeight,
  kilogramsToPounds,
  poundsToKilograms,
} from './convert'
import type { MeasurementSystem } from './types'
import { characterHeightUnitLabel, weightUnitLabel } from './format'
import { identityWholeNumberInputError } from '../characterIdentity'

function formatFieldNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n)
}

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

export function identityWeightUnitLabel(system: MeasurementSystem): string {
  return weightUnitLabel(system)
}

export function identityHeightMetricUnitLabel(): string {
  return characterHeightUnitLabel('metric')
}

/** Display weight in the preferred system from persisted lbs string. */
export function identityWeightToDisplay(
  weightLbsRaw: string,
  system: MeasurementSystem,
): string {
  const trimmed = weightLbsRaw.trim()
  if (!trimmed) return ''
  const lbs = parseOptionalNumber(trimmed)
  if (lbs == null) return trimmed
  if (system === 'metric') return formatFieldNumber(poundsToKilograms(lbs))
  return formatFieldNumber(lbs)
}

/**
 * Parse a preferred-system weight field into canonical whole-lbs string for persist.
 * Empty → ''; invalid → null (caller keeps draft / shows error).
 */
export function identityWeightFromDisplay(
  raw: string,
  system: MeasurementSystem,
): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const n = parseOptionalNumber(trimmed)
  if (n == null || n < 0) return null
  const lbs = system === 'metric' ? kilogramsToPounds(n) : n
  if (!Number.isFinite(lbs) || lbs < 0) return null
  return String(Math.round(lbs))
}

export function identityWeightDisplayError(
  raw: string,
  system: MeasurementSystem,
): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (system === 'standard') return identityWholeNumberInputError(trimmed)
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return 'must be a number'
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return 'must be a number'
  return null
}

export type IdentityHeightStandardDisplay = {
  system: 'standard'
  feet: string
  inches: string
}

export type IdentityHeightMetricDisplay = {
  system: 'metric'
  centimeters: string
}

export type IdentityHeightDisplay =
  | IdentityHeightStandardDisplay
  | IdentityHeightMetricDisplay

/** Build preferred-system height display from persisted ft/in strings. */
export function identityHeightToDisplay(
  heightFeetRaw: string,
  heightInchesRaw: string,
  system: MeasurementSystem,
): IdentityHeightDisplay {
  if (system === 'standard') {
    return {
      system: 'standard',
      feet: heightFeetRaw,
      inches: heightInchesRaw,
    }
  }
  const ftTrim = heightFeetRaw.trim()
  const inTrim = heightInchesRaw.trim()
  if (!ftTrim && !inTrim) {
    return { system: 'metric', centimeters: '' }
  }
  const feet = parseOptionalNumber(ftTrim)
  const inches = parseOptionalNumber(inTrim)
  if (feet == null && inches == null) {
    return { system: 'metric', centimeters: '' }
  }
  const centimeters = characterHeightToCentimeters(feet ?? 0, inches ?? 0)
  return { system: 'metric', centimeters: formatFieldNumber(centimeters) }
}

/**
 * Metric centimeters (or empty) → canonical heightFeet / heightInches strings.
 * Invalid → null.
 */
export function identityHeightFromMetricDisplay(
  centimetersRaw: string,
): { heightFeet: string; heightInches: string } | null {
  const trimmed = centimetersRaw.trim()
  if (!trimmed) return { heightFeet: '', heightInches: '' }
  const centimeters = parseOptionalNumber(trimmed)
  if (centimeters == null || centimeters < 0) return null
  if (!Number.isInteger(centimeters)) return null
  const { feet, inches } = centimetersToCharacterHeight(centimeters)
  return {
    heightFeet: String(feet),
    heightInches: String(inches),
  }
}

export function identityHeightMetricDisplayError(raw: string): string | null {
  return identityWholeNumberInputError(raw)
}
