import type { MeasurementSystem } from './types'

export const UNITS_PREFERENCE_STORAGE_KEY = 'pds:unitsPreference'

export const DEFAULT_MEASUREMENT_SYSTEM: MeasurementSystem = 'standard'

export function isMeasurementSystem(value: unknown): value is MeasurementSystem {
  return value === 'standard' || value === 'metric'
}

export function readUnitsPreference(): MeasurementSystem {
  try {
    const raw = localStorage.getItem(UNITS_PREFERENCE_STORAGE_KEY)
    if (isMeasurementSystem(raw)) return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_MEASUREMENT_SYSTEM
}

export function writeUnitsPreference(system: MeasurementSystem): void {
  try {
    localStorage.setItem(UNITS_PREFERENCE_STORAGE_KEY, system)
  } catch {
    /* ignore */
  }
}
