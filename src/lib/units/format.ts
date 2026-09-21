import type { MeasurementSystem } from './types'
import {
  resolveArea,
  resolveCharacterHeight,
  resolveLength,
  resolveSpeed,
  resolveTemperature,
  resolveVolume,
  resolveWeight,
} from './resolve'
import type {
  AreaMeasure,
  CharacterHeightMeasure,
  LengthMeasure,
  SpeedMeasure,
  TemperatureMeasure,
  VolumeMeasure,
  WeightMeasure,
} from './types'

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value)
}

export function formatResolved(
  resolved: { value: number; unit: string } | undefined,
): string {
  if (!resolved) return ''
  return `${formatNumber(resolved.value)} ${resolved.unit}`
}

export function formatLength(
  measure: LengthMeasure,
  system: MeasurementSystem,
): string {
  return formatResolved(resolveLength(measure, system))
}

export function formatWeight(
  measure: WeightMeasure,
  system: MeasurementSystem,
): string {
  return formatResolved(resolveWeight(measure, system))
}

export function formatTemperature(
  measure: TemperatureMeasure,
  system: MeasurementSystem,
): string {
  const resolved = resolveTemperature(measure, system)
  if (!resolved) return ''
  const sign =
    measure.isDelta && resolved.value > 0
      ? '+'
      : measure.isDelta && resolved.value < 0
        ? ''
        : ''
  return `${sign}${formatNumber(resolved.value)}${resolved.unit}`
}

export function formatSpeed(
  measure: SpeedMeasure,
  system: MeasurementSystem,
): string {
  return formatResolved(resolveSpeed(measure, system))
}

export function formatVolume(
  measure: VolumeMeasure,
  system: MeasurementSystem,
): string {
  return formatResolved(resolveVolume(measure, system))
}

export function formatArea(
  measure: AreaMeasure,
  system: MeasurementSystem,
): string {
  return formatResolved(resolveArea(measure, system))
}

export function formatCharacterHeight(
  measure: CharacterHeightMeasure,
  system: MeasurementSystem,
): string {
  const resolved = resolveCharacterHeight(measure, system)
  if (!resolved) return ''
  if (resolved.system === 'metric') {
    return `${formatNumber(resolved.meters)} m`
  }
  return `${resolved.feet}'${resolved.inches}"`
}

/** Unit labels for form fields (Gear Forge, identity, etc.). */
export function weightUnitLabel(system: MeasurementSystem): string {
  return system === 'metric' ? 'kg' : 'lbs'
}

export function lengthUnitLabel(
  system: MeasurementSystem,
  opts?: { subFoot?: boolean },
): string {
  if (system === 'metric') return opts?.subFoot ? 'cm' : 'm'
  return opts?.subFoot ? 'in' : 'ft'
}
