import type { SkillPrerequisite } from '../data/skillLibrary'

export function prerequisiteSatisfied(
  prereq: SkillPrerequisite | undefined,
  selectedIds: ReadonlySet<string>,
): boolean {
  if (!prereq) return true
  if (prereq.gate === 'and') {
    return prereq.skillIds.every((id) => selectedIds.has(id))
  }
  return prereq.skillIds.some((id) => selectedIds.has(id))
}

export function missingPrerequisiteMessage(
  prereq: SkillPrerequisite | undefined,
  selectedIds: ReadonlySet<string>,
): string | null {
  if (!prereq) return null
  if (prerequisiteSatisfied(prereq, selectedIds)) return null

  if (prereq.gate === 'and') {
    const missing = prereq.skillIds.filter((id) => !selectedIds.has(id))
    return `Missing prerequisite (AND): requires all of ${prereq.skillIds.join(', ')} — still need ${missing.join(', ')} (skill_selection.md §2).`
  }

  const missing = prereq.skillIds.filter((id) => !selectedIds.has(id))
  return `Missing prerequisite (OR): needs at least one of ${prereq.skillIds.join(', ')} — currently missing: ${missing.join(', ') || '(all)'} (skill_selection.md §2).`
}
