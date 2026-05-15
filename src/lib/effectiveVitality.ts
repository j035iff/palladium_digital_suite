import type { ActiveForm, Character, VitalityPool } from '../types'
import { aggregateAllPassiveModifiers } from './featureEngine'

export type EffectiveVitalityPool = VitalityPool & {
  modifierBonus: number
}

export function effectiveStructuralPool(
  character: Character,
  activeForm: ActiveForm,
  base: VitalityPool,
): EffectiveVitalityPool {
  const mods = aggregateAllPassiveModifiers(character, activeForm)
  const bonus = mods.sdc ?? 0
  if (bonus === 0) return { ...base, modifierBonus: 0 }
  return {
    ...base,
    maximum: base.maximum + bonus,
    current: base.current + bonus,
    modifierBonus: bonus,
  }
}
