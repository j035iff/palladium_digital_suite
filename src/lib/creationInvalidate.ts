import type { CharacterRootState, CreationSkillPick } from '../types'
import { listOccCoreVoucherTasks } from './occCoreSkillVouchers'
import { invalidateForgeFromConfiguratorChange } from './forgeNavigation/characterCreationForge'

export type CreationInvalidationScope = 'race' | 'occ' | 'specialization'

/**
 * Forge-first invalidation: retain player data, clear downstream tab completion (yellow on revisit).
 * Does not wipe skills, attributes, or psychic tier — user repairs flagged tabs top-down.
 */
export function creationInvalidationPatch(
  _prev: CharacterRootState,
  scope: CreationInvalidationScope,
): Partial<CharacterRootState> {
  const forge = invalidateForgeFromConfiguratorChange(_prev)

  if (scope === 'race') {
    return {
      ...forge,
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
