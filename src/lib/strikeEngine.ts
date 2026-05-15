import type { Character, Weapon } from '../types'
import { getFormState } from '../types'
import { computeCombatMirrorBonuses, computeLiveBonuses } from './characterDerived'
import { calculateSkillPercent } from './skillEquation'
import { getSkillById } from '../data/skillLibrary'
import { collectUnlockedSkillIds } from './combatQuickBonuses'

/** Map W.P. / H2H skill % to a d20 strike bonus (demo curve; scales with level). */
export function wpStrikeBonusFromSkillPercent(skillTotalPercent: number): number {
  if (!Number.isFinite(skillTotalPercent) || skillTotalPercent <= 0) return 0
  return Math.min(10, Math.max(0, Math.floor(skillTotalPercent / 10) - 2))
}

export type StrikeBreakdown = {
  ppBonus: number
  wpBonus: number
  weaponBonus: number
  total: number
  /** W.P. or H2H skill name for UI; null if none applied. */
  skillSourceLabel: string | null
}

function iqBonusForSkills(character: Character, activeForm: 'facade' | 'morphus'): number {
  const attrs = getFormState(character, activeForm).attributes
  return computeLiveBonuses(attrs).iqOccSkillPercent
}

/**
 * Total strike on d20: **P.P. natural + W.P. (or H2H) skill bonus + weapon intrinsic bonus**
 * (combat_logic.md, master_flow.md).
 */
export function computeWeaponStrikeBreakdown(
  character: Character,
  activeForm: 'facade' | 'morphus',
  weapon: Weapon,
): StrikeBreakdown {
  const attrs = getFormState(character, activeForm).attributes
  const mirror = computeCombatMirrorBonuses(attrs)
  const ppBonus = mirror.strike
  const weaponBonus = weapon.strikeBonus
  const iq = iqBonusForSkills(character, activeForm)
  const unlocked = collectUnlockedSkillIds(character, activeForm)

  let wpBonus = 0
  let skillSourceLabel: string | null = null
  const wpId = weapon.linkedWpSkillId
  if (wpId && unlocked.has(wpId)) {
    const def = getSkillById(wpId)
    if (def) {
      const pct = calculateSkillPercent(def, character.level, iq)
      wpBonus = wpStrikeBonusFromSkillPercent(pct)
      skillSourceLabel = def.name
    }
  }

  return {
    ppBonus,
    wpBonus,
    weaponBonus,
    total: ppBonus + wpBonus + weaponBonus,
    skillSourceLabel,
  }
}

const HAND_TO_HAND_SKILL_ID = 'hand_to_hand_basic'

/**
 * Unarmed strike when no weapon is readied: P.P. + Hand-to-Hand skill (if known) + 0 weapon bonus.
 */
export function computeUnarmedStrikeBreakdown(
  character: Character,
  activeForm: 'facade' | 'morphus',
): StrikeBreakdown {
  const attrs = getFormState(character, activeForm).attributes
  const mirror = computeCombatMirrorBonuses(attrs)
  const ppBonus = mirror.strike
  const iq = iqBonusForSkills(character, activeForm)
  const unlocked = collectUnlockedSkillIds(character, activeForm)
  let wpBonus = 0
  let skillSourceLabel: string | null = null
  if (unlocked.has(HAND_TO_HAND_SKILL_ID)) {
    const def = getSkillById(HAND_TO_HAND_SKILL_ID)
    if (def) {
      const pct = calculateSkillPercent(def, character.level, iq)
      wpBonus = wpStrikeBonusFromSkillPercent(pct)
      skillSourceLabel = def.name
    }
  }
  return {
    ppBonus,
    wpBonus,
    weaponBonus: 0,
    total: ppBonus + wpBonus,
    skillSourceLabel,
  }
}

/** Display string for default unarmed damage (P.S. hand-to-hand bonus). */
export function unarmedDamageLabel(character: Character, activeForm: 'facade' | 'morphus'): string {
  const attrs = getFormState(character, activeForm).attributes
  const d = computeCombatMirrorBonuses(attrs).handToHandDamage
  return d > 0 ? `1d3+${d}` : '1d3'
}
