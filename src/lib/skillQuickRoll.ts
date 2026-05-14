/**
 * Quick d100 skill target (vision.md — speed over spectacle): base + level + I.Q. O.C.C. bonus.
 * I.Q. branch matches attribute_and_stat.md / characterDerived iqOccSkillPercent.
 */

export function iqOccSkillPercentPoints(iq: number): number {
  if (iq <= 15) return 0
  return Math.floor((iq - 14) / 2) * 5
}

/** Demo: +5% per level after 1st for O.C.C. skills (replace with full skill tables when wired). */
export function occSkillLevelBonusPercent(level: number): number {
  const lv = Math.max(1, Math.floor(level))
  return Math.max(0, lv - 1) * 5
}

const DEFAULT_SKILL_BASE = 28

export function computeSkillRollTargetPercent(opts: {
  skillBasePercent?: number
  characterLevel: number
  iq: number
}): { target: number; base: number; levelBonus: number; iqBonus: number } {
  const base = Math.max(
    0,
    Math.round(opts.skillBasePercent ?? DEFAULT_SKILL_BASE),
  )
  const levelBonus = occSkillLevelBonusPercent(opts.characterLevel)
  const iqBonus = iqOccSkillPercentPoints(opts.iq)
  const target = Math.min(98, Math.max(1, base + levelBonus + iqBonus))
  return { target, base, levelBonus, iqBonus }
}
