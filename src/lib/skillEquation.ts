/**
 * Master Skill Equation (skill_selection.md §3).
 * [Base% + (Per Level × (Eff. Level − 1))] + [O.C.C. Bonus] + [I.Q. Bonus] + [Synergy] + [Scaled Att.] + [Status]
 */

export type SkillEquationSkill = {
  basePercent: number
  perLevel: number
  /** Level at which the skill was taken (skill_selection.md §1). */
  acquisitionLevel: number
  occBonus: number
  synergyBonuses?: number
  scaledAttBonuses?: number
  statusModifiers?: number
}

/**
 * @param skill — numeric inputs for the equation (per-skill row).
 * @param characterLevel — current character level.
 * @param iqBonus — I.Q. exceptional skill % modifier (signed), already derived from attributes.
 */
export function calculateSkillPercent(
  skill: SkillEquationSkill,
  characterLevel: number,
  iqBonus: number,
): number {
  const effLevel = Math.max(
    1,
    characterLevel - skill.acquisitionLevel + 1,
  )
  const core =
    skill.basePercent + skill.perLevel * Math.max(0, effLevel - 1)
  return (
    core +
    skill.occBonus +
    iqBonus +
    (skill.synergyBonuses ?? 0) +
    (skill.scaledAttBonuses ?? 0) +
    (skill.statusModifiers ?? 0)
  )
}

/** M.A. / P.B. table fragments from skill_selection.md §3 (signed integers). */
export function maPbScaledBonuses(ma: number, pb: number): number {
  let n = 0
  if (ma > 20) n += ma - 20
  if (pb > 17) n += Math.floor((pb - 17) / 2)
  return n
}
