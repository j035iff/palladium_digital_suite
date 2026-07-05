import type { Character } from '../types'
import { buildLiveCombatContext, resolveLiveQuickActionTotals } from './liveStatEngine'
import { sheetSkillIdForCreationHandToHandTier } from './creationHandToHandChoice'
import {
  flattenCreationSkillIds,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import { getFormState } from '../types'

export type QuickActionTotals = {
  strike: number
  parry: number
  dodge: number
  rollWithImpact: number
}

export function collectUnlockedSkillIds(
  character: Character,
  activeForm: 'primary' | 'morphus',
): Set<string> {
  const ids = new Set<string>()
  const branch = getFormState(character, activeForm)
  for (const s of branch.skills) {
    if (!s.restricted) ids.add(s.id)
  }
  for (const id of character.creationOccSkillIds ?? []) {
    ids.add(id)
  }
  for (const id of [
    ...flattenCreationSkillIds(getCreationRelatedPicks(character)),
    ...flattenCreationSkillIds(getCreationSecondaryPicks(character)),
  ]) {
    ids.add(id)
  }
  const hthId = sheetSkillIdForCreationHandToHandTier(
    character.creationHandToHandTier,
  )
  if (hthId) ids.add(hthId)
  return ids
}

/**
 * Total Strike / Parry / Dodge / Roll with Impact for the active form
 * (creation stat engine — display attrs + skills + passive + HtH when available).
 */
export function computeQuickActionTotals(
  character: Character,
  activeForm: 'primary' | 'morphus',
): QuickActionTotals {
  const ctx = buildLiveCombatContext(character, activeForm)
  return resolveLiveQuickActionTotals(ctx)
}

export function formatBonus(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}
