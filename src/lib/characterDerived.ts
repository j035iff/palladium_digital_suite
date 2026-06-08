import type { CharacterAttributes, FormState } from '../types'
import { getIqBonuses, getPpBonuses, getPsBonuses } from './attributeBonuses'

/** Vitality header scale per combat_logic.md §1 (M.D.C. vs S.D.C./H.P.). */
export type VitalityCombatScale = 'MDC' | 'SDC'

export type LiveBonuses = {
  /** Same value applied to Strike, Parry, Dodge per attribute_and_stat.md §1. */
  ppStrikeParryDodge: number
  /** I.Q. exceptional bonus table: +% to all skills (16+; e.g. 17 → +3%). */
  iqSkillBonus: number
}

export function computeLiveBonuses(attrs: CharacterAttributes): LiveBonuses {
  return {
    ppStrikeParryDodge: getPpBonuses(attrs.pp).strike,
    iqSkillBonus: getIqBonuses(attrs.iq).skillBonus,
  }
}

/** Hand-to-hand damage bonus from P.S. (attribute engine). */
export function computePsHandToHandDamageBonus(ps: number): number {
  return getPsBonuses(ps).damageBonus
}

export type CombatMirrorBonuses = {
  strike: number
  parry: number
  dodge: number
  handToHandDamage: number
}

export function computeCombatMirrorBonuses(
  attrs: CharacterAttributes,
): CombatMirrorBonuses {
  const pp = getPpBonuses(attrs.pp)
  const d = getPsBonuses(attrs.ps.score).damageBonus
  return { strike: pp.strike, parry: pp.parry, dodge: pp.dodge, handToHandDamage: d }
}

/**
 * M.D.C. when either HP or structural pool is mega-damage scaled (combat_logic.md §1).
 */
export function getVitalityTypeFromForm(form: FormState): VitalityCombatScale {
  if (
    form.hitPoints.scaling === 'mdc' ||
    form.structuralDamageCapacity.scaling === 'mdc'
  ) {
    return 'MDC'
  }
  return 'SDC'
}

export function computeIsMDC(form: FormState): boolean {
  return getVitalityTypeFromForm(form) === 'MDC'
}
