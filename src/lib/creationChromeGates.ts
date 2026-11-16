import type { PalladiumOcc, Race } from '../types'
import { occIsNaturalPsychicClass } from './creationPhases'
import { traitForgeTabApplicable } from './creationSubForge'
import { NIGHTBANE_DUAL_FORM_RACE_ID } from './raceFormPolicy'

/**
 * Traits / Morphus master tab applies only when the race/OCC binds a trait
 * sub-forge (Nightbane Morphus). Not lineage-based — Guardian stays out.
 */
export function creationTraitsTabVisible(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): boolean {
  return traitForgeTabApplicable(race, occ)
}

/**
 * Talents lane chrome — sole gate is catalog `talentsAvailable` on race and/or OCC.
 * No hard-coded race/OCC name checks.
 */
export function creationTalentsAvailable(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): boolean {
  return race?.talentsAvailable === true || occ?.talentsAvailable === true
}

/**
 * Random Psionics tab — Joe hide exception for psychic O.C.C./R.C.C.
 * Uses the same natural-psychic signal as the forge Black path today.
 */
export function creationRandomPsionicsTabHiddenForPsychicClass(
  occ: PalladiumOcc | undefined,
): boolean {
  return occIsNaturalPsychicClass(occ)
}

/** Dev Skip → Morphus — Nightbane dual-form race only. */
export function creationDevSkipToMorphusVisible(raceId: string | undefined): boolean {
  const id = raceId?.trim()
  return id === NIGHTBANE_DUAL_FORM_RACE_ID
}
