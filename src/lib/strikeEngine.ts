import type { Character, Weapon } from '../types'
import { getFormState } from '../types'
import { computeCombatMirrorBonuses, computeLiveBonuses } from './characterDerived'
import { calculateSkillPercent } from './skillEquation'
import { getSkillById } from '../data/skillLibrary'
import { collectUnlockedSkillIds } from './combatQuickBonuses'
import {
  computeWeaponProfileBonuses,
  weaponProfileToStrikeBreakdown,
} from './weaponBonuses'

/** Map W.P. / H2H skill % to a d20 strike bonus (demo curve; scales with level). */
export function wpStrikeBonusFromSkillPercent(skillTotalPercent: number): number {
  if (!Number.isFinite(skillTotalPercent) || skillTotalPercent <= 0) return 0
  return Math.min(10, Math.max(0, Math.floor(skillTotalPercent / 10) - 2))
}

export type StrikeBreakdown = {
  ppBonus: number
  /** Hand-to-Hand (melee firearms excluded in {@link computeWeaponStrikeBreakdown}). */
  hthBonus: number
  wpBonus: number
  /** Intrinsic strike + weapon-specific modifiers (strike / trait keys). */
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
 * Total strike on d20: **display P.P. natural + HtH (melee) + W.P. + weapon intrinsic & traits**
 */
export function computeWeaponStrikeBreakdown(
  character: Character,
  activeForm: 'facade' | 'morphus',
  weapon: Weapon,
): StrikeBreakdown {
  return weaponProfileToStrikeBreakdown(
    computeWeaponProfileBonuses(character, activeForm, weapon),
  )
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
  let hthBonus = 0
  let skillSourceLabel: string | null = null
  if (unlocked.has(HAND_TO_HAND_SKILL_ID)) {
    const def = getSkillById(HAND_TO_HAND_SKILL_ID)
    if (def) {
      const pct = calculateSkillPercent(def, character.level, iq)
      hthBonus = wpStrikeBonusFromSkillPercent(pct)
      skillSourceLabel = def.name
    }
  }
  return {
    ppBonus,
    hthBonus,
    wpBonus: 0,
    weaponBonus: 0,
    total: ppBonus + hthBonus,
    skillSourceLabel,
  }
}

/** Display string for default unarmed damage (P.S. hand-to-hand bonus). */
export function unarmedDamageLabel(character: Character, activeForm: 'facade' | 'morphus'): string {
  const attrs = getFormState(character, activeForm).attributes
  const d = computeCombatMirrorBonuses(attrs).handToHandDamage
  return d > 0 ? `1d3+${d}` : '1d3'
}
