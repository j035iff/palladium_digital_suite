import type { PalladiumOcc } from '../types'
import { normalizeCatalogSkillId } from '../data/library/skillsCatalogLoader'
import { mapFilterCategoryToOccCategory } from './occCategoryRuleDisplay'
import { getSkillBookCategories } from './creationSkillCatalog'
import { resolveEffectivePalladiumOcc } from './occComposition'

function skillIdMatches(ruleSkillId: string, skillId: string): boolean {
  return (
    ruleSkillId === skillId ||
    normalizeCatalogSkillId(ruleSkillId) === normalizeCatalogSkillId(skillId)
  )
}

/** Related/secondary slot weight for a skill pick (O.C.C. category selectionSlotCost rules). */
export function occRelatedSkillSelectionSlotCost(
  occ: PalladiumOcc | undefined,
  skillId: string,
  specializationId?: string | null,
): number {
  if (!occ) return 1
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  const rules = effective.occRelatedSkills.categoryRules
  if (!rules.length) return 1

  const bookCategories = getSkillBookCategories(skillId)
  let best = 1

  for (const categoryName of bookCategories) {
    const occCategory = mapFilterCategoryToOccCategory(categoryName)
    const rule = rules.find((r) => r.categoryName === occCategory)
    if (!rule) continue

    const specific = rule.skillSpecificSelectionSlotCosts
    if (specific) {
      for (const [ruleSkillId, cost] of Object.entries(specific)) {
        if (skillIdMatches(ruleSkillId, skillId) && cost > best) {
          best = cost
        }
      }
    }

    const defaultCost = rule.selectionSlotCost ?? 1
    if (defaultCost > best) best = defaultCost
  }

  return best
}

export function occSecondarySkillSelectionSlotCost(
  occ: PalladiumOcc | undefined,
  skillId: string,
  specializationId?: string | null,
): number {
  return occRelatedSkillSelectionSlotCost(occ, skillId, specializationId)
}
