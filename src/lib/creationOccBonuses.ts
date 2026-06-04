import type { PalladiumOcc } from '../types'
import { isDiceNotation } from './diceNotationBounds'
import { resolveEffectivePalladiumOcc } from './occComposition'

/** Flat numeric vital bonus from O.C.C. staticBonuses (resolved dice handled at spawn). */
export function occFlatVitalBonus(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  statKey: string,
  resolutions: Readonly<Record<string, number>>,
): number {
  if (!occ) return 0
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const raw = effective.staticBonuses?.vitals?.[statKey]
  let total = 0
  if (typeof raw === 'number') total += raw
  const resolved = resolutions[`vitals.${statKey}`]
  if (typeof resolved === 'number' && Number.isFinite(resolved)) {
    if (typeof raw === 'string' && isDiceNotation(raw)) {
      total += resolved
    }
  }
  return total
}
