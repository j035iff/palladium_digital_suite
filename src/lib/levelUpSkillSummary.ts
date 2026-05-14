import type { Character } from '../types'
import { computeSkillRollTargetPercent } from './skillQuickRoll'

export type SkillImprovementRow = {
  id: string
  name: string
  before: number
  after: number
  delta: number
}

/**
 * Quick-roll skill targets before vs after a level bump (attribute_and_stat.md — I.Q. curve unchanged; level stair +5%).
 */
export function summarizeSkillImprovementsForLevel(
  character: Character,
  fromLevel: number,
  toLevel: number,
  opts?: { maxRows?: number; form?: 'facade' | 'morphus' },
): SkillImprovementRow[] {
  const maxRows = opts?.maxRows ?? 5
  const form = opts?.form ?? 'facade'
  const branch = character[form]
  const iq = branch.attributes.iq
  const rows: SkillImprovementRow[] = []

  for (const s of branch.skills) {
    if (s.restricted) continue
    if (s.basePercent == null) continue
    const before = computeSkillRollTargetPercent({
      skillBasePercent: s.basePercent,
      characterLevel: fromLevel,
      iq,
    }).target
    const after = computeSkillRollTargetPercent({
      skillBasePercent: s.basePercent,
      characterLevel: toLevel,
      iq,
    }).target
    const delta = after - before
    if (delta === 0) continue
    rows.push({ id: s.id, name: s.name, before, after, delta })
  }

  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  return rows.slice(0, maxRows)
}
