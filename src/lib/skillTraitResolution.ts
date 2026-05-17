import type { MorphusSkillOverride } from '../types'
import type { PalladiumSkillCatalogEntry } from '../data/library/catalogTypes'
import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import { isKnownSkillTraitId } from '../data/library/skillTraitRegistryLoader'

export type SkillModifierTarget =
  | { kind: 'skill_id'; skillId: string }
  | { kind: 'category'; category: string }
  | { kind: 'skill_trait'; traitId: string }

export function parseMorphusSkillOverrideTarget(
  override: Pick<MorphusSkillOverride, 'targetType' | 'targetValue'>,
): SkillModifierTarget {
  switch (override.targetType) {
    case 'skill_id':
      return { kind: 'skill_id', skillId: override.targetValue }
    case 'category':
      return { kind: 'category', category: override.targetValue }
    case 'skill_trait':
      return { kind: 'skill_trait', traitId: override.targetValue }
    default:
      return { kind: 'skill_id', skillId: override.targetValue }
  }
}

/** Whether a Morphus (or other) skill override applies to this catalog skill. */
export function morphusOverrideAppliesToSkill(
  skill: Pick<PalladiumSkillCatalogEntry, 'id' | 'categories' | 'skillTraits'>,
  override: Pick<MorphusSkillOverride, 'targetType' | 'targetValue'>,
): boolean {
  const target = parseMorphusSkillOverrideTarget(override)
  if (target.kind === 'skill_id') return skill.id === target.skillId
  if (target.kind === 'category') {
    return skill.categories.some(
      (c) => c.toLowerCase() === target.category.toLowerCase(),
    )
  }
  return (skill.skillTraits ?? []).includes(target.traitId)
}

/**
 * Sum signed % modifiers from Morphus overrides that match this skill.
 * Honors `isNegated` by zeroing that override's contribution.
 */
export function sumMorphusSkillModifierPercent(
  skill: Pick<PalladiumSkillCatalogEntry, 'id' | 'categories' | 'skillTraits'>,
  overrides: readonly MorphusSkillOverride[] | undefined,
): number {
  if (!overrides?.length) return 0
  let total = 0
  for (const o of overrides) {
    if (!morphusOverrideAppliesToSkill(skill, o)) continue
    if (o.isNegated === true) continue
    if (typeof o.modifierPercent === 'number') {
      total += o.modifierPercent
    }
  }
  return total
}

/**
 * Resolve catalog skill by engine id (creation pick) or Palladium catalog id.
 */
export function resolveCatalogSkillForModifier(
  skillId: string,
): PalladiumSkillCatalogEntry | undefined {
  return getPalladiumSkillCatalogEntryById(skillId)
}

/** Validate morphus override trait ids against the registry (dev / CI). */
export function validateMorphusSkillOverrides(
  overrides: readonly MorphusSkillOverride[] | undefined,
): string[] {
  const errors: string[] = []
  if (!overrides) return errors
  for (const o of overrides) {
    if (o.targetType === 'skill_trait' && !isKnownSkillTraitId(o.targetValue)) {
      errors.push(`Unknown skill_trait "${o.targetValue}"`)
    }
  }
  return errors
}
