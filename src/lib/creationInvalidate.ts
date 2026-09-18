import type { CharacterRootState, CreationSkillPick } from '../types'
import { listOccCoreVoucherTasks } from './occCoreSkillVouchers'
import { invalidateForgeFromConfiguratorChange } from './forgeNavigation/characterCreationForge'
import { clearMorphusForgeSlotState } from './morphusSlotResolution'

export type CreationInvalidationScope = 'race' | 'occ' | 'specialization'

/**
 * True when the player has started Morphus Sub-Forge work that a race change would wipe.
 * Used to gate the race-change confirm dialog.
 */
export function characterHasMorphusSettingsDefined(
  character: Pick<
    CharacterRootState,
    | 'morphusForgeState'
    | 'morphusForgeSlotState'
    | 'morphusTraitSlotResolutions'
    | 'activeMorphusCharacteristicIds'
    | 'creationTraitForgeStubComplete'
    | 'creationMorphusDiceFinalized'
  >,
): boolean {
  const forge = character.morphusForgeState
  if (forge?.path) return true
  if (forge?.appearanceEntryId) return true
  if (forge?.characteristicsPickCount != null) return true
  if (character.creationTraitForgeStubComplete === true) return true
  if (character.creationMorphusDiceFinalized === true) return true
  if ((character.morphusTraitSlotResolutions?.length ?? 0) > 0) return true
  if ((character.activeMorphusCharacteristicIds?.length ?? 0) > 0) return true
  const slots = character.morphusForgeSlotState
  if (!slots) return false
  return Boolean(
    (slots.picks && Object.keys(slots.picks).length > 0) ||
      (slots.routingPicks && Object.keys(slots.routingPicks).length > 0) ||
      (slots.branchTableIds && Object.keys(slots.branchTableIds).length > 0) ||
      (slots.diceValues && Object.keys(slots.diceValues).length > 0) ||
      (slots.variantPicks && Object.keys(slots.variantPicks).length > 0) ||
      (slots.subTraitPicks && Object.keys(slots.subTraitPicks).length > 0) ||
      (slots.customInstances && Object.keys(slots.customInstances).length > 0),
  )
}

/** Wipe Morphus Sub-Forge + trait slot state (race change only). */
export function clearMorphusCreationStatePatch(): Partial<CharacterRootState> {
  return {
    morphusForgeState: undefined,
    morphusForgeSlotState: clearMorphusForgeSlotState(),
    morphusTraitSlotResolutions: [],
    activeMorphusCharacteristicIds: [],
    creationTraitForgeStubComplete: false,
    creationMorphusDiceFinalized: false,
  }
}

/**
 * Forge-first invalidation: retain player data, clear downstream tab completion (yellow on revisit).
 * Morphus Sub-Forge state is wiped **only on race change** (with UI confirm when defined).
 * O.C.C. / specialization change leaves Morphus intact but yellows forge tabs.
 */
export function creationInvalidationPatch(
  _prev: CharacterRootState,
  scope: CreationInvalidationScope,
): Partial<CharacterRootState> {
  const forge = invalidateForgeFromConfiguratorChange(_prev)

  if (scope === 'race') {
    return {
      ...forge,
      ...clearMorphusCreationStatePatch(),
      creationPsychicTierChosen: false,
    }
  }

  if (scope === 'occ' || scope === 'specialization') {
    return {
      ...forge,
      creationPsychicTierChosen: false,
    }
  }

  return forge
}

export function initialOccCoreVoucherPicks(
  prev: CharacterRootState,
  occ: Parameters<typeof listOccCoreVoucherTasks>[0],
): Record<string, readonly (CreationSkillPick | null)[]> {
  const tasks = listOccCoreVoucherTasks(occ, prev.occSpecializationId)
  const out: Record<string, readonly (CreationSkillPick | null)[]> = {}
  for (const t of tasks) {
    out[t.id] = Array.from({ length: t.entry.choiceCount }, () => null)
  }
  return out
}
