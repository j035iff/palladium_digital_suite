import type { CharacterRootState } from '../types'
import { listOccCoreVoucherTasks } from './occCoreSkillVouchers'

export type CreationInvalidationScope = 'race' | 'occ' | 'specialization'

function emptyVoucherPicks(): CharacterRootState['creationOccCoreVoucherPicks'] {
  return {}
}

/** Clear downstream creation state when configurator identity changes (Pillar 8). */
export function creationInvalidationPatch(
  _prev: CharacterRootState,
  scope: CreationInvalidationScope,
): Partial<CharacterRootState> {
  const shared: Partial<CharacterRootState> = {
    creationOccVariableResolutions: {},
    creationOccCoreVoucherPicks: emptyVoucherPicks(),
    creationPendingDiceResolutions: {},
    creationVitalityCommitted: false,
  }

  if (scope === 'race') {
    return {
      ...shared,
      creationAttributePool: Array.from({ length: 8 }, () => null),
      creationAttributeAssignments: {},
      creationOccSkillIds: [],
      creationRelatedSkillIds: [],
      creationPsychicTier: undefined,
      selectedAbilities: [],
    }
  }

  if (scope === 'occ' || scope === 'specialization') {
    return {
      ...shared,
      selectedAbilities: [],
    }
  }

  return shared
}

export function initialOccCoreVoucherPicks(
  prev: CharacterRootState,
  occ: Parameters<typeof listOccCoreVoucherTasks>[0],
): Record<string, readonly string[]> {
  const tasks = listOccCoreVoucherTasks(occ, prev.occSpecializationId)
  const out: Record<string, readonly string[]> = {}
  for (const t of tasks) {
    out[t.id] = []
  }
  return out
}
