import type { Character } from '../types'
import { getLibraryOccById, getRaceById } from '../data/library/registry'
import {
  assessAbilitiesBudgetBlockers,
  resolveEffectiveCreationAbilityBudget,
} from './creationAbilityBudget'
import type { CharacterRootState } from '../types'
import { occRelatedSkillSlotBudget } from './occCreationDerivation'
import { creationUsesOccSkillProgram, resolveCreationOccLibraryRow } from './shadowOcc'
import {
  assessAttributesBlockers,
  assessConfiguratorBlockers,
  assessOccVariableBlockers,
} from './creationStep'
import {
  assessRelatedSkillSlotBlockers,
  creationRelatedSkillCap,
  resolveCreationPsychicTier,
} from './creationPsychicSkills'
import { assessRelatedSkillCategoryMinimumBlockers } from './occRelatedSkillMinimums'
import {
  assessOccCoreVoucherBlockers,
  resolveOccCoreSkillPicks,
} from './occCoreSkillVouchers'
import {
  getCreationRelatedPicks,
  sumRelatedPoolSlotUsage,
} from './creationSkillPicks'
import { resolveEffectivePalladiumOcc } from './occComposition'
import { creationHandToHandReservedRelatedSlots } from './creationHandToHandChoice'
import { occSkillSlotPolicy } from './occCatalogEngine'
import { raceLineageFromDefinition } from './raceEngine'
import { creationAttributesBlockerLabel } from './creationFormLabels'

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
 * Pillar 8 — enable Review once mandatory gates through abilities are done.
 * Pending dice are resolved on the Roll Pending and Traits tabs before Review.
 */
export function assessCreationReviewBlockers(
  character: Character & Pick<Partial<CharacterRootState>, 'creationGenreId'>,
): string[] {
  const blockers: string[] = []
  const race = character.raceId?.trim()
    ? getRaceById(character.raceId)
    : undefined
  const occLib = creationUsesOccSkillProgram(race)
    ? resolveCreationOccLibraryRow(race, character.occ.id)
    : undefined

  blockers.push(...assessConfiguratorBlockers(character, race, occLib))
  blockers.push(...assessAttributesBlockers(character, occLib, race))
  blockers.push(...assessOccVariableBlockers(character, occLib))

  const supportsDualForm = raceLineageFromDefinition(race) === 'nightbane'

  if (!attrsPlausible(character.primary.attributes)) {
    blockers.push(creationAttributesBlockerLabel(supportsDualForm, 'human'))
  }
  if (supportsDualForm && !attrsPlausible(character.morphus.attributes)) {
    blockers.push(creationAttributesBlockerLabel(supportsDualForm, 'morphus'))
  }

  if (occLib) {
    blockers.push(
      ...assessOccCoreVoucherBlockers(
        occLib,
        character.occSpecializationId,
        character.creationOccCoreVoucherPicks ?? {},
        character.creationOccGrantPickDetails,
        character,
      ),
    )

    const effectiveOcc = resolveEffectivePalladiumOcc(
      occLib,
      character.occSpecializationId,
    )
    const relatedBase =
      character.occRelatedSkillSlotBudget ?? occRelatedSkillSlotBudget(occLib)
    const relatedPicks = getCreationRelatedPicks(character)
    const occPicks = resolveOccCoreSkillPicks(
      occLib,
      character.occSpecializationId,
      character.creationOccCoreVoucherPicks ?? {},
      character.creationOccGrantPickDetails,
    )
    const psychicTier = resolveCreationPsychicTier(character)
    const relatedCap = creationRelatedSkillCap(
      relatedBase,
      psychicTier,
      occSkillSlotPolicy(occLib),
    )
    const handToHandReserved = creationHandToHandReservedRelatedSlots(
      effectiveOcc,
      character,
    )
    const relatedSelected = sumRelatedPoolSlotUsage(
      relatedPicks,
      occPicks,
      handToHandReserved,
    )
    blockers.push(
      ...assessRelatedSkillSlotBlockers(
        relatedSelected,
        relatedBase,
        psychicTier,
        occLib,
        handToHandReserved,
      ),
    )
    blockers.push(
      ...assessRelatedSkillCategoryMinimumBlockers(
        occLib,
        relatedPicks,
        character.occSpecializationId,
      ),
    )
  }

  const psychicTier = resolveCreationPsychicTier(character)
  blockers.push(
    ...assessAbilitiesBudgetBlockers({
      budget: resolveEffectiveCreationAbilityBudget({
        occ: occLib,
        raceId: character.raceId,
        psychicTier,
        psychicGateBypassed: character.psychicGateBypassed === true,
        majorAllocation: character.creationPsychicGateMajorAllocation,
        storedBudget: character.creationAbilityBudget,
        creationGenreId: character.creationGenreId,
      }),
      creationGenreId: character.creationGenreId,
      selectedIds: character.selectedAbilities,
      occ: occLib,
      psychicTier,
      psychicGateBypassed: character.psychicGateBypassed === true,
      majorAllocation: character.creationPsychicGateMajorAllocation,
    }),
  )

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

  const supportsDualForm =
    opts?.supportsDualForm ??
    raceLineageFromDefinition(
      character.raceId?.trim() ? getRaceById(character.raceId) : undefined,
    ) === 'nightbane'

  if (character.creationPrimaryDiceFinalized !== true) {
    blockers.push(
      'Complete all pending dice on the Roll Pending tab before Review & Spawn.',
    )
  }
  if (supportsDualForm && character.creationMorphusDiceFinalized !== true) {
    blockers.push(
      'Complete Morphus dice on the Traits tab before Review & Spawn.',
    )
  }

  return blockers
}
