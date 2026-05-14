import type { Character, Weapon } from '../types'
import { getFormState } from '../types'
import { computeCombatMirrorBonuses } from './characterDerived'
import { computeQuickActionTotals } from './combatQuickBonuses'

export type WeaponStrikeBreakdown = {
  weaponBonus: number
  ppBonus: number
  skillBonus: number
  total: number
}

/**
 * Strike to roll on d20: weapon sheet bonus + P.P. natural melee + skill strike slice
 * (combat_quick_bonuses + attribute_and_stat.md P.P. melee).
 */
export function computeWeaponStrikeBreakdown(
  character: Character,
  activeForm: 'facade' | 'morphus',
  weapon: Weapon,
): WeaponStrikeBreakdown {
  const attrs = getFormState(character, activeForm).attributes
  const mirror = computeCombatMirrorBonuses(attrs)
  const totals = computeQuickActionTotals(character, activeForm)
  const ppBonus = mirror.strike
  const skillBonus = Math.max(0, totals.strike - mirror.strike)
  const weaponBonus = weapon.strikeBonus
  return {
    weaponBonus,
    ppBonus,
    skillBonus,
    total: weaponBonus + ppBonus + skillBonus,
  }
}
