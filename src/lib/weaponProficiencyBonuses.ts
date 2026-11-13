import type { WeaponProficiencyCatalogEntry } from '../data/library/catalogTypes'
import { getWeaponProficiencyCatalogEntryById } from '../data/library/weaponProficienciesCatalogLoader'
import {
  defaultStandardModernProgressionKey,
  getStandardModernProgressionBundle,
} from '../data/library/standardModernWeaponProgressionLoader'
import { getSkillById, resolveWeaponProficiencySkillId } from '../data/skillLibrary'

/** Numeric combat keys accumulated from W.P. `levelTiers` (and modern bundles). */
export const WP_COMBAT_TIER_KEYS = [
  'strike',
  'parry',
  'dodge',
  'rollWithImpact',
  'pullPunch',
  'apm',
  'strikeWhenThrown',
  'aimedStrikeBonus',
  'burstStrikeBonus',
  'damageBonusFlat',
  'entangle',
  'rateOfFireDelta',
  'rangeBonusFeet',
] as const

export type WpCombatTierKey = (typeof WP_COMBAT_TIER_KEYS)[number]

export type WpLevelTierRow = {
  atCharacterLevel: number
} & Partial<Record<WpCombatTierKey, number>> &
  Record<string, unknown>

export type AccumulatedWeaponProficiencyBonuses = {
  strike: number
  parry: number
  dodge: number
  rollWithImpact: number
  pullPunch: number
  apm: number
  strikeWhenThrown: number
  aimedStrikeBonus: number
  burstStrikeBonus: number
  damageBonusFlat: number
  entangle: number
  rateOfFireDelta: number
  rangeBonusFeet: number
  /** Absolute RoF from the highest reached `rateOfFireTotal` tier, if any. */
  rateOfFireTotal: number | null
}

export function createEmptyAccumulatedWeaponProficiencyBonuses(): AccumulatedWeaponProficiencyBonuses {
  return {
    strike: 0,
    parry: 0,
    dodge: 0,
    rollWithImpact: 0,
    pullPunch: 0,
    apm: 0,
    strikeWhenThrown: 0,
    aimedStrikeBonus: 0,
    burstStrikeBonus: 0,
    damageBonusFlat: 0,
    entangle: 0,
    rateOfFireDelta: 0,
    rangeBonusFeet: 0,
    rateOfFireTotal: null,
  }
}

function asTierRows(raw: readonly unknown[] | undefined): WpLevelTierRow[] {
  if (!raw?.length) return []
  const out: WpLevelTierRow[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const at = r.atCharacterLevel
    if (typeof at !== 'number' || !Number.isFinite(at)) continue
    out.push({ ...(r as WpLevelTierRow), atCharacterLevel: at })
  }
  return out
}

function mergeTierOverrides(
  base: readonly WpLevelTierRow[],
  overrides: readonly WpLevelTierRow[],
): WpLevelTierRow[] {
  const byLevel = new Map<number, WpLevelTierRow>()
  for (const tier of base) {
    byLevel.set(tier.atCharacterLevel, { ...tier })
  }
  for (const o of overrides) {
    const prev = byLevel.get(o.atCharacterLevel) ?? {
      atCharacterLevel: o.atCharacterLevel,
    }
    byLevel.set(o.atCharacterLevel, { ...prev, ...o })
  }
  return [...byLevel.values()].sort((a, b) => a.atCharacterLevel - b.atCharacterLevel)
}

type WeaponTypeOverride = {
  matchesWeaponProficiencyIds?: readonly string[]
  levelTiers?: readonly unknown[]
}

/**
 * Effective `levelTiers` for a W.P. row: inline ancient/modern ladders, or the
 * shared modern bundle (+ weapon-type / catalog tier-1 overrides).
 */
export function resolveWeaponProficiencyLevelTiers(
  entry: WeaponProficiencyCatalogEntry,
): readonly WpLevelTierRow[] {
  if (!entry.usesStandardModernProgression) {
    return asTierRows(entry.levelTiers)
  }

  const gameSystem = entry.gameSystems[0] ?? 'nightbane'
  const key =
    entry.standardModernProgressionKey?.trim() ||
    defaultStandardModernProgressionKey(gameSystem)
  const bundle = getStandardModernProgressionBundle(key)
  if (!bundle) {
    return asTierRows(entry.levelTiers)
  }

  let tiers = asTierRows(bundle.levelTiers)

  const overrides = bundle.weaponTypeOverrides as
    | Readonly<Record<string, WeaponTypeOverride>>
    | undefined
  if (overrides) {
    for (const override of Object.values(overrides)) {
      const ids = override.matchesWeaponProficiencyIds ?? []
      if (!ids.includes(entry.id)) continue
      tiers = mergeTierOverrides(tiers, asTierRows(override.levelTiers))
    }
  }

  const catalogOverrides = asTierRows(entry.levelTiers)
  if (catalogOverrides.length > 0) {
    tiers = mergeTierOverrides(tiers, catalogOverrides)
  }

  return tiers
}

/**
 * Cumulative W.P. combat bonuses at `characterLevel` (schema `atCharacterLevel`).
 * Matches catalog `stackingRule` for Nightbane ancient/modern ladders (sum reached tiers).
 */
export function accumulateWeaponProficiencyBonuses(
  entry: WeaponProficiencyCatalogEntry,
  characterLevel: number,
): AccumulatedWeaponProficiencyBonuses {
  const level = Math.max(1, Math.floor(characterLevel) || 1)
  const totals = createEmptyAccumulatedWeaponProficiencyBonuses()
  let rateOfFireTotal: number | null = null

  for (const tier of resolveWeaponProficiencyLevelTiers(entry)) {
    if (tier.atCharacterLevel > level) continue
    for (const key of WP_COMBAT_TIER_KEYS) {
      const val = tier[key]
      if (typeof val === 'number' && Number.isFinite(val)) {
        totals[key] += val
      }
    }
    const totalRof = tier.rateOfFireTotal
    if (typeof totalRof === 'number' && Number.isFinite(totalRof)) {
      rateOfFireTotal = totalRof
    }
  }

  totals.rateOfFireTotal = rateOfFireTotal
  return totals
}

/**
 * Resolve a skill / link id to a W.P. catalog row (handles legacy `skill_wp_*` stubs
 * via display-name alias → `wp_*`).
 */
export function resolveWeaponProficiencyCatalogEntry(
  wpSkillId: string | null | undefined,
): WeaponProficiencyCatalogEntry | undefined {
  const raw = wpSkillId?.trim()
  if (!raw) return undefined
  const direct = getWeaponProficiencyCatalogEntryById(raw)
  if (direct) return direct

  const def = getSkillById(raw)
  if (def?.name) {
    const aliased = resolveWeaponProficiencySkillId(def.name, null)
    if (aliased && aliased !== raw) {
      return getWeaponProficiencyCatalogEntryById(aliased)
    }
  }
  return undefined
}

/**
 * When the character owns `wpSkillId`, return catalog bonuses at `characterLevel`.
 * Otherwise null (no W.P. contribution).
 */
export function resolveOwnedWeaponProficiencyBonuses(
  wpSkillId: string | null | undefined,
  unlockedSkillIds: ReadonlySet<string>,
  characterLevel: number,
): {
  entry: WeaponProficiencyCatalogEntry
  bonuses: AccumulatedWeaponProficiencyBonuses
} | null {
  if (!wpSkillId || !unlockedSkillIds.has(wpSkillId)) return null
  const entry = resolveWeaponProficiencyCatalogEntry(wpSkillId)
  if (!entry) return null
  return {
    entry,
    bonuses: accumulateWeaponProficiencyBonuses(entry, characterLevel),
  }
}
