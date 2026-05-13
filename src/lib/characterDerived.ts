import type { CharacterAttributes, FormState } from '../types'

/** Vitality header scale per combat_logic.md §1 (M.D.C. vs S.D.C./H.P.). */
export type VitalityCombatScale = 'MDC' | 'SDC'

/** P.P. → Strike / Parry / Dodge (melee & ancient); null rule ≤15 → 0 (attribute_and_stat.md §1–2). */
function ppMeleeNaturalBonus(pp: number): number {
  if (pp <= 15) return 0
  return Math.floor((pp - 14) / 2)
}

/** I.Q. → signed % to O.C.C. / O.C.C. related skills until full lookup tables land. */
function iqOccSkillPercentModifier(iq: number): number {
  if (iq <= 15) return 0
  return Math.floor((iq - 14) / 2) * 5
}

export type LiveBonuses = {
  /** Same value applied to Strike, Parry, Dodge per attribute_and_stat.md §1. */
  ppStrikeParryDodge: number
  iqOccSkillPercent: number
}

export function computeLiveBonuses(attrs: CharacterAttributes): LiveBonuses {
  return {
    ppStrikeParryDodge: ppMeleeNaturalBonus(attrs.pp),
    iqOccSkillPercent: iqOccSkillPercentModifier(attrs.iq),
  }
}

/** Hand-to-hand damage bonus from P.S. until the full megaversal table ships (attribute_and_stat.md §1). */
export function computePsHandToHandDamageBonus(ps: number): number {
  if (ps <= 15) return 0
  return Math.floor((ps - 14) / 2)
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
  const m = ppMeleeNaturalBonus(attrs.pp)
  const d = computePsHandToHandDamageBonus(attrs.ps.score)
  return { strike: m, parry: m, dodge: m, handToHandDamage: d }
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
