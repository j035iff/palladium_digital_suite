import type { Character } from '../types'

/** Canonical id for the dual Facade / Morphus sheet (Nightbane). */
export const NIGHTBANE_DUAL_FORM_RACE_ID = 'nightbane' as const

/** Default playable race when none is stored on the character record. */
export const DEFAULT_RACE_ID = 'race_human' as const

/** True only for Nightbane — all other races use a single mechanical form (primary branch). */
export function characterHasDualForms(
  c: Pick<Character, 'raceId'>,
): boolean {
  const id = c.raceId?.trim()
  if (!id) return false
  return id === NIGHTBANE_DUAL_FORM_RACE_ID
}
