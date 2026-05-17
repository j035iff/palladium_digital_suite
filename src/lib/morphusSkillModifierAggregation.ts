import type { MorphusCharacteristic, MorphusSkillOverride } from '../types'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { sumMorphusSkillModifierPercent } from './skillTraitResolution'

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
): { global: number; specific: number; total: number } {
  const global = sumGlobalMorphusSkillModifier(traits)
  const overrides = collectMorphusSkillOverrides(traits)
  const specific = sumMorphusSkillModifierPercent(skill, overrides)
  return { global, specific, total: global + specific }
}
