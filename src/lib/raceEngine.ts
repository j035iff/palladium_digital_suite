import type {
  FeatureModifiers,
  PhysicalStrengthTier,
  Race,
  RaceStrengthCategory,
} from '../types'
import type { PalladiumOcc } from '../types'
import { rollNdS, rollDiceNotation } from './diceNotation'

const STRENGTH_CATEGORY_LABEL: Record<RaceStrengthCategory, string> = {
  standard: 'Standard human strength',
  extraordinary: 'Extraordinary strength',
  superhuman: 'Superhuman strength',
  supernatural: 'Supernatural strength',
}

/** Maps race strength scale to sheet P.S. tier (combat_logic.md). */
export function mapRaceStrengthToPsTier(
  category: RaceStrengthCategory,
): PhysicalStrengthTier {
  switch (category) {
    case 'extraordinary':
      return 'augmented'
    case 'superhuman':
      return 'robotic'
    case 'supernatural':
      return 'supernatural'
    default:
      return 'standard'
  }
}

export function raceStrengthCategoryLabel(category: RaceStrengthCategory): string {
  return STRENGTH_CATEGORY_LABEL[category]
}

export function raceCanPickOcc(race: Race | undefined): boolean {
  return race?.canPickOcc !== false
}

export function raceLineageFromDefinition(race: Race | undefined): 'nightbane' | 'megaversal' {
  if (race?.lineage === 'nightbane' || race?.id === 'nightbane') return 'nightbane'
  return 'megaversal'
}

export function getRacePpeNotation(race: Race | undefined): string | number | undefined {
  if (!race?.vitals) return undefined
  return race.vitals.averageStandardPpe ?? race.vitals.basePpe
}

export function getRaceIspNotation(race: Race | undefined): string | undefined {
  const raw = race?.psionics?.naturalIspFormula
  if (raw == null || raw === '0') return undefined
  return raw
}

/**
 * Roll Facade H.P. from race `hpFormula` (e.g. "PE + 1D6"); falls back to PE + 1d6.
 */
export function rollRaceHpMaximum(pe: number, hpFormula?: string): number {
  const f = (hpFormula ?? 'PE + 1D6').trim().toUpperCase()
  const m = f.match(/^PE\s*\+\s*(\d+)D(\d+)$/i)
  if (m) {
    const count = Number(m[1])
    const sides = Number(m[2])
    if (Number.isFinite(count) && Number.isFinite(sides) && count > 0 && sides > 0) {
      return Math.max(4, pe + rollNdS(count, sides))
    }
  }
  return Math.max(4, pe + rollNdS(1, 6))
}

/**
 * Starting P.P.E. — pure dice notation rolls as written; otherwise ME + PE + 2d6 baseline.
 */
export function rollRaceStartingPpe(
  me: number,
  pe: number,
  notation: string | number | undefined,
): number {
  if (typeof notation === 'number' && Number.isFinite(notation)) {
    return Math.max(0, Math.round(notation))
  }
  const t = typeof notation === 'string' ? notation.trim() : ''
  if (t.length > 0 && /^(\d+)?D\d+/i.test(t)) {
    return Math.max(0, rollDiceNotation(t))
  }
  return Math.max(8, me + pe + rollNdS(2, 6))
}

/** Flat numeric modifiers from racial innateBonuses (conditional entries ignored at runtime). */
export function racePassiveModifiers(race: Race | undefined): FeatureModifiers {
  const mods = race?.innateBonuses?.modifiers
  if (!mods) return {}
  const out: FeatureModifiers = {}
  for (const [k, v] of Object.entries(mods)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out
}

function occCategoryMatchesForbidden(
  occ: PalladiumOcc,
  forbidden: readonly string[] | undefined,
): boolean {
  if (!forbidden?.length) return false
  const candidates = [
    occ.occType,
    occ.progression?.characterOccCategory,
  ].filter(Boolean) as string[]
  return forbidden.some((c) => {
    const norm = c.toLowerCase()
    return candidates.some((x) => x.toLowerCase() === norm)
  })
}

/**
 * Whether an O.C.C. library row is allowed for this race (whitelist, bans, categories).
 */
export function isOccAllowedForRace(
  race: Race | undefined,
  occ: PalladiumOcc | undefined,
): boolean {
  if (!race || !occ) return true
  const lim = race.occLimitations
  const allowed = lim.allowedOccIds
  if (allowed && allowed.length > 0) {
    return allowed.includes(occ.id)
  }
  if (lim.forbiddenOccIds?.includes(occ.id)) return false
  if (occCategoryMatchesForbidden(occ, lim.forbiddenCategories)) {
    return false
  }
  return true
}

export function listForbiddenOccIdsForRace(race: Race | undefined): string[] {
  return [...(race?.occLimitations?.forbiddenOccIds ?? [])]
}
