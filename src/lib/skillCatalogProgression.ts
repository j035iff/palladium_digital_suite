/**
 * Catalog progression helpers shared by live Skills UI and audits.
 * Mirrors `scripts/skill-engine-contract.mjs` — keep in sync when that contract changes.
 */

export type SkillProgressionRow = {
  basePercent?: unknown
  subTasks?: readonly { basePercent?: unknown }[] | null
  subSkills?: readonly { basePercent?: unknown }[] | null
  synergies?: readonly unknown[] | null
  description?: string | null
  physicalSkillBonuses?: unknown
  naturalRollOutcomes?: readonly unknown[] | null
  mechanicProgressions?: readonly unknown[] | null
}

export function hasPercentileProgression(skill: SkillProgressionRow): boolean {
  const base = skill.basePercent
  if (typeof base === 'number') return true
  if (base && typeof base === 'object') {
    const o = base as Record<string, unknown>
    if (o.splitBase || o.splitBaseTracks) return true
    if (
      Object.keys(o).length > 0 &&
      !('splitBase' in o) &&
      !('splitBaseTracks' in o)
    ) {
      return true
    }
  }
  if (Array.isArray(skill.subTasks) && skill.subTasks.some((t) => t?.basePercent != null)) {
    return true
  }
  if (Array.isArray(skill.subSkills) && skill.subSkills.some((t) => t?.basePercent != null)) {
    return true
  }
  return false
}

/** Book skills with no self % but outward synergies (e.g. Hunting). */
export function isDocumentedSynergyOnlySkill(skill: SkillProgressionRow): boolean {
  if (hasPercentileProgression(skill)) return false
  if (!(skill.synergies && skill.synergies.length > 0)) return false
  return /no base percent/i.test(skill.description ?? '')
}

/**
 * Stats-only physical training: attribute / S.D.C. / combat flats (or related
 * Pass B training) with no self percentile and not synergy-only.
 */
export function hasPhysicalTrainingProgression(skill: SkillProgressionRow): boolean {
  if (hasPercentileProgression(skill) || isDocumentedSynergyOnlySkill(skill)) {
    return false
  }
  return (
    skill.physicalSkillBonuses != null ||
    (skill.naturalRollOutcomes?.length ?? 0) > 0 ||
    (skill.mechanicProgressions?.length ?? 0) > 0
  )
}
