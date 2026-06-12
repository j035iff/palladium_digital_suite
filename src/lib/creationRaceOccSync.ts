import { getLibraryOccById, getRaceById } from '../data/library/registry'
import { rollFacadeSdcMaximum } from './spawnFinalVitality'
import { resolveEffectivePalladiumOcc } from './occComposition'
import { DEFAULT_RACE_ID } from './raceFormPolicy'
import type { CharacterRootState } from '../types'

/** Recompute Facade max S.D.C. from race vitals + O.C.C. tags (pre–vitality commit only). */
export function syncRaceOccFacadeSdc(prev: CharacterRootState): CharacterRootState {
  if (prev.creationVitalityCommitted) return prev
  const race = getRaceById(prev.raceId ?? DEFAULT_RACE_ID)
  const lib = getLibraryOccById(prev.occ.id)
  if (!race || !lib || race.vitals?.sdc == null) return prev
  const occ = resolveEffectivePalladiumOcc(lib, prev.occSpecializationId)
  const max = rollFacadeSdcMaximum(prev.facade.attributes, { race, occ })
  const cur = Math.min(prev.facade.structuralDamageCapacity.current, max)
  return {
    ...prev,
    facade: {
      ...prev.facade,
      structuralDamageCapacity: {
        ...prev.facade.structuralDamageCapacity,
        maximum: max,
        current: cur,
      },
    },
  }
}
