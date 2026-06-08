import type { Character } from '../types'
import { getFormState } from '../types'
import { computeCombatMirrorBonuses } from './characterDerived'
import { sheetSkillIdForCreationHandToHandTier } from './creationHandToHandChoice'
import {
  flattenCreationSkillIds,
  getCreationRelatedPicks,
  getCreationSecondaryPicks,
} from './creationSkillPicks'
import { aggregatePhysicalSkillCombatBonuses } from './skillPhysicalBonuses'

export type QuickActionTotals = {
  strike: number
  parry: number
  dodge: number
  rollWithImpact: number
}

function skillMeleeBonusFromIds(ids: Iterable<string>): {
  strike: number
  parry: number
  dodge: number
} {
  const agg = aggregatePhysicalSkillCombatBonuses([...ids])
  return {
    strike: agg.combat.strike ?? 0,
    parry: agg.combat.parry ?? 0,
    dodge: agg.combat.dodge ?? 0,
  }
}

export function collectUnlockedSkillIds(
  character: Character,
  activeForm: 'facade' | 'morphus',
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
 * (P.P. natural bonus + skill picks; Roll uses dodge + P.E. grit).
 */
export function computeQuickActionTotals(
  character: Character,
  activeForm: 'facade' | 'morphus',
): QuickActionTotals {
  const attrs = getFormState(character, activeForm).attributes
  const mirror = computeCombatMirrorBonuses(attrs)
  const skill = skillMeleeBonusFromIds(collectUnlockedSkillIds(character, activeForm))
  const strike = mirror.strike + skill.strike
  const parry = mirror.parry + skill.parry
  const dodge = mirror.dodge + skill.dodge
  const rollWithImpact = dodge + Math.floor(attrs.pe / 10)
  return { strike, parry, dodge, rollWithImpact }
}

export function formatBonus(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}
