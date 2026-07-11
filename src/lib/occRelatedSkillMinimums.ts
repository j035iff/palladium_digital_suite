import { getPalladiumSkillCatalogEntryById } from '../data/library/skillsCatalogLoader'
import type { CreationSkillPick, PalladiumOcc } from '../types'
import { mapFilterCategoryToOccCategory } from './occCategoryRuleDisplay'
import { resolveEffectivePalladiumOcc } from './occComposition'

function pickMatchesCategory(skillId: string, categoryName: string): boolean {
  const occCategory = mapFilterCategoryToOccCategory(categoryName)
  const bookCategories = getPalladiumSkillCatalogEntryById(skillId)?.categories ?? []
  return bookCategories.some(
    (c) => c === categoryName || mapFilterCategoryToOccCategory(c) === occCategory,
  )
}

export function countRelatedPicksInCategory(
  picks: readonly CreationSkillPick[],
  categoryName: string,
): number {
  let count = 0
  for (const pick of picks) {
    if (pickMatchesCategory(pick.skillId, categoryName)) count += 1
  }
  return count
}

export function assessRelatedSkillCategoryMinimumBlockers(
  occ: PalladiumOcc | undefined,
  relatedPicks: readonly CreationSkillPick[],
  specializationId?: string | null,
): string[] {
  if (!occ) return []
  const effective = resolveEffectivePalladiumOcc(occ, specializationId)
  if (effective.occRelatedSkills.skillVouchers?.length) return []
  const minimums = effective.occRelatedSkills.categoryMinimums
  if (!minimums?.length) return []

  const blockers: string[] = []
  for (const rule of minimums) {
    const count = countRelatedPicksInCategory(relatedPicks, rule.categoryName)
    if (count >= rule.minimumCount) continue
    const remaining = rule.minimumCount - count
    const label =
      rule.label?.trim() ||
      `${rule.minimumCount} from ${rule.categoryName}`
    blockers.push(
      `Select ${remaining} more related skill${remaining === 1 ? '' : 's'} from ${label} (${count}/${rule.minimumCount}).`,
    )
  }
  return blockers
}
