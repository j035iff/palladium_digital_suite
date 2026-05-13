import type { CharacterAttributes, FormState } from '../types'

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

/**
 * True when the active form uses M.D.C. durability on either pool (combat_logic.md §1).
 * Extend with explicit race / O.C.C. flags on {@link Character} when those fields exist.
 */
export function computeIsMDC(form: FormState): boolean {
  return (
    form.hitPoints.scaling === 'mdc' ||
    form.structuralDamageCapacity.scaling === 'mdc'
  )
}
