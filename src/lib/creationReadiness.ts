import type { Character } from '../types'
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import { DEFAULT_RACE_ID } from './raceFormPolicy'
import { creationNeedsAbilitySelection } from './creationPhases'
import type { CharacterRootState } from '../types'
import {
  occCreationAbilityBudget,
  occRelatedSkillSlotBudget,
} from './occCreationDerivation'
import { raceCanPickOcc } from './raceEngine'
import {
  assessAttributesBlockers,
  assessConfiguratorBlockers,
  assessOccVariableBlockers,
} from './creationStep'
import {
  listPendingDiceEntries,
  pendingDiceResolutionsComplete,
} from './pendingDiceLedger'
import {
  assessRelatedSkillSlotBlockers,
  resolveCreationPsychicTier,
} from './creationPsychicSkills'

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
 * Pillar 8 — enable Review & Finalize once mandatory gates through abilities are done.
 * Pending vitality dice are resolved on the Review screen itself.
 */
export function assessCreationReviewBlockers(
  character: Character & Pick<Partial<CharacterRootState>, 'creationGenreId'>,
): string[] {
  const blockers: string[] = []
  const race = getRaceById(character.raceId ?? DEFAULT_RACE_ID)
  const picksOcc = raceCanPickOcc(race)
  const occLib = picksOcc ? getLibraryOccById(character.occ.id) : undefined

  blockers.push(...assessConfiguratorBlockers(character, race, occLib))
  blockers.push(...assessAttributesBlockers(character, occLib))
  blockers.push(...assessOccVariableBlockers(character, occLib))

  if (!attrsPlausible(character.facade.attributes)) {
    blockers.push(
      'Facade attributes look incomplete or invalid — finish attribute allocation.',
    )
  }
  if (!attrsPlausible(character.morphus.attributes)) {
    blockers.push(
      'Morphus attributes look incomplete or invalid — finish attribute allocation.',
    )
  }

  const occSkills = character.creationOccSkillIds ?? []
  if (picksOcc && occSkills.length < 1) {
    blockers.push('Select at least one O.C.C. skill.')
  }

  if (picksOcc && occLib) {
    const relatedBase =
      character.occRelatedSkillSlotBudget ?? occRelatedSkillSlotBudget(occLib)
    const relatedSelected = character.creationRelatedSkillIds ?? []
    const psychicTier = resolveCreationPsychicTier(character)
    blockers.push(
      ...assessRelatedSkillSlotBlockers(
        relatedSelected.length,
        relatedBase,
        psychicTier,
        occLib,
      ),
    )
  }

  const abilityBudget = occLib
    ? occCreationAbilityBudget(occLib)
    : character.creationAbilityBudget
  if (creationNeedsAbilitySelection(abilityBudget, character.creationGenreId)) {
    const abs = character.selectedAbilities ?? []
    if (abs.length < 1) {
      blockers.push('Pick at least one supernatural ability.')
    }
  }

  return blockers
}

/**
 * Pillar 8 — radical visibility: block Spawn until the mirrored build is coherent.
 */
export function assessCreationSpawnBlockers(
  character: Character & Pick<Partial<CharacterRootState>, 'creationGenreId'>,
  opts?: { psychicTier?: string; supportsDualForm?: boolean },
): string[] {
  const blockers = assessCreationReviewBlockers(character)

  const race = getRaceById(character.raceId ?? DEFAULT_RACE_ID)
  const occLib = getLibraryOccById(character.occ.id)
  const pending = listPendingDiceEntries(character, race, occLib, {
    supportsDualForm: opts?.supportsDualForm ?? false,
    psychicTier: opts?.psychicTier ?? 'none',
  })
  if (
    !pendingDiceResolutionsComplete(
      pending,
      character.creationPendingDiceResolutions ?? {},
    )
  ) {
    blockers.push('Enter all pending dice results on the Review screen.')
  }

  if (!character.creationVitalityCommitted) {
    blockers.push('Commit vitality pools on the Review screen.')
  }

  return blockers
}
