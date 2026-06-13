import type { PalladiumOcc } from '../types'
import { resolveEffectivePalladiumOcc } from './occComposition'

/** Auto-granted spell/psionic ids from O.C.C. engines (do not consume selection budget). */
export function occSupernaturalGrantedAbilityIds(
  occ: PalladiumOcc | undefined,
  specializationId?: string | null,
): readonly string[] {
  if (!occ) return []
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const ids = [
    ...(effective.ppeEngine?.grantedAbilityIds ?? []),
    ...(effective.ispEngine?.grantedAbilityIds ?? []),
  ]
  return [...new Set(ids.filter((id) => id.trim()))]
}

export function mergeOccGrantedAbilities(
  selectedIds: readonly string[] | undefined,
  grantedIds: readonly string[],
): string[] {
  const granted = new Set(grantedIds)
  const player = (selectedIds ?? []).filter((id) => !granted.has(id))
  return [...new Set([...grantedIds, ...player])]
}

export function isOccGrantedAbility(
  abilityId: string,
  grantedIds: readonly string[],
): boolean {
  return grantedIds.includes(abilityId)
}
