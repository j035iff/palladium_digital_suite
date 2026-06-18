import type { Character, PalladiumOcc, Race } from '../types'
import { isGenreSupernaturalAbilitiesDisallowed } from '../data/genres'
import { getRaceById } from '../data/library/registry'
import { occCharacterCategory, occPsychicGateBypassed } from './occCatalogEngine'
import type { OccCreationAbilityBudget } from './occCreationDerivation'

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
  const race = raceId?.trim()
    ? getRaceById(raceId, creationGenreId)
    : undefined
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

/** Psychic-class O.C.C. (e.g. Mind Melter) — tier is locked to Master. */
export function occIsNaturalPsychicClass(occ: PalladiumOcc | undefined): boolean {
  if (!occ) return false
  return occCharacterCategory(occ) === 'psychic'
}

/**
 * Player must pick None / Minor / Major on Psychic Gate — only when the race allows
 * psionics and the O.C.C. is not a natural psychic class.
 */
export function creationPsychicGateRequiresTierChoice(
  character: Pick<Character, 'raceId'>,
  occ: PalladiumOcc | undefined,
  creationGenreId: string,
): boolean {
  return (
    creationShowsPsychicGate(character, occ, creationGenreId) &&
    !occIsNaturalPsychicClass(occ)
  )
}

/** Psychic Gate step is satisfied (hidden, bypassed, or natural psychic auto-complete). */
export function isCreationPsychicTierComplete(
  character: Pick<Character, 'raceId' | 'creationPsychicTierChosen'>,
  occ: PalladiumOcc | undefined,
  creationGenreId: string,
): boolean {
  if (!creationPsychicGateRequiresTierChoice(character, occ, creationGenreId)) {
    return true
  }
  return character.creationPsychicTierChosen === true
}

/** Phase III: ability picker when genre and O.C.C. allow supernatural picks. */
export function creationNeedsAbilityPhase(
  budget: OccCreationAbilityBudget | undefined | null,
  creationGenreId: string,
): boolean {
  return creationNeedsAbilitySelection(budget, creationGenreId)
}
