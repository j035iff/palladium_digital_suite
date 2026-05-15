import type { Character } from '../types'
import { getFormState } from '../types'
import { computeCombatMirrorBonuses } from './characterDerived'

/** Sheet skills that grant melee combat modifiers (until full H2H module). */
const SKILL_MELEE: Record<
  string,
  { strike?: number; parry?: number; dodge?: number }
> = {
  boxing: { strike: 1, parry: 1 },
  wrestling: { parry: 1 },
  acrobat: { dodge: 1 },
}

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
  let strike = 0
  let parry = 0
  let dodge = 0
  for (const id of ids) {
    const b = SKILL_MELEE[id]
    if (!b) continue
    strike += b.strike ?? 0
    parry += b.parry ?? 0
    dodge += b.dodge ?? 0
  }
  return { strike, parry, dodge }
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
  for (const id of character.creationRelatedSkillIds ?? []) {
    ids.add(id)
  }
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
