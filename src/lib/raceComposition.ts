import type { Race, RaceComposition } from '../types'

/** Infer composition when omitted on legacy rows. */
export function resolveRaceComposition(race: Race | undefined): RaceComposition {
  if (!race) return 'character'
  if (race.raceComposition) return race.raceComposition
  if (race.raceAudience === 'creature') return 'creature'
  if (race.forcedOccId?.trim()) return 'rcc'
  if (race.canPickOcc !== false) return 'character'
  return 'character'
}

export function isCreatureRace(race: Race | undefined): boolean {
  return resolveRaceComposition(race) === 'creature'
}

export function isRccRace(race: Race | undefined): boolean {
  return resolveRaceComposition(race) === 'rcc'
}

/** True when the build mounts an O.C.C. skill program (player pick or shadow R.C.C.). */
export function raceUsesOccSkillProgram(race: Race | undefined): boolean {
  if (!race || isCreatureRace(race)) return false
  if (race.canPickOcc !== false) return true
  return Boolean(race.forcedOccId?.trim())
}
