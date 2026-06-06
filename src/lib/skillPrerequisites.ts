import type { SkillPrerequisite } from '../data/skillLibrary'
import { prerequisiteSkillIdSatisfied } from '../data/library/skillsCatalogLoader'
import { resolveSkillDisplayName } from './skillDisplayNames'

export function prerequisiteSatisfied(
  prereq: SkillPrerequisite | undefined,
  selectedIds: ReadonlySet<string>,
): boolean {
  if (!prereq) return true
  if ('allOf' in prereq) {
    return prereq.allOf.every((p) => prerequisiteSatisfied(p, selectedIds))
  }
  if (prereq.gate === 'and') {
    return prereq.skillIds.every((id) =>
      prerequisiteSkillIdSatisfied(id, selectedIds),
    )
  }
  return prereq.skillIds.some((id) =>
    prerequisiteSkillIdSatisfied(id, selectedIds),
  )
}

export function missingPrerequisiteMessage(
  prereq: SkillPrerequisite | undefined,
  selectedIds: ReadonlySet<string>,
): string | null {
  if (!prereq) return null
  if (prerequisiteSatisfied(prereq, selectedIds)) return null

  if ('allOf' in prereq) {
    const parts = prereq.allOf
      .map((p) => missingPrerequisiteMessage(p, selectedIds))
      .filter((m): m is string => m != null)
    return parts.length ? parts.join(' ') : null
  }

  if (prereq.gate === 'and') {
    const missing = prereq.skillIds.filter(
      (id) => !prerequisiteSkillIdSatisfied(id, selectedIds),
    )
    const requiredNames = prereq.skillIds.map(resolveSkillDisplayName).join(', ')
    const missingNames = missing.map(resolveSkillDisplayName).join(', ')
    return `Missing prerequisite (AND): requires all of ${requiredNames} — still need ${missingNames} (skill_selection.md §2).`
  }

  const missing = prereq.skillIds.filter(
    (id) => !prerequisiteSkillIdSatisfied(id, selectedIds),
  )
  const optionNames = prereq.skillIds.map(resolveSkillDisplayName).join(', ')
  const missingNames = missing.map(resolveSkillDisplayName).join(', ')
  return `Missing prerequisite (OR): needs at least one of ${optionNames} — currently missing: ${missingNames || '(all)'} (skill_selection.md §2).`
}
