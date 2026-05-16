import type { PalladiumOcc } from '../types'
import type { Race, RaceSdcConditionalConfig, RaceSdcDefinition } from '../types'

function isSdcConditional(def: RaceSdcDefinition): def is RaceSdcConditionalConfig {
  return typeof def === 'object' && def != null && 'strategy' in def
}

/**
 * Resolve the dice formula string for base structural S.D.C. from race vitals + O.C.C. tags.
 * Falls back to O.C.C. `baseStats.sdcDice` when race has no vitals.sdc.
 */
export function calculateBaseSdc(race: Race | undefined, occ: PalladiumOcc | undefined): string {
  const sdc = race?.vitals?.sdc
  if (sdc == null) {
    return occ?.baseStats?.sdcDice?.trim() || '3D6'
  }
  if (typeof sdc === 'string') {
    const t = sdc.trim()
    return t.length > 0 ? t : '3D6'
  }
  if (isSdcConditional(sdc)) {
    return resolveConditionalSdc(sdc, occ)
  }
  return '3D6'
}

function resolveConditionalSdc(def: RaceSdcConditionalConfig, occ: PalladiumOcc | undefined): string {
  if (def.strategy === 'conditional_by_occ_tags') {
    const tags = new Set((occ?.tags ?? []).map((t) => t.toLowerCase()))
    for (const rule of def.conditionalOverrides ?? []) {
      const hit = rule.tags.some((t) => tags.has(t.toLowerCase()))
      if (hit) return rule.formula.trim()
    }
    return def.defaultFormula.trim()
  }
  return def.defaultFormula?.trim() || '3D6'
}
