import type {
  MorphusCharacteristic,
  MorphusSkillOverride,
  MorphusSurfaceType,
} from '../types'
import { collectMorphusSkillOverridesForSurface } from './morphusCharacteristicAggregation'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import {
  isMorphusSkillImpossible,
  morphusGrantFloorForSkill,
  sumMorphusSkillModifierPercent,
} from './skillTraitResolution'

/** Flatten `specificSkillOverrides` from all active Morphus characteristics. */
export function collectMorphusSkillOverrides(
  traits: readonly Pick<MorphusCharacteristic, 'skillModifiers'>[],
): MorphusSkillOverride[] {
  const out: MorphusSkillOverride[] = []
  for (const t of traits) {
    const rows = t.skillModifiers?.specificSkillOverrides
    if (rows?.length) out.push(...rows)
  }
  return out
}

/** Sum `globalSkillModifier` from active traits (additive). */
export function sumGlobalMorphusSkillModifier(
  traits: readonly Pick<MorphusCharacteristic, 'skillModifiers'>[],
): number {
  let total = 0
  for (const t of traits) {
    const g = t.skillModifiers?.globalSkillModifier
    if (typeof g === 'number') total += g
  }
  return total
}

/** Morphus-specific % for one skill (global + matching overrides). */
export function sumMorphusSkillPercentForCatalogSkill(
  skill: Pick<PalladiumSkillCatalogEntry, 'id' | 'categories' | 'skillTraits'>,
  traits: readonly Pick<MorphusCharacteristic, 'skillModifiers'>[],
  options?: {
    characterLevel?: number
    extraOverrides?: readonly MorphusSkillOverride[]
    /** When set, uses base + terrain-isolated overrides once (avoids double-counting). */
    surfaceType?: MorphusSurfaceType
  },
): {
  global: number
  specific: number
  grantFloor: number | null
  total: number
  impossible: boolean
} {
  const global = sumGlobalMorphusSkillModifier(traits)
  const overrides =
    options?.surfaceType != null
      ? collectMorphusSkillOverridesForSurface(traits, options.surfaceType)
      : [
          ...collectMorphusSkillOverrides(traits),
          ...(options?.extraOverrides ?? []),
        ]
  const impossible = isMorphusSkillImpossible(skill, overrides)
  if (impossible) {
    return { global: 0, specific: 0, grantFloor: null, total: 0, impossible: true }
  }
  const specific = sumMorphusSkillModifierPercent(skill, overrides)
  const grantFloor = morphusGrantFloorForSkill(
    skill,
    overrides,
    options?.characterLevel ?? 1,
  )
  const additive = global + specific
  const total =
    grantFloor != null ? Math.max(additive, grantFloor) : additive
  return { global, specific, grantFloor, total, impossible: false }
}
