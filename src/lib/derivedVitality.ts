import type { CharacterAttributes, FormState } from '../types'

/**
 * Only auto-sync H.P./S.D.C. caps from attributes when both pools are human-scale
 * (combat_logic.md §1 — skip M.D.C. morphus bodies).
 */
export function shouldRecomputeVitalityFromAttributes(form: FormState): boolean {
  return (
    form.hitPoints.scaling === 'sdc_hp' &&
    form.structuralDamageCapacity.scaling === 'sdc_hp'
  )
}

/**
 * Placeholder derivation: P.E. drives base H.P. cap; P.S. + P.E. influence S.D.C. cap
 * (attribute_and_stat.md §1, §4 — replace with RCC-specific dice at Spawn).
 */
export function deriveSdcHpMaximums(attrs: CharacterAttributes): {
  hpMaximum: number
  sdcMaximum: number
} {
  const pe = attrs.pe
  const ps = attrs.ps.score
  const hpMaximum = Math.max(4, pe + 6)
  const sdcMaximum = Math.max(4, 8 + Math.floor((ps + pe) / 2))
  return { hpMaximum, sdcMaximum }
}

export function mergeVitalityFromAttributes(
  form: FormState,
  attrs: CharacterAttributes,
): FormState {
  if (!shouldRecomputeVitalityFromAttributes(form)) return form

  const { hpMaximum, sdcMaximum } = deriveSdcHpMaximums(attrs)
  return {
    ...form,
    hitPoints: {
      ...form.hitPoints,
      maximum: hpMaximum,
      current: Math.min(form.hitPoints.current, hpMaximum),
    },
    structuralDamageCapacity: {
      ...form.structuralDamageCapacity,
      maximum: sdcMaximum,
      current: Math.min(form.structuralDamageCapacity.current, sdcMaximum),
    },
  }
}
