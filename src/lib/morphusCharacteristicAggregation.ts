import type {
  MorphusCharacteristic,
  MorphusDamageAffinityType,
  MorphusDamageAffinityMultiplier,
  MorphusHandCapacityConstraints,
  MorphusSkillOverride,
  MorphusSurfaceType,
} from '../types'
import { polymorphicDeltaFromBase } from './morphusPolymorphicResolver'

/**
 * Morphus multi-trait resolution engines (Nightbane Core Rulebook Morphus tables).
 *
 * When several active {@link MorphusCharacteristic} rows overlap on the same axis,
 * use these reducers instead of naive summation — several axes are non-linear.
 */

/**
 * A.R. stacking (natural armor from Morphus traits).
 *
 * 1. Take the **highest** standalone `naturalAr` among active traits as the absolute base.
 * 2. For every **other** active trait that also provides `naturalAr`, append a flat bonus:
 *    `1 + Math.floor((additionalTraitAr - 6) / 3)` when `additionalTraitAr > 5`, else `0`.
 *
 * Example: traits with A.R. 14, 10, and 8 → base 14 + bonus from 10 (1+floor(4/3)=2)
 * + bonus from 8 (1+floor(2/3)=1) → **17** total natural A.R.
 */
export function stackNaturalArmorFromTraits(
  traits: readonly Pick<MorphusCharacteristic, 'id' | 'naturalAr'>[],
): number | undefined {
  const values = traits
    .map((t) => t.naturalAr)
    .filter((ar): ar is number => typeof ar === 'number' && ar > 0)
  if (values.length === 0) return undefined

  const sorted = [...values].sort((a, b) => b - a)
  const base = sorted[0]!
  let total = base

  for (const additional of sorted.slice(1)) {
    if (additional > 5) {
      total += 1 + Math.floor((additional - 6) / 3)
    }
  }

  return total
}

function additionalNaturalArBonus(ar: number): number {
  if (ar <= 5) return 0
  return 1 + Math.floor((ar - 6) / 3)
}

/** Exposed for unit tests and attribution UIs. */
export function naturalArBonusFromSecondaryTrait(ar: number): number {
  return additionalNaturalArBonus(ar)
}

/**
 * Nightvision range diminishing stacking.
 *
 * 1. The **largest** `sensory.nightvisionRangeFlatBonus` among traits is the absolute base range.
 * 2. Every **other** contributing bonus adds **half** of its printed value (rounded down).
 *
 * Example: 2000 ft base + 1000 ft secondary → 2000 + floor(1000/2) = **2500 ft**.
 */
export function stackNightvisionRangeFlatBonus(
  traits: readonly Pick<MorphusCharacteristic, 'id' | 'sensory'>[],
): number {
  const bonuses = traits
    .map((t) => t.sensory?.nightvisionRangeFlatBonus)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  if (bonuses.length === 0) return 0

  const sorted = [...bonuses].sort((a, b) => b - a)
  const base = sorted[0]!
  let total = base

  for (const extra of sorted.slice(1)) {
    total += Math.floor(extra / 2)
  }

  return total
}

/**
 * Damage affinity multiplier compounding.
 *
 * Overlapping `damageAffinities` for the same damage type **multiply** together — never add.
 * Example: double (2.0) × half (0.5) → **1.0** (normal damage).
 *
 * Traits with no entry for a type are treated as neutral (1.0) and omitted from the product.
 */
export function compoundDamageAffinityMultiplier(
  multipliers: readonly MorphusDamageAffinityMultiplier[],
): MorphusDamageAffinityMultiplier {
  if (multipliers.length === 0) return 1
  const product = multipliers.reduce<number>((acc, m) => acc * m, 1)
  return normalizeDamageAffinityMultiplier(product)
}

/** Collect affinity multipliers for one damage type across active traits. */
export function collectDamageAffinityMultipliers(
  traits: readonly Pick<MorphusCharacteristic, 'damageAffinities'>[],
  damageType: MorphusDamageAffinityType,
): MorphusDamageAffinityMultiplier[] {
  return traits
    .map((t) => t.damageAffinities?.[damageType])
    .filter((m): m is MorphusDamageAffinityMultiplier => m !== undefined)
}

export function resolveCompoundDamageAffinity(
  traits: readonly Pick<MorphusCharacteristic, 'damageAffinities'>[],
  damageType: MorphusDamageAffinityType,
): MorphusDamageAffinityMultiplier {
  return compoundDamageAffinityMultiplier(
    collectDamageAffinityMultipliers(traits, damageType),
  )
}

/** Map a computed product to the nearest canonical tier (schema enum). */
export function normalizeDamageAffinityMultiplier(
  value: number,
): MorphusDamageAffinityMultiplier {
  const tiers: MorphusDamageAffinityMultiplier[] = [0, 0.25, 0.5, 1, 2]
  let best: MorphusDamageAffinityMultiplier = 1
  let bestDelta = Number.POSITIVE_INFINITY
  for (const tier of tiers) {
    const delta = Math.abs(tier - value)
    if (delta < bestDelta) {
      bestDelta = delta
      best = tier
    }
  }
  return best
}

/** Sum relative A.R. shifts from statModifiers.ar (e.g. Streamlined −2, Protective Gear +1). */
export function sumRelativeArShiftFromTraits(
  traits: readonly Pick<MorphusCharacteristic, 'statModifiers'>[],
): number {
  let total = 0
  for (const t of traits) {
    const ar = t.statModifiers?.ar
    if (!ar) continue
    if (ar.isOverride === true) continue
    if (typeof ar.flat === 'number') total += ar.flat
    if (typeof ar.percent === 'number' && typeof ar.dice !== 'string') {
      /* percent on A.R. shift is uncommon — treat as flat equivalent omitted */
    }
    if (ar.dice) total += polymorphicDeltaFromBase(0, [ar])
  }
  return total
}

/** Morphus saveModifiers → passive save bonus keys (lowers roll target when positive). */
export function aggregateMorphusSaveBonuses(
  traits: readonly Pick<MorphusCharacteristic, 'saveModifiers'>[],
): Record<string, number> {
  const out: Record<string, number> = {}
  const map: Record<string, string> = {
    magic: 'save_magic',
    psionics: 'save_psionics',
    insanity: 'save_insanity',
    poison: 'save_poison',
    gas: 'save_poison',
    horrorFactor: 'save_horror',
    disease: 'save_disease',
    possession: 'save_possession',
    illusions: 'save_illusions',
    nightlordMagic: 'save_magic',
    allSaves: 'save_all',
  }
  for (const t of traits) {
    const s = t.saveModifiers
    if (!s) continue
    for (const [k, v] of Object.entries(s)) {
      if (k === 'comaDeath' || typeof v !== 'number') continue
      const key = map[k] ?? `save_${k}`
      out[key] = (out[key] ?? 0) + v
    }
  }
  return out
}

/** Multiply matching terrain rows; neutral 1 when none match. */
export function resolveMorphusTerrainSpdMultiplier(
  traits: readonly Pick<MorphusCharacteristic, 'mobility'>[],
  surfaceType: MorphusSurfaceType,
): number {
  let product = 1
  let matched = false
  for (const t of traits) {
    const rows = t.mobility?.conditionalTerrainModifiers
    if (!rows?.length) continue
    for (const row of rows) {
      if (!row.surfaceTypes.includes(surfaceType)) continue
      matched = true
      product *= row.spdMultiplier
    }
  }
  return matched ? product : 1
}

/** Skill overrides from global trait skillModifiers + terrain-isolated blocks. */
export function collectMorphusSkillOverridesForSurface(
  traits: readonly Pick<MorphusCharacteristic, 'skillModifiers' | 'mobility'>[],
  surfaceType: MorphusSurfaceType,
): MorphusSkillOverride[] {
  const out: MorphusSkillOverride[] = []
  for (const t of traits) {
    const base = t.skillModifiers?.specificSkillOverrides
    if (base?.length) out.push(...base)
    const terrain = t.mobility?.conditionalTerrainModifiers
    if (!terrain) continue
    for (const row of terrain) {
      if (!row.surfaceTypes.includes(surfaceType)) continue
      const iso = row.skillModifiers?.specificSkillOverrides
      if (iso?.length) out.push(...iso)
    }
  }
  return out
}

export function aggregateHandCapacityFromTraits(
  traits: readonly Pick<MorphusCharacteristic, 'handCapacityConstraints'>[],
): MorphusHandCapacityConstraints {
  let occupiesHands = 0
  let blocksTwoHandedWeapons = false
  for (const t of traits) {
    const h = t.handCapacityConstraints
    if (!h) continue
    occupiesHands += Math.max(0, h.occupiesHands)
    if (h.blocksTwoHandedWeapons) blocksTwoHandedWeapons = true
  }
  return { occupiesHands, blocksTwoHandedWeapons }
}

/** Default 2 manipulators — free hands available for inventory rules. */
export function morphusFreeHandSlots(
  handCapacity: MorphusHandCapacityConstraints,
  totalHands = 2,
): number {
  return Math.max(0, totalHands - handCapacity.occupiesHands)
}

export function morphusBlocksTwoHandedWeapon(
  handCapacity: MorphusHandCapacityConstraints,
  weaponCategory: string,
): boolean {
  if (!handCapacity.blocksTwoHandedWeapons) return false
  const cat = weaponCategory.toLowerCase()
  if (cat.includes('heavy') || cat.includes('two')) return true
  return handCapacity.occupiesHands >= 1
}
