import type { Character, Weapon } from '../types'
import { getFormState } from '../types'
import {
  formatUnarmedDamageHint,
  getHandToHandDamageProfile,
  resolveStrengthCategory,
} from '../utils/strengthCalculator'
import { computeCombatMirrorBonuses } from './characterDerived'
import type { AccumulatedHandToHandBonuses } from '../types'
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

/**
 * Total strike on d20: **display P.P. natural + HtH (melee) + W.P. + weapon intrinsic & traits**
 */
export function computeWeaponStrikeBreakdown(
  character: Character,
  activeForm: 'facade' | 'morphus',
  weapon: Weapon,
  handToHandAccumulated?: AccumulatedHandToHandBonuses,
): StrikeBreakdown {
  return weaponProfileToStrikeBreakdown(
    computeWeaponProfileBonuses(character, activeForm, weapon, handToHandAccumulated),
  )
}

/**
 * Unarmed strike when no weapon is readied: P.P. + Hand-to-Hand skill (if known) + 0 weapon bonus.
 */
export function computeUnarmedStrikeBreakdown(
  character: Character,
  activeForm: 'facade' | 'morphus',
  handToHand?: { skillName: string | null; accumulated: AccumulatedHandToHandBonuses },
): StrikeBreakdown {
  const attrs = getFormState(character, activeForm).attributes
  const mirror = computeCombatMirrorBonuses(attrs)
  const ppBonus = mirror.strike
  const hthBonus = handToHand?.accumulated.strike ?? 0
  const skillSourceLabel = handToHand?.skillName ?? null
  return {
    ppBonus,
    hthBonus,
    wpBonus: 0,
    weaponBonus: 0,
    total: ppBonus + hthBonus,
    skillSourceLabel,
  }
}

/** Display string for unarmed damage (standard/extraordinary or supernatural punch grid). */
export function unarmedDamageLabel(
  character: Character,
  activeForm: 'facade' | 'morphus',
  hthDamageBonus = 0,
): string {
  const ps = getFormState(character, activeForm).attributes.ps
  const category = resolveStrengthCategory(ps.score, ps.tier)
  const profile = getHandToHandDamageProfile(ps.score, category)
  return formatUnarmedDamageHint(profile, hthDamageBonus)
}
