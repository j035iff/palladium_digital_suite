import type { Character, PalladiumOcc, Race } from '../types'
import { isDiceNotation } from './diceNotationBounds'
import { resolveEffectivePalladiumOcc } from './occComposition'
import { calculateBaseSdc } from '../utils/vitalsCalculator'

/** Flat or resolved-dice numeric bonus from O.C.C. staticBonuses. */
export function occStaticNumericBonus(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  section: 'vitals' | 'combat' | 'saves',
  statKey: string,
  resolutions: Readonly<Record<string, number>> = {},
): number {
  if (!occ) return 0
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const raw = effective.staticBonuses?.[section]?.[statKey]
  let total = 0
  if (typeof raw === 'number') total += raw
  const resolved = resolutions[`${section}.${statKey}`]
  if (typeof resolved === 'number' && Number.isFinite(resolved)) {
    if (typeof raw === 'string' && isDiceNotation(raw)) {
      total += resolved
    }
  }
  return total
}

/** Flat numeric vital bonus from O.C.C. staticBonuses (resolved dice handled at spawn). */
export function occFlatVitalBonus(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  statKey: string,
  resolutions: Readonly<Record<string, number>>,
): number {
  return occStaticNumericBonus(occ, specializationId, 'vitals', statKey, resolutions)
}

export function occStaticDiceNotation(
  occ: PalladiumOcc | undefined,
  specializationId: string | null | undefined,
  section: 'attributes' | 'vitals' | 'combat' | 'saves',
  statKey: string,
): string | undefined {
  if (!occ) return undefined
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const raw = effective.staticBonuses?.[section]?.[statKey]
  if (typeof raw === 'string' && isDiceNotation(raw)) return raw
  return undefined
}

export function formatOccIspRollHint(occ: PalladiumOcc | undefined): string | undefined {
  const isp = occ?.ispEngine
  if (!isp?.baseFormula?.trim()) return undefined
  const base = isp.baseFormula.trim().replace(/\bME\b/gi, 'M.E.')
  const per = isp.perLevelFormula?.trim()
  return per ? `${base} (+${per}/level)` : base
}

export function formatOccSdcRollHint(
  race: Race,
  occ: PalladiumOcc,
  character: Character,
): string {
  const parts: string[] = [calculateBaseSdc(race, occ)]
  const dice = occStaticDiceNotation(
    occ,
    character.occSpecializationId,
    'vitals',
    'sdc',
  )
  if (dice) parts.push(`${dice} (O.C.C.)`)
  const flat = occFlatVitalBonus(
    occ,
    character.occSpecializationId,
    'sdc',
    character.creationOccVariableResolutions ?? {},
  )
  if (flat > 0) parts.push(`O.C.C. +${flat}`)
  return parts.join(' + ')
}
