import type { CharacterAttributes, FormState } from '../types'
import type { ActiveForm, Character } from '../types'
import {
  buildCreationStatStack,
  resolveExceptionalDisplayValue,
  statStackTotal,
} from './creationStatEngine'
import {
  resolveLiveCombatMirrorBonuses,
  resolveLiveIqSkillBonus,
} from './liveStatEngine'

/** Vitality header scale per combat_logic.md §1 (M.D.C. vs S.D.C./H.P.). */
export type VitalityCombatScale = 'MDC' | 'SDC'

export type LiveBonuses = {
  /** Same value applied to Strike, Parry, Dodge per attribute_and_stat.md §1. */
  ppStrikeParryDodge: number
  /** I.Q. exceptional bonus table: +% to all skills (16+; e.g. 17 → +3%). */
  iqSkillBonus: number
}

export function computeLiveBonuses(
  character: Character,
  activeForm: ActiveForm,
): LiveBonuses {
  const mirror = resolveLiveCombatMirrorBonuses(character, activeForm)
  return {
    ppStrikeParryDodge: mirror.strike,
    iqSkillBonus: resolveLiveIqSkillBonus(character, activeForm),
  }
}

/** @deprecated Use {@link computeLiveBonuses} with character + activeForm. Exceptional-only fallback. */
export function computeLiveBonusesFromAttrs(attrs: CharacterAttributes): LiveBonuses {
  return {
    ppStrikeParryDodge: statStackTotal(
      buildCreationStatStack({ kind: 'combat', combatKey: 'strike', attrs }),
    ),
    iqSkillBonus: resolveExceptionalDisplayValue('iq_skill', attrs),
  }
}

/** Hand-to-hand damage bonus from P.S. (unified stat engine). */
export function computePsHandToHandDamageBonus(
  character: Character,
  activeForm: ActiveForm,
  opts?: {
    occ?: import('../types').PalladiumOcc
    supportsDualForm?: boolean
    handToHand?: {
      skillName: string | null
      accumulated: import('../types').AccumulatedHandToHandBonuses
    }
  },
): number {
  return resolveLiveCombatMirrorBonuses(character, activeForm, opts).handToHandDamage
}

/** @deprecated Use {@link computePsHandToHandDamageBonus} with character context. */
export function computePsHandToHandDamageBonusFromPs(ps: number): number {
  const attrs = {
    ps: { score: ps, tier: 'standard' as const },
  } as unknown as CharacterAttributes
  return statStackTotal(
    buildCreationStatStack({ kind: 'combat', combatKey: 'damage', attrs }),
  )
}

export type CombatMirrorBonuses = {
  strike: number
  parry: number
  dodge: number
  handToHandDamage: number
}

/** Full live combat mirror via unified stat engine. */
export function computeCombatMirrorBonuses(
  character: Character,
  activeForm: ActiveForm,
  opts?: Parameters<typeof resolveLiveCombatMirrorBonuses>[2],
): CombatMirrorBonuses {
  return resolveLiveCombatMirrorBonuses(character, activeForm, opts)
}

/** @deprecated Pass character + activeForm. Exceptional-only mirror from raw attrs. */
export function computeCombatMirrorBonusesFromAttrs(
  attrs: CharacterAttributes,
): CombatMirrorBonuses {
  return {
    strike: statStackTotal(
      buildCreationStatStack({ kind: 'combat', combatKey: 'strike', attrs }),
    ),
    parry: statStackTotal(
      buildCreationStatStack({ kind: 'combat', combatKey: 'parry', attrs }),
    ),
    dodge: statStackTotal(
      buildCreationStatStack({ kind: 'combat', combatKey: 'dodge', attrs }),
    ),
    handToHandDamage: statStackTotal(
      buildCreationStatStack({ kind: 'combat', combatKey: 'damage', attrs }),
    ),
  }
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

export { buildDisplayAttributesForLiveEngine } from './liveStatEngine'
