import type {
  MorphusCharacteristic,
  MorphusDamageAffinityType,
  MorphusDamageAffinityMultiplier,
} from '../types'

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
