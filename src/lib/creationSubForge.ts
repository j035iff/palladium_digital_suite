import type { PalladiumOcc, Race } from '../types'
import { NIGHTBANE_DUAL_FORM_RACE_ID } from './raceFormPolicy'
import { raceLineageFromDefinition } from './raceEngine'

/** Tab 6 sub-forge manifest id when race/O.C.C. requires a trait sub-forge. */
export function resolveCreationSubForgeId(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): string | undefined {
  const occForge = occ?.creationSubForgeId?.trim()
  if (occForge) return occForge
  const raceForge = race?.creationSubForgeId?.trim()
  if (raceForge) return raceForge
  if (
    raceLineageFromDefinition(race) === 'nightbane' ||
    race?.id === NIGHTBANE_DUAL_FORM_RACE_ID
  ) {
    return 'morphus_forge_manifest'
  }
  return undefined
}

export function traitForgeTabApplicable(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): boolean {
  return resolveCreationSubForgeId(race, occ) != null
}

export function traitForgeTabLabel(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): string {
  const id = resolveCreationSubForgeId(race, occ)
  if (id === 'morphus_forge_manifest') return 'Morphus Forge'
  if (id) return 'Trait Forge'
  return 'Traits'
}
