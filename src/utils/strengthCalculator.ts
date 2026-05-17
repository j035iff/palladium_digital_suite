import {
  getBaseThrowRangeFeet,
  getSupernaturalDamageTable,
  listThrowObjectKinds,
} from '../data/library/combat/supernaturalStrengthLoader'
import type {
  HandToHandDamageProfile,
  PhysicalStrengthTier,
  StrengthCapacities,
  StrengthCategory,
  ThrowObjectKind,
  WeaponThrowRangeEntry,
} from '../types'

const THROW_OBJECT_LABELS: Record<ThrowObjectKind, string> = {
  half_pound_object: '½ lb object',
  dart: 'Dart',
  throwing_axe: 'Throwing axe',
  javelin: 'Javelin',
  spear: 'Spear',
  knife: 'Knife',
  sword: 'Sword',
}

/** P.S. attribute bonus added to normal damage (P.S. 16+ → score − 15). */
export function psAttributeDamageBonus(psScore: number): number {
  if (psScore >= 16) return psScore - 15
  return 0
}

/**
 * Resolve book strength category from sheet P.S. tier and score.
 * Augmented/robotic sheet tiers map to extraordinary human strong scale.
 */
export function resolveStrengthCategory(
  psScore: number,
  psTier: PhysicalStrengthTier,
): StrengthCategory {
  if (psTier === 'supernatural') return 'supernatural'
  if (psTier === 'augmented' || psTier === 'robotic') return 'extraordinary'
  if (psScore >= 17) return 'extraordinary'
  return 'standard'
}

export function calculateWeightCapacities(
  psScore: number,
  category: StrengthCategory,
): Pick<
  StrengthCapacities,
  'carryingCapacityLbs' | 'liftingCapacityLbs'
> {
  const score = Math.max(0, Math.floor(psScore))
  let carryingCapacityLbs: number

  if (category === 'supernatural') {
    carryingCapacityLbs = score <= 17 ? score * 50 : score * 100
  } else if (category === 'extraordinary') {
    carryingCapacityLbs = score * 20
  } else if (score >= 17) {
    carryingCapacityLbs = score * 20
  } else {
    carryingCapacityLbs = score * 10
  }

  return {
    carryingCapacityLbs,
    liftingCapacityLbs: carryingCapacityLbs * 2,
  }
}

export function calculateThrowingCapacities(
  psScore: number,
  category: StrengthCategory,
): Pick<StrengthCapacities, 'maxWeightThrowDistanceFeet' | 'weaponThrowRanges'> {
  const score = Math.max(0, Math.floor(psScore))

  const maxWeightThrowDistanceFeet =
    category === 'supernatural'
      ? score
      : (score * 4) / 12

  const weaponThrowRanges: WeaponThrowRangeEntry[] = listThrowObjectKinds().map(
    (objectKind) => {
      const baseFeet = getBaseThrowRangeFeet(objectKind, category)
      return {
        objectKind,
        label: THROW_OBJECT_LABELS[objectKind],
        rangeFeet: baseFeet + score,
      }
    },
  )

  return { maxWeightThrowDistanceFeet, weaponThrowRanges }
}

function lookupSupernaturalDamageRow(psScore: number) {
  const score = Math.max(0, Math.floor(psScore))
  const table = getSupernaturalDamageTable()
  const row =
    table.find(
      (r) =>
        score >= r.minPs && (r.maxPs === undefined || score <= r.maxPs),
    ) ?? table[table.length - 1]
  return row
}

export function getHandToHandDamageProfile(
  psScore: number,
  category: StrengthCategory,
): HandToHandDamageProfile {
  if (category === 'supernatural') {
    const row = lookupSupernaturalDamageRow(psScore)
    return {
      kind: 'supernatural',
      restrainedPunch: row.restrained,
      fullStrengthPunch: row.full,
      powerPunch: row.power,
      powerPunchMeleeActions: 2,
    }
  }

  const attributeDamageBonus = psAttributeDamageBonus(psScore)
  const bonus = attributeDamageBonus
  return {
    kind: 'standard',
    attributeDamageBonus,
    unarmedDamageNotation: bonus > 0 ? `1D3+${bonus}` : '1D3',
  }
}

/** Full P.S. evaluation for the active form (carry, lift, throw, H2H damage). */
export function evaluateStrengthCapacities(
  psScore: number,
  category: StrengthCategory,
): StrengthCapacities {
  const weights = calculateWeightCapacities(psScore, category)
  const throws = calculateThrowingCapacities(psScore, category)
  const handToHandDamage = getHandToHandDamageProfile(psScore, category)

  return {
    strengthCategory: category,
    ...weights,
    ...throws,
    handToHandDamage,
  }
}

export function evaluateStrengthFromPhysicalStat(
  ps: { score: number; tier: PhysicalStrengthTier },
): StrengthCapacities {
  const category = resolveStrengthCategory(ps.score, ps.tier)
  return evaluateStrengthCapacities(ps.score, category)
}

/** Unarmed damage hint for combat UI (includes optional HtH style damage bonus). */
export function formatUnarmedDamageHint(
  profile: HandToHandDamageProfile,
  hthStyleDamageBonus = 0,
): string {
  if (profile.kind === 'supernatural') {
    return `Restrained ${profile.restrainedPunch} · Full ${profile.fullStrengthPunch} · Power ${profile.powerPunch} (${profile.powerPunchMeleeActions} APM)`
  }
  const extra = Math.max(0, hthStyleDamageBonus)
  if (extra > 0) {
    return `${profile.unarmedDamageNotation}+${extra} (HtH)`
  }
  return profile.unarmedDamageNotation
}
