/**
 * Global Palladium opposed-roll tie rule (Megaversal default).
 * Defender wins ties unless a specific ability overrides it.
 */

export type OpposedRollContext = 'combat_defense' | 'save' | 'generic'

/** Defender wins opposed ties in combat (parry/dodge vs strike) and on saving throws. */
export const DEFENDER_WINS_TIES = true as const

export function defenderWinsTie(context: OpposedRollContext): boolean {
  if (!DEFENDER_WINS_TIES) return false
  return context === 'combat_defense' || context === 'save'
}

/**
 * Opposed roll outcome when higher total wins and ties favor the defender.
 * @returns `attacker` | `defender` | null when totals are equal and context has no defender bias
 */
export function resolveOpposedRoll(
  attackerTotal: number,
  defenderTotal: number,
  context: OpposedRollContext,
): 'attacker' | 'defender' {
  if (attackerTotal > defenderTotal) return 'attacker'
  if (defenderTotal > attackerTotal) return 'defender'
  return defenderWinsTie(context) ? 'defender' : 'attacker'
}

/** Saving throw: d20 + roll bonuses vs GM-called target; saver wins ties. */
export function saveRollSucceeds(
  d20: number,
  rollBonus: number,
  saveTarget: number,
): boolean {
  const rollTotal = d20 + rollBonus
  return resolveOpposedRoll(saveTarget, rollTotal, 'save') === 'defender'
}

/** Active defense vs incoming strike; defender wins ties. */
export function combatDefenseBeatsStrike(
  strikeTotal: number,
  defenseTotal: number,
): boolean {
  return resolveOpposedRoll(strikeTotal, defenseTotal, 'combat_defense') === 'defender'
}
