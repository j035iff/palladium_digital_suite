import { getLibraryOccById, getRaceById, raceCatalogGenreId } from '../data/library/registry'
import { rollPrimarySdcMaximum } from './spawnFinalVitality'
import { resolveEffectivePalladiumOcc } from './occComposition'
import { DEFAULT_RACE_ID } from './raceFormPolicy'
import type { CharacterRootState } from '../types'

/** Recompute Facade max S.D.C. from race vitals + O.C.C. tags (pre–vitality commit only). */
export function syncRaceOccPrimarySdc(prev: CharacterRootState): CharacterRootState {
  if (prev.creationVitalityCommitted) return prev
  const race = getRaceById(
    prev.raceId ?? DEFAULT_RACE_ID,
    raceCatalogGenreId(prev.hostGenreId, prev.creationGenreId),
  )
  const lib = getLibraryOccById(prev.occ.id)
  if (!race || !lib || race.vitals?.sdc == null) return prev
  const occ = resolveEffectivePalladiumOcc(lib, prev.occSpecializationId)
  const max = rollPrimarySdcMaximum(prev.primary.attributes, { race, occ })
  const cur = Math.min(prev.primary.structuralDamageCapacity.current, max)
  return {
    ...prev,
    primary: {
      ...prev.primary,
      structuralDamageCapacity: {
        ...prev.primary.structuralDamageCapacity,
        maximum: max,
        current: cur,
      },
    },
  }
}
