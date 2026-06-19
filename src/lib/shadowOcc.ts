import { getOccById, getLibraryOccById, snapshotOccForCharacter } from '../data/occDefinitions'
import { CREATION_PLACEHOLDER_OCC, retainCharacterRoot } from './characterRoot'
import { syncCreationAttributeBranches } from './creationAttributeSync'
import { creationInvalidationPatch } from './creationInvalidate'
import { syncRaceOccPrimarySdc } from './creationRaceOccSync'
import { characterHasDualForms } from './raceFormPolicy'
import { raceCanPickOcc } from './raceEngine'
import { raceUsesOccSkillProgram } from './raceComposition'
import { resolvePsychicGateBypassed } from './creationPhases'
import { applyPsychicTierToFormState } from './psychicGate'
import {
  applyOccStartingSkillPicks,
  patchCharacterCreationFromOcc,
} from './occCreationDerivation'
import type {
  ActiveForm,
  CharacterRootState,
  PalladiumOcc,
  PsychicTier,
  Race,
} from '../types'
import { getFormState } from '../types'

export function raceForcedOccId(race: Race | undefined): string | undefined {
  const id = race?.forcedOccId?.trim()
  return id || undefined
}

/** True when the build uses an O.C.C. skill program (player pick or shadow auto-mount). */
export function creationUsesOccSkillProgram(race: Race | undefined): boolean {
  return raceUsesOccSkillProgram(race)
}

export function resolveCreationOccLibraryRow(
  race: Race | undefined,
  characterOccId: string | undefined | null,
): PalladiumOcc | undefined {
  if (!race) return undefined
  const forced = raceForcedOccId(race)
  if (!raceCanPickOcc(race)) {
    return forced ? getLibraryOccById(forced) : undefined
  }
  const id = characterOccId?.trim()
  return id ? getLibraryOccById(id) : undefined
}

/** Shadow-mounted R.C.C. skill programs must not lock the race catalog. */
export function configuratorRaceColumnIgnoresActiveOcc(
  race: Race | undefined,
): boolean {
  return race != null && !raceCanPickOcc(race)
}

export function shadowOccMountMessage(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): string | null {
  if (!race || raceCanPickOcc(race)) return null
  const forced = raceForcedOccId(race)
  if (!forced || occ?.id !== forced) return null
  return `${race.name} R.C.C. skills auto-mounted from ${occ.name}.`
}

export type OccSelectionMountOptions = {
  activeForm: ActiveForm
  invalidateScope?: 'race' | 'occ'
  autoMountFromRace?: Pick<Race, 'name'>
}

export function applyOccSelectionToCharacterState(
  prev: CharacterRootState,
  occId: string,
  options: OccSelectionMountOptions,
): CharacterRootState {
  const def = getOccById(occId)
  const lib = getLibraryOccById(occId)
  if (!def || !lib) return prev

  const form: ActiveForm = characterHasDualForms(prev) ? options.activeForm : 'primary'
  const isPsychicOcc = def.category === 'psychic'
  const tier: PsychicTier = isPsychicOcc ? 'master' : 'none'
  const gateBypassed = resolvePsychicGateBypassed(
    prev.raceId,
    lib,
    prev.creationGenreId,
  )
  const nextBranch = gateBypassed
    ? getFormState(prev, form)
    : applyPsychicTierToFormState(getFormState(prev, form), tier)
  const invalidated = {
    ...prev,
    ...creationInvalidationPatch(prev, options.invalidateScope ?? 'occ'),
    [form]: nextBranch,
    occ: snapshotOccForCharacter(def),
    occSpecializationId: undefined,
    creationPsychicTier: tier,
    creationPsychicTierChosen: isPsychicOcc && !gateBypassed,
  }
  const withOcc = applyOccStartingSkillPicks(
    patchCharacterCreationFromOcc(invalidated, lib),
    lib,
  )
  const next = syncRaceOccPrimarySdc(
    syncCreationAttributeBranches(retainCharacterRoot(prev, withOcc), lib),
  )

  if (options.autoMountFromRace) {
    console.info(
      `[Shadow O.C.C.] ${options.autoMountFromRace.name} R.C.C. skills auto-mounted from ${def.name}.`,
    )
  }

  return next
}

export function clearOccSelectionState(
  prev: CharacterRootState,
  activeForm: ActiveForm,
): CharacterRootState {
  const form: ActiveForm = characterHasDualForms(prev) ? activeForm : 'primary'
  return syncRaceOccPrimarySdc({
    ...prev,
    ...creationInvalidationPatch(prev, 'occ'),
    occ: CREATION_PLACEHOLDER_OCC,
    occSpecializationId: undefined,
    creationPsychicTier: 'none',
    creationPsychicTierChosen: false,
    [form]: getFormState(prev, form),
  })
}
