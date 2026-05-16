import type { Character } from '../types'
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import { DEFAULT_RACE_ID } from './raceFormPolicy'
import { raceCanPickOcc } from './raceEngine'

function attrsPlausible(attrs: {
  iq: number
  me: number
  ma: number
  pp: number
  pe: number
  pb: number
  spd: number
  ps: { score: number }
}): boolean {
  const scalars = [
    attrs.iq,
    attrs.me,
    attrs.ma,
    attrs.pp,
    attrs.pe,
    attrs.pb,
    attrs.spd,
    attrs.ps.score,
  ]
  return scalars.every((n) => Number.isFinite(n) && n >= 1 && n <= 48)
}

/**
 * Pillar 8 — radical visibility: block Spawn until the mirrored build is coherent.
 */
export function assessCreationSpawnBlockers(character: Character): string[] {
  const blockers: string[] = []

  const race = getRaceById(character.raceId ?? DEFAULT_RACE_ID)
  const picksOcc = raceCanPickOcc(race)

  if (picksOcc && (!character.occ?.id || !character.occ?.xpTable?.floors?.length)) {
    blockers.push('Choose an O.C.C. (Step 0 — O.C.C. selection).')
  }

  const occLib = picksOcc ? getLibraryOccById(character.occ.id) : undefined
  if (
    picksOcc &&
    occLib?.specializations?.length &&
    !character.occSpecializationId
  ) {
    blockers.push('Choose an O.C.C. specialization (Step 0 — sub-class branch).')
  }

  if (!attrsPlausible(character.facade.attributes)) {
    blockers.push(
      'Facade attributes look incomplete or invalid — finish the Attribute Forge (all stats ≥ 1).',
    )
  }
  if (!attrsPlausible(character.morphus.attributes)) {
    blockers.push(
      'Morphus attributes look incomplete or invalid — finish the Attribute Forge.',
    )
  }

  const occ = character.creationOccSkillIds ?? []
  if (picksOcc && occ.length < 1) {
    blockers.push(
      'Select at least one O.C.C. skill (Step 3 — Skill Engine).',
    )
  }

  if (!character.creationVitalityCommitted) {
    blockers.push(
      'Roll and commit final H.P., S.D.C., P.P.E., and I.S.P. pools (Spawn panel).',
    )
  }

  const abs = character.selectedAbilities ?? []
  if (abs.length < 1) {
    blockers.push(
      'No supernatural abilities selected — pick at least one power in Step 4.',
    )
  }

  return blockers
}
