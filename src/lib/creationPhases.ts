import type { Character, PalladiumOcc, Race } from '../types'
import { isGenreSupernaturalAbilitiesDisallowed } from '../data/genres'
import { getRaceById } from '../data/library/registry'
import { occPsychicGateBypassed } from './occCatalogEngine'
import type { OccCreationAbilityBudget } from './occCreationDerivation'
import { DEFAULT_RACE_ID } from './raceFormPolicy'

export function sumCreationAbilityBudget(
  budget: OccCreationAbilityBudget | undefined | null,
): number {
  if (!budget) return 0
  return budget.spellSlots + budget.psionicSlots + budget.talentSlots
}

export function creationNeedsAbilitySelection(
  budget: OccCreationAbilityBudget | undefined | null,
  creationGenreId?: string,
): boolean {
  if (creationGenreId && isGenreSupernaturalAbilitiesDisallowed(creationGenreId)) {
    return false
  }
  return sumCreationAbilityBudget(budget) > 0
}

/** Race forbids Psychic Gate rolls (`palladium-race.schema.json` — none / innate). */
export function raceExplicitlyBypassesPsychicGate(race: Race | undefined): boolean {
  const cap = race?.psionics.capabilityType
  return cap === 'none' || cap === 'innate'
}

/**
 * Psychic Gate is skipped when the creation genre forbids supernatural play, or when
 * race / O.C.C. data explicitly disallows the gate.
 */
export function resolvePsychicGateBypassed(
  raceId: string | undefined,
  occ?: PalladiumOcc,
  creationGenreId?: string,
): boolean {
  if (creationGenreId && isGenreSupernaturalAbilitiesDisallowed(creationGenreId)) {
    return true
  }
  const race = getRaceById(raceId ?? DEFAULT_RACE_ID)
  if (raceExplicitlyBypassesPsychicGate(race)) return true
  if (occ && occPsychicGateBypassed(occ)) return true
  return false
}

export function creationShowsPsychicGate(
  character: Pick<Character, 'raceId'>,
  occ: PalladiumOcc | undefined,
  creationGenreId: string,
): boolean {
  return !resolvePsychicGateBypassed(character.raceId, occ, creationGenreId)
}

/** Phase III: ability picker when genre and O.C.C. allow supernatural picks. */
export function creationNeedsAbilityPhase(
  budget: OccCreationAbilityBudget | undefined | null,
  creationGenreId: string,
): boolean {
  return creationNeedsAbilitySelection(budget, creationGenreId)
}
