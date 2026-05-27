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

/** Whether any active Morphus override marks this skill unusable in Morphus. */
export function isMorphusSkillImpossible(
  skill: Pick<PalladiumSkillCatalogEntry, 'id' | 'categories' | 'skillTraits'>,
  overrides: readonly MorphusSkillOverride[] | undefined,
): boolean {
  if (!overrides?.length) return false
  for (const o of overrides) {
    if (!morphusOverrideAppliesToSkill(skill, o)) continue
    if (o.impossibleInMorphus === true) return true
    if (o.isNegated === true && o.modifierPercent == null && o.grantUnlearnedValue == null) {
      return true
    }
  }
  return false
}

/**
 * Sum signed % modifiers from Morphus overrides that match this skill.
 * Honors `isNegated` by zeroing that override's contribution.
 * Skips overrides that mark the skill impossible in Morphus.
 */
export function sumMorphusSkillModifierPercent(
  skill: Pick<PalladiumSkillCatalogEntry, 'id' | 'categories' | 'skillTraits'>,
  overrides: readonly MorphusSkillOverride[] | undefined,
): number {
  if (!overrides?.length) return 0
  if (isMorphusSkillImpossible(skill, overrides)) return 0
  let total = 0
  for (const o of overrides) {
    if (!morphusOverrideAppliesToSkill(skill, o)) continue
    if (o.isNegated === true) continue
    if (o.impossibleInMorphus === true) continue
    if (typeof o.modifierPercent === 'number') {
      total += o.modifierPercent
    }
  }
  return total
}

/**
 * Grant-unlearned floor with per-level scaling (Dark Designs Gymnast's Build, etc.).
 * Returns null when no matching grant applies.
 */
export function morphusGrantFloorForSkill(
  skill: Pick<PalladiumSkillCatalogEntry, 'id' | 'categories' | 'skillTraits'>,
  overrides: readonly MorphusSkillOverride[] | undefined,
  characterLevel: number,
): number | null {
  if (!overrides?.length) return null
  const level = Math.max(1, Math.floor(characterLevel))
  let best: number | null = null
  for (const o of overrides) {
    if (!morphusOverrideAppliesToSkill(skill, o)) continue
    if (o.isNegated === true) continue
    if (o.grantUnlearnedValue == null) continue
    const inc = (o.perLevelIncrement ?? 0) * Math.max(0, level - 1)
    const floor = o.grantUnlearnedValue + inc
    best = best == null ? floor : Math.max(best, floor)
  }
  return best
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
